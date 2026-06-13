const db = require('../config/db');

/**
 * EKOS - Müşteri Talep Kontrolcüsü
 * Canlı gelen müşteri taleplerini kaydeder ve geçmişini listeler.
 */
class RequestController {
    async createRequest({ company_name, request_type, details }) {
        const query = `
            INSERT INTO requests (company_name, request_type, details)
            VALUES ($1, $2, $3)
            RETURNING id, company_name, request_type, details, created_at;
        `;
        const values = [company_name, request_type, details || ''];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getSummary() {
        const countQuery = `
            SELECT
                COUNT(*) AS total_requests,
                SUM(CASE WHEN request_type = 'Arıza Kaydı' THEN 1 ELSE 0 END) AS fault_reports,
                SUM(CASE WHEN request_type = 'Hız Artışı Talebi' THEN 1 ELSE 0 END) AS speed_requests,
                SUM(CASE WHEN request_type = 'Teknik Destek' THEN 1 ELSE 0 END) AS support_requests
            FROM requests;
        `;
        const result = await db.query(countQuery);
        return result.rows[0] || {
            total_requests: 0,
            fault_reports: 0,
            speed_requests: 0,
            support_requests: 0
        };
    }

    async saveRequest(req, res) {
        try {
            const { company_name, request_type, details } = req.body || {};
            if (!company_name || !request_type) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Firma adı ve talep türü gerekiyor.' }));
            }

            const savedRequest = await this.createRequest({ company_name, request_type, details });
            const summary = await this.getSummary();

            res.writeHead(201);
            res.end(JSON.stringify({ status: 'Success', data: savedRequest, summary }));
        } catch (error) {
            console.error('[EKOS ERROR] Talep Kaydetme Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Sunucu hatası: Talep kaydedilemedi.' }));
        }
    }

    async getAllRequests(req, res) {
        try {
            const limit = parseInt(req.query?.limit, 10);
            let query = `SELECT id, company_name, request_type, details, created_at FROM requests ORDER BY created_at DESC`;
            const values = [];

            if (Number.isInteger(limit) && limit > 0) {
                query += ` LIMIT $1`;
                values.push(limit);
            }

            const result = await db.query(query, values);
            const summary = await this.getSummary();

            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'Success',
                count: result.rowCount,
                data: result.rows,
                summary
            }));
        } catch (error) {
            console.error('[EKOS ERROR] Talep Geçmişi Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Sunucu hatası: Talepler getirilemedi.' }));
        }
    }
}

module.exports = new RequestController();
