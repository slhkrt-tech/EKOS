const db = require('../config/db');

/**
 * EKOS - Müşteri Yönetimi Kontrolcüsü
 * Sahadan gelen müşteri verilerinin veritabanına işlenmesi ve listelenmesi süreçlerini yönetir.
 */
class CustomerController {
    
    // Yeni müşteri kaydı oluşturur (POST)
    async createCustomer(req, res) {
        try {
            // Yönlendirici (Router) tarafından ayrıştırılan veri gövdeden (body) alınır
            const { 
                tax_number, 
                company_name, 
                contact_person, 
                contact_phone, 
                contact_email, 
                current_infrastructure, 
                metro_internet_ready,
                latitude,
                longitude
            } = req.body;

            // Gerekli alanların doğrulaması (Validation) yapılır
            if (!tax_number || !company_name) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Vergi numarası ve Firma adı zorunludur." }));
            }

            // PostgreSQL'e veri ekleme sorgusu (SQL Injection'a karşı parametrik yapı kullanılır)
            const query = `
                INSERT INTO customers 
                (tax_number, company_name, contact_person, contact_phone, contact_email, current_infrastructure, metro_internet_ready, latitude, longitude) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                RETURNING id, company_name, created_at;
            `;
            
            const values = [
                tax_number, 
                company_name, 
                contact_person, 
                contact_phone, 
                contact_email, 
                current_infrastructure, 
                metro_internet_ready,
                latitude || null,
                longitude || null
            ];

            // Veritabanı köprüsü üzerinden sorgu çalıştırılır
            const result = await db.query(query, values);

            // Başarılı kayıt durumunda yeni müşterinin bilgileri JSON olarak döndürülür
            res.writeHead(201);
            res.end(JSON.stringify({
                status: "Success",
                message: "Yeni müşteri portföye başarıyla eklendi.",
                data: result.rows[0]
            }));

        } catch (error) {
            console.error('[EKOS ERROR] Müşteri Ekleme Hatası:', error);
            
            // Vergi numarası benzersiz (UNIQUE) olduğu için çakışma kontrolü yapılır
            if (error.code === '23505') {
                res.writeHead(409);
                return res.end(JSON.stringify({ error: "Bu vergi numarası ile kayıtlı bir müşteri zaten var." }));
            }

            res.writeHead(500);
            res.end(JSON.stringify({ error: "Sunucu hatası: Müşteri kaydedilemedi." }));
        }
    }

    // Sistemdeki tüm müşterileri listeler (GET)
    async getAllCustomers(req, res) {
        try {
            const query = `SELECT id, tax_number, company_name, contact_person, current_infrastructure, latitude, longitude FROM customers ORDER BY created_at DESC;`;
            const result = await db.query(query);

            res.writeHead(200);
            res.end(JSON.stringify({
                status: "Success",
                count: result.rowCount,
                data: result.rows
            }));
        } catch (error) {
            console.error('[EKOS ERROR] Müşteri Listeleme Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Sunucu hatası: Müşteriler getirilemedi." }));
        }
    }

    // Bir müşterinin GPS koordinatlarını günceller
    async updateCustomerCoordinates(req, res) {
        try {
            const { id } = req.query || {};
            const { latitude, longitude } = req.body;

            if (!id || latitude == null || longitude == null) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Müşteri ID, enlem ve boylam zorunludur." }));
            }

            const query = `
                UPDATE customers
                SET latitude = $1, longitude = $2
                WHERE id = $3
                RETURNING id, tax_number, company_name, contact_person, current_infrastructure, latitude, longitude, created_at;
            `;
            const values = [latitude, longitude, id];
            const result = await db.query(query, values);

            if (result.rowCount === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: "Müşteri bulunamadı." }));
            }

            res.writeHead(200);
            res.end(JSON.stringify({ status: 'Success', data: result.rows[0] }));
        } catch (error) {
            console.error('[EKOS ERROR] Müşteri Koordinat Güncelleme Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Sunucu hatası: Koordinatlar güncellenemedi." }));
        }
    }

    // Altyapı dağılımı istatistiklerini getir
    async getInfrastructureStats(req, res) {
        try {
            const query = `
                SELECT
                    current_infrastructure,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM customers), 2) as percentage
                FROM customers
                WHERE current_infrastructure IS NOT NULL AND current_infrastructure != ''
                GROUP BY current_infrastructure
                ORDER BY count DESC;
            `;
            const result = await db.query(query);

            res.writeHead(200);
            res.end(JSON.stringify({ status: 'Success', data: result.rows }));
        } catch (error) {
            console.error('[EKOS ERROR] Altyapı İstatistikleri Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Sunucu hatası: İstatistikler getirilemedi." }));
        }
    }
}

module.exports = new CustomerController();