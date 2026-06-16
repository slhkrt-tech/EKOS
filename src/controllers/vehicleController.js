const Model = require('../core/Model');

// vehicles tablosu için ORM örneği oluşturuyoruz
const VehicleModel = new Model('vehicles');

/**
 * EKOS - Araç Filosu Kontrolcüsü
 * Saf SQL yazmak yerine kendi yazdığımız Model (Mini ORM) katmanını kullanır.
 * Veritabanı motorundan (PostgreSQL, MySQL vb.) bağımsız çalışır.
 */
class VehicleController {
    
    /**
     * Sistemdeki tüm araçları listeler (GET)
     */
    async getAllVehicles(req, res) {
        try {
            // SQL sorgusu yok, agnostik findAll() metodu var
            const vehicles = await VehicleModel.findAll({ is_active: true });


            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'Success',
                count: vehicles.length,
                data: vehicles
            }));
        } catch (error) {
            console.error('[EKOS ERROR] Araç Listeleme Hatası:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Sunucu hatası: Araçlar getirilemedi.' }));
        }
    }

    /**
     * Filoya yeni bir araç ekler (POST)
     */
    async createVehicle(req, res) {
        try {
            const { plate_number, brand_model, base_fuel_consumption, ac_fuel_multiplier, current_km } = req.body;

            if (!plate_number || !brand_model) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Plaka ve Marka/Model zorunludur.' }));
            }

            // Gelen veriyi güvenli objeye çevir (Veritabanı tablosundaki sütun adlarıyla eşleşmeli)
            const vehicleData = {
                plate_number: plate_number.trim().toUpperCase(),
                brand_model: brand_model.trim(),
                base_fuel_consumption: base_fuel_consumption ? parseFloat(base_fuel_consumption) : 7.00,
                ac_fuel_multiplier: ac_fuel_multiplier ? parseFloat(ac_fuel_multiplier) : 1.15,
                current_km: current_km ? parseInt(current_km, 10) : 0
            };

            // SQL sorgusu yok, agnostik create() metodu var
            const newVehicle = await VehicleModel.create(vehicleData);

            res.writeHead(201);
            res.end(JSON.stringify({ 
                status: 'Success', 
                message: 'Yeni araç başarıyla filoya eklendi.',
                data: newVehicle 
            }));

        } catch (error) {
            console.error('[EKOS ERROR] Araç Ekleme Hatası:', error);
            
            // Veritabanı çekirdeğinden fırlatılan benzersizlik hatası yakalanıyor
            if (error.code === '23505') {
                res.writeHead(409);
                return res.end(JSON.stringify({ error: 'Bu plaka ile kayıtlı bir araç zaten sistemde mevcut.' }));
            }
            
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Sunucu hatası: Araç filoya eklenemedi.' }));
        }
    }

    /**
     * Sistemdeki mevcut bir aracın bilgilerini günceller (PUT)
     */
    async updateVehicle(req, res) {
        try {
            const { id } = req.query || {};
            const { plate_number, brand_model, base_fuel_consumption, ac_fuel_multiplier, current_km } = req.body;

            if (!id) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Güncellenecek aracın ID bilgisi zorunludur.' }));
            }

            if (!plate_number || !brand_model) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Plaka ve Marka/Model zorunludur.' }));
            }

            // Gelen veriyi güvenli objeye çevir
            const vehicleData = {
                plate_number: plate_number.trim().toUpperCase(),
                brand_model: brand_model.trim(),
                base_fuel_consumption: base_fuel_consumption ? parseFloat(base_fuel_consumption) : 7.00,
                ac_fuel_multiplier: ac_fuel_multiplier ? parseFloat(ac_fuel_multiplier) : 1.15,
                current_km: current_km ? parseInt(current_km, 10) : 0
            };

            // SQL sorgusu yok, agnostik update() metodu var
            const updatedVehicle = await VehicleModel.update(id, vehicleData);

            if (!updatedVehicle) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: 'Güncellenmek istenen araç sistemde bulunamadı.' }));
            }

            res.writeHead(200);
            res.end(JSON.stringify({ 
                status: 'Success', 
                message: 'Araç bilgileri başarıyla güncellendi.',
                data: updatedVehicle 
            }));

        } catch (error) {
            console.error('[EKOS ERROR] Araç Güncelleme Hatası:', error);
            
            // Veritabanı plaka çakışması hatası
            if (error.code === '23505') {
                res.writeHead(409);
                return res.end(JSON.stringify({ error: 'Bu plaka ile kayıtlı bir araç zaten sistemde mevcut.' }));
            }
            
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Sunucu hatası: Araç güncellenemedi.' }));
        }
    }

    /**
     * Sistemden belirtilen aracı siler (DELETE)
     */
    async deleteVehicle(req, res) {
        try {
            const { id } = req.query || {}; 

            if (!id) {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: "Silinecek aracın ID bilgisi zorunludur." }));
            }

            // SQL sorgusu yok, agnostik softDelete() metodu var
            const isDeleted = await VehicleModel.softDelete(id);


            if (!isDeleted) {
                res.writeHead(404);
                return res.end(JSON.stringify({ error: "Silinmek istenen araç sistemde bulunamadı." }));
            }

            res.writeHead(200);
            res.end(JSON.stringify({ 
                status: 'Success', 
                message: 'Araç başarıyla filodan çıkarıldı.' 
            }));

        } catch (error) {
            console.error('[EKOS ERROR] Araç Silme Hatası:', error);
            
            // Yabancı anahtar (Foreign Key) ihlali yakalanıyor
            if (error.code === '23503') {
                res.writeHead(400);
                return res.end(JSON.stringify({ error: 'Bu araç geçmiş bir rota planına bağlı olduğu için filodan silinemez.' }));
            }

            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Sunucu hatası: Araç silinemedi.' }));
        }
    }
}

module.exports = new VehicleController();