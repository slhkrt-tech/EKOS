const db = require('../config/db');

/**
 * EKOS - Hibrit Rota ve Yakıt Optimizasyon Algoritması
 * Hızlı sıralama için Kuş Uçuşu (Haversine),
 * Gerçek asfalt mesafesi için Açık Kaynak OSRM (OpenStreetMap Routing Machine) kullanır.
 */
class RouteOptimizer {
    
    // YÖNTEM 1: Kuş uçuşu (Sadece karar mekanizmasını hızlandırmak için kullanılır)
    calculateAirDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Dünya'nın yarıçapı (Kilometre)
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    }

    // YÖNTEM 2: Gerçek Karayolu Mesafesi (Açık Kaynak OSRM API'si - Ücretsiz)
    async getRealDrivingDistance(lat1, lon1, lat2, lon2) {
        try {
            // OSRM formatı Boylam,Enlem şeklindedir
            const url = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code === 'Ok' && data.routes.length > 0) {
                // OSRM mesafeyi Metre cinsinden verir, KM'ye çeviriyoruz
                return data.routes[0].distance / 1000;
            }
        } catch (error) {
            console.warn('[EKOS OSRM WARNING] OSRM sunucusuna ulaşılamadı. Yedek formüle geçiliyor...');
        }
        
        // Eğer OSRM sunucusu geçici olarak çökerse (veya internet yoksa) sistem patlamasın diye 
        // Kuş uçuşuna %30 otoban sapma payı ekleyerek güvenli bir sonuç döner (Fallback).
        return this.calculateAirDistance(lat1, lon1, lat2, lon2) * 1.30;
    }

    // Gerçekçi Trafik Simülatörü: Saat dilimine göre mesafeye sapma payı ekler
    calculateTrafficWeight() {
        const currentHour = new Date().getHours();
        
        // Sabah (07:00 - 09:00) ve Akşam (17:00 - 19:00) mesai trafiği
        if ((currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19)) {
            return 1.4; // %40 trafik tüketim payı
        } 
        // Öğle arası (12:00 - 14:00)
        else if (currentHour >= 12 && currentHour <= 14) {
            return 1.2; // %20 tüketim payı
        } 
        // Normal akıcı saatler
        else {
            return 1.05; // %5 dur-kalk payı
        }
    }

    // Seçilen müşteriler ve araç bilgilerine göre optimum günlük rota oluşturulur
    async generateDailyRoute(req, res) {
        try {
            const { customerIds, vehicleId, isWeatherHot, city } = req.body;

            if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0 || !vehicleId) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Müşteri listesi ve Araç ID zorunludur." }));
            }

            // 1. Araç bilgileri çekilir
            const vehicleResult = await db.query(`SELECT * FROM vehicles WHERE id = $1`, [vehicleId]);
            if (vehicleResult.rowCount === 0) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: "Sistemde böyle bir araç bulunamadı." }));
            }
            const vehicle = vehicleResult.rows[0];

            // 2. Müşteri lokasyonları çekilir
            const placeholders = customerIds.map((_, i) => `$${i + 1}`).join(',');
            const customerResult = await db.query(
                `SELECT id, company_name, latitude, longitude, contact_person FROM customers WHERE id IN (${placeholders})`,
                customerIds
            );
            const customers = customerResult.rows;

            if (customers.some((c) => c.latitude == null || c.longitude == null)) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Seçilen müşterilerin tümü için koordinat bilgisi gereklidir.' }));
            }

            // 3. HİBRİT ALGORİTMA BAŞLIYOR
            let optimizedRoute = [];
            let totalRealDistance = 0; 
            
            // Başlangıç noktası (Depo/Ofis)
            const { getCityCenter } = require('../utils/turkeyCityCenters');
            const center = getCityCenter(city || 'Adana');
            const depot = {
                latitude: center.lat,
                longitude: center.lng,
                label: city ? `${city} Şehir Merkezi` : 'Adana Şehir Merkezi'
            };
            
            let currentLocation = depot;
            let unvisited = [...customers];
            
            // Anlık trafik ağırlığı hesaplanır
            const trafficWeight = this.calculateTrafficWeight();

            while (unvisited.length > 0) {
                let nearest = null;
                let minAirDistance = Infinity;
                let nearestIndex = -1;

                // ADIM A: Hızlı Karar (Hangi noktaya gidileceğini kuş uçuşu ile bul)
                for (let i = 0; i < unvisited.length; i++) {
                    const candidate = unvisited[i];
                    
                    const airDist = this.calculateAirDistance(
                        currentLocation.latitude || depot.latitude,
                        currentLocation.longitude || depot.longitude,
                        candidate.latitude,
                        candidate.longitude
                    );

                    if (airDist < minAirDistance) {
                        minAirDistance = airDist;
                        nearest = candidate;
                        nearestIndex = i;
                    }
                }

                // ADIM B: Gerçek Karayolu Asfalt Mesafesi (Seçilen rotayı OSRM'e sor)
                const realDistKm = await this.getRealDrivingDistance(
                    currentLocation.latitude || depot.latitude,
                    currentLocation.longitude || depot.longitude,
                    nearest.latitude,
                    nearest.longitude
                );

                // Trafik ağırlığını gerçek yol mesafesine uygula
                const finalWeightedDistance = realDistKm * trafficWeight;

                optimizedRoute.push({
                    step: optimizedRoute.length + 1,
                    customer: nearest,
                    distanceFromPrevious: finalWeightedDistance.toFixed(2),
                });

                totalRealDistance += finalWeightedDistance;
                currentLocation = nearest;
                unvisited.splice(nearestIndex, 1);
            }

            // 4. Yakıt Tüketimi Hesaplanır (Klima ve Gerçek Yol dahil)
            const activeMultiplier = isWeatherHot ? parseFloat(vehicle.ac_fuel_multiplier) : 1.0;
            const estimatedFuel = (totalRealDistance / 100) * parseFloat(vehicle.base_fuel_consumption) * activeMultiplier;

            res.writeHead(200);
            res.end(JSON.stringify({
                status: "Success",
                data: {
                    message: "Yapay Zeka Destekli Gerçek Karayolu Rotası Hesaplandı",
                    vehicle_assigned: vehicle.brand_model,
                    climate_control_active: isWeatherHot,
                    traffic_weight_applied: trafficWeight,
                    total_distance_unit: totalRealDistance.toFixed(2),
                    estimated_fuel_liters: estimatedFuel.toFixed(2),
                    path: optimizedRoute
                }
            }));

        } catch (error) {
            console.error('[EKOS ERROR] Optimizasyon Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Sunucu hatası: Rota hesaplanamadı." }));
        }
    }
}

module.exports = new RouteOptimizer();