const db = require('./db');

/**
 * EKOS - Veritabanı Başlatıcı Modülü
 * Sistemin ihtiyaç duyduğu tüm PostgreSQL tablolarını sıfırdan ve ilişkisel olarak oluşturur.
 */
async function initializeDatabase() {
    try {
        console.log('==================================================');
        console.log('[EKOS DB] Bulut veritabanı tabloları inşa ediliyor...');
        console.log('==================================================');

        // 1. Kullanıcılar (Danışman/Yönetici) Tablosu
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'danisman',
                assigned_region VARCHAR(50) DEFAULT 'Adana',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[EKOS DB] ✔️ "users" tablosu doğrulandı.');

        // 2. Araç Filosu Tablosu (Soft Delete destekli)
        await db.query(`
            CREATE TABLE IF NOT EXISTS vehicles (
                id SERIAL PRIMARY KEY,
                plate_number VARCHAR(20) UNIQUE NOT NULL,
                brand_model VARCHAR(50) NOT NULL,
                base_fuel_consumption DECIMAL(4,2) NOT NULL,
                ac_fuel_multiplier DECIMAL(3,2) DEFAULT 1.15,
                current_km INTEGER NOT NULL,
                assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                is_active BOOLEAN DEFAULT TRUE,
                deleted_at TIMESTAMP NULL
            );
        `);
        console.log('[EKOS DB] ✔️ "vehicles" tablosu doğrulandı.');

        // 🛠️ Indexler (performans / ölçeklenebilirlik)
        await db.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_user_id ON vehicles(assigned_user_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_customers_current_infrastructure ON customers(current_infrastructure);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_route_plans_vehicle_id ON route_plans(vehicle_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_route_plans_created_at ON route_plans(created_at);`);


        // 3. Müşteri Portföyü Tablosu
        await db.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                tax_number VARCHAR(11) UNIQUE NOT NULL,
                company_name VARCHAR(150) NOT NULL,
                contact_person VARCHAR(100),
                contact_phone VARCHAR(20),
                contact_email VARCHAR(100),
                current_infrastructure VARCHAR(50),
                metro_internet_ready BOOLEAN DEFAULT FALSE,
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[EKOS DB] ✔️ "customers" tablosu doğrulandı.');

        // 4. Canlı Müşteri Talepleri Geçmişi Tablosu
        await db.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id SERIAL PRIMARY KEY,
                company_name VARCHAR(150) NOT NULL,
                request_type VARCHAR(100) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[EKOS DB] ✔️ "requests" tablosu doğrulandı.');

        // 5. Rota Planı Geçmişi Tablosu
        await db.query(`
            CREATE TABLE IF NOT EXISTS route_plans (
                id SERIAL PRIMARY KEY,
                vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
                customer_ids INTEGER[] NOT NULL,
                route_data JSONB NOT NULL,
                total_distance DECIMAL(8,2) NOT NULL,
                estimated_fuel DECIMAL(8,2) NOT NULL,
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('[EKOS DB] ✔️ "route_plans" tablosu doğrulandı.');

        // Mülakat/Test ortamları için varsayılan araç kontrolü (Kayıt varsa tekrar eklemez)
        await db.query(`
            INSERT INTO vehicles (plate_number, brand_model, base_fuel_consumption, ac_fuel_multiplier, current_km)
            SELECT '06ABC123', 'Renault Kangoo', 7.50, 1.15, 42000
            WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = '06ABC123');
        `);
        console.log('[EKOS DB] ✔️ Varsayılan filo kayıtları kontrol edildi.');

        console.log('==================================================');
        console.log('[EKOS DB] 🚀 TÜM TABLOLAR CANLI SİSTEMDE HAZIR!');
        console.log('==================================================');
        process.exit(0);

    } catch (error) {
        console.error('==================================================');
        console.error('[EKOS DB ERROR] Geçiş (Migration) sırasında hata:', error);
        console.error('==================================================');
        process.exit(-1);
    }
}

initializeDatabase();