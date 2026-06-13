const db = require('../config/db');

class SettingsController {
  // İstek body: { city }
  // Token doğrulaması bu repo’da net bir middleware olarak görülmediği için,
  // basit bir uygulama olarak users.tablosunda en son kullanılan kullanıcıya yazılmasını değil,
  // sistemin mevcut token payload'ında bulunan user id ile yazmayı hedefliyoruz.
  async updateUserCity(req, res) {
    try {
      const { city } = req.body || {};
      if (!city) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'city zorunludur.' }));
      }

      // CustomRouter/auth middleware olmadığı için token bu controller'a direkt gelmiyor olabilir.
      // Yine de Authorization header'ından Bearer token okunup decode edilmek istenir.
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

      if (!token) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Token bulunamadı.' }));
      }

      // token payload decode
      const jwt = require('jsonwebtoken');
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Token geçersiz.' }));
      }

      const userId = payload?.id;
      if (!userId) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'Token payload içinde kullanıcı id yok.' }));
      }

      const query = `
        UPDATE users
        SET assigned_region = $1
        WHERE id = $2
        RETURNING id, assigned_region;
      `;
      const result = await db.query(query, [city, userId]);

      if (result.rowCount === 0) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: 'Kullanıcı bulunamadı.' }));
      }

      res.writeHead(200);
      return res.end(JSON.stringify({ status: 'Success', data: result.rows[0] }));
    } catch (error) {
      console.error('[EKOS ERROR] updateUserCity hatası:', error);
      res.writeHead(500);
      return res.end(JSON.stringify({ error: 'Sunucu hatası: Şehir güncellenemedi.' }));
    }
  }
}

module.exports = new SettingsController();

