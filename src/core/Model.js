const db = require('../config/db');

/**
 * EKOS - Mini ORM (Object-Relational Mapping) Çekirdeği
 * Veritabanı motorundan bağımsız (Agnostik) bir veri erişim katmanı sağlar.
 * İleride PostgreSQL yerine başka bir DB kullanılmak istendiğinde sadece bu dosya değişecektir.
 */
class Model {
    constructor(tableName) {
        this.tableName = tableName;
    }

    // Tablodaki tüm verileri getir (Opsiyonel filtrelerle)
    async findAll(conditions = {}) {
        let query = `SELECT * FROM ${this.tableName}`;
        let values = [];
        let keys = Object.keys(conditions);

        if (keys.length > 0) {
            query += ` WHERE ` + keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
            values = keys.map(k => conditions[k]);
        }
        
        query += ` ORDER BY id DESC;`;

        const result = await db.query(query, values);
        return result.rows;
    }

    // Benzersiz ID'ye göre tek bir kayıt getir
    async findById(id) {
        const query = `SELECT * FROM ${this.tableName} WHERE id = $1;`;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // Tabloya yeni kayıt ekle (Dinamik)
    async create(data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        
        // $1, $2, $3 gibi parametreleri dinamik oluştur
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *;`;
        const result = await db.query(query, values);
        
        return result.rows[0];
    }

    // ID'ye göre kaydı dinamik olarak güncelle
    async update(id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        
        // SET kısımlarını dinamik oluştur (Örn: plate_number = $1, brand_model = $2)
        const setString = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
        
        // ID parametresini values dizisinin sonuna ekle
        values.push(id);
        const idIndex = values.length; // (Örn: $6)
        
        const query = `UPDATE ${this.tableName} SET ${setString} WHERE id = $${idIndex} RETURNING *;`;
        
        const result = await db.query(query, values);
        return result.rows[0]; // Güncellenen kaydı döndür
    }

    // ID'ye göre kayıt sil (Hard Delete)
    async delete(id) {
        const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id;`;
        const result = await db.query(query, [id]);
        return result.rowCount > 0;
    }

    // 🛡️ Soft Delete (ör. is_active=false)
    async softDelete(id, options = {}) {
        const {
            isActiveField = 'is_active',
            deletedAtField = 'deleted_at',
            deletedAtValue = null
        } = options;

        // isActiveField/column yoksa (eski şema) soft delete başarısız olabilir.
        // Bu metot yalnızca ilgili tabloda soft-delete alanları tanımlandıktan sonra kullanılmalıdır.
        const query = `
            UPDATE ${this.tableName}
            SET ${isActiveField} = false,
                ${deletedAtField} = COALESCE($2, CURRENT_TIMESTAMP)
            WHERE id = $1
              AND ${isActiveField} IS DISTINCT FROM false
            RETURNING id;
        `;

        const result = await db.query(query, [id, deletedAtValue]);
        return result.rowCount > 0;
    }
}

module.exports = Model;