const db = require('../config/db');

class RoutePlanController {
    async saveRoutePlan(req, res) {
        try {
            const { vehicleId, customerIds, routeData, totalDistance, estimatedFuel, note } = req.body;

            if (!vehicleId || !Array.isArray(customerIds) || !routeData || !totalDistance || !estimatedFuel) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Araç, müşteri listesi, rota verisi, mesafe ve yakıt bilgisi zorunludur.' }));
            }

            const query = `
                INSERT INTO route_plans
                    (vehicle_id, customer_ids, route_data, total_distance, estimated_fuel, note)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, vehicle_id, customer_ids, route_data, total_distance, estimated_fuel, note, created_at;
            `;
            const values = [vehicleId, customerIds, routeData, totalDistance, estimatedFuel, note || null];
            const result = await db.query(query, values);

            res.writeHead(201);
            res.end(JSON.stringify({ status: 'Success', data: result.rows[0] }));
        } catch (error) {
            console.error('[EKOS ERROR] Rota Kaydetme Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Sunucu hatası: Rota kaydedilemedi.' }));
        }
    }

    async getSummary() {
        const query = `
            SELECT
                COUNT(*) AS total_routes,
                COALESCE(SUM(total_distance), 0) AS total_distance,
                COALESCE(ROUND(AVG(estimated_fuel)::numeric, 2), 0) AS average_fuel
            FROM route_plans;
        `;
        const result = await db.query(query);
        return result.rows[0] || { total_routes: 0, total_distance: 0, average_fuel: 0 };
    }

    async getRouteAnalytics(req, res) {
        try {
            const query = `
                SELECT
                    DATE(created_at) as date,
                    COUNT(*) as routes_count,
                    ROUND(AVG(total_distance)::numeric, 2) as avg_distance,
                    ROUND(SUM(total_distance)::numeric, 2) as total_distance,
                    ROUND(AVG(estimated_fuel)::numeric, 2) as avg_fuel,
                    ROUND(SUM(estimated_fuel)::numeric, 2) as total_fuel
                FROM route_plans
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 30;
            `;
            const result = await db.query(query);

            res.writeHead(200);
            res.end(JSON.stringify({ status: 'Success', data: result.rows }));
        } catch (error) {
            console.error('[EKOS ERROR] Rota Analitikleri Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Sunucu hatası: Analitikler getirilemedi." }));
        }
    }
}

module.exports = new RoutePlanController();
