const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

/**
 * EKOS - Kimlik Doğrulama ve Güvenlik Kontrolcüsü
 * Kullanıcı kaydı (Register), sisteme giriş (Login) ve Token üretim süreçlerini yönetir.
 */
// 🛡️ Login Rate Limiter (Bellek içi)
// Not: Çoklu instance kullanıyorsan Redis tabanlı limiter gerekir.
const loginAttempts = new Map();

function cleanupOldAttempts(now, windowMs) {
    for (const [key, entry] of loginAttempts.entries()) {
        if (now - entry.firstAttemptAt > windowMs) loginAttempts.delete(key);
    }
}

class AuthController {
    
    // Yeni Danışman/Yönetici Kaydı (Register)
    async registerUser(req, res) {
        try {
            const { full_name, email, password, role, assigned_region } = req.body;

            // Eksik veri kontrolü
            if (!full_name || !email || !password) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Ad, Email ve Şifre alanları zorunludur." }));
            }

            // Şifre güvenliği: Gelen açık şifre 'hash'lenir (Kriptolanır)
            // Salt (tuzlama) değeri 10 olarak belirlenir (Performans/Güvenlik dengesi için idealdir)
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Veritabanına kayıt sorgusu
            const query = `
                INSERT INTO users (full_name, email, password_hash, role, assigned_region) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING id, full_name, email, role, assigned_region;
            `;
            
            const values = [full_name, email, hashedPassword, role || 'danisman', assigned_region || 'Adana'];

            const result = await db.query(query, values);

            res.writeHead(201);
            res.end(JSON.stringify({
                status: "Success",
                message: "Kullanıcı kaydı başarıyla oluşturuldu.",
                user: result.rows[0]
            }));

        } catch (error) {
            console.error('[EKOS ERROR] Kayıt Hatası:', error);
            if (error.code === '23505') { // Benzersiz email ihlali (UNIQUE constraint)
                res.writeHead(409);
                return res.end(JSON.stringify({ error: "Bu email adresi zaten sistemde kayıtlı." }));
            }
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Sunucu hatası: Kullanıcı oluşturulamadı." }));
        }
    }

    // Sisteme Giriş ve Dijital Yaka Kartı (Token) Üretimi (Login)
    async loginUser(req, res) {
        try {
            const { email, password } = req.body;

            // 🛡️ Rate limit (Brute-force engelleme)
            const remoteIp = (req.socket && req.socket.remoteAddress) ? req.socket.remoteAddress : (req.headers['x-forwarded-for'] || 'unknown');
            const rateWindowMs = Number(process.env.LOGIN_RATE_WINDOW_MS || (10 * 60 * 1000)); // 10 dk
            const maxAttempts = Number(process.env.LOGIN_RATE_MAX_ATTEMPTS || 10); // 10 deneme / pencere
            const limiterKey = `${remoteIp}:${String(email).toLowerCase()}`;

            const now = Date.now();
            const entry = loginAttempts.get(limiterKey);
            if (!entry) {
                loginAttempts.set(limiterKey, { count: 1, firstAttemptAt: now });
            } else {
                // pencere dışına çıktıysa sıfırla
                if (now - entry.firstAttemptAt > rateWindowMs) {
                    entry.count = 1;
                    entry.firstAttemptAt = now;
                } else {
                    entry.count += 1;
                }
            }
            cleanupOldAttempts(now, rateWindowMs);

            const currentEntry = loginAttempts.get(limiterKey);
            if (currentEntry && currentEntry.count > maxAttempts) {
                res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '600' });
                return res.end(JSON.stringify({ error: 'Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.' }));
            }

            // 1. Aşama: Veritabanında kullanıcı aranır
            const query = `SELECT * FROM users WHERE email = $1`;
            const result = await db.query(query, [email]);


            if (result.rowCount === 0) {
                res.writeHead(401);
                return res.end(JSON.stringify({ error: "Hatalı email veya şifre." }));
            }

            const user = result.rows[0];

            // 2. Aşama: Şifre doğrulaması (Açık şifre ile veritabanındaki Hash karşılaştırılır)
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                res.writeHead(401);
                return res.end(JSON.stringify({ error: "Hatalı email veya şifre." }));
            }

            // 3. Aşama: JWT (JSON Web Token) Üretimi
            // JWT_SECRET anahtarı ile şifrelenir ve 12 saat (12h) geçerlilik süresi atanır
            const tokenPayload = {
                id: user.id,
                role: user.role,
                region: user.assigned_region
            };

            const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '12h' });

            res.writeHead(200);
            res.end(JSON.stringify({
                status: "Success",
                message: "Giriş başarılı.",
                token: token, // Mobil uygulama bu token'ı hafızasına kaydedecek
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    role: user.role,
                    region: user.assigned_region
                }
            }));

        } catch (error) {
            console.error('[EKOS ERROR] Giriş Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Sunucu hatası: Giriş yapılamadı." }));
        }
    }
}

module.exports = new AuthController();