const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    // Canlı ortamda Supabase bağlantı dizesini (DATABASE_URL) doğrudan yakala
    connectionString: process.env.DATABASE_URL,
    
    // Eğer DATABASE_URL tanımlı değilse (.env lokaldeyse) eski parametreleri koru
    ...(process.env.DATABASE_URL ? {} : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    }),
    
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    
    // 🛡️ CANLI ORTAM GÜVENLİK KALKANI: 
    // Supabase uzak bağlantılarda SSL zorunlu tutar. Lokal ortamda ise kapatır.
    ssl: isProduction ? { rejectUnauthorized: false } : false
});

pool.on('error', (err, client) => {
    console.error('[EKOS DB] Kritik Veritabanı Hatası:', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};