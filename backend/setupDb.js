const pool = require('./config/db');

async function createSettingsTable() {
    try {
        const connection = await pool.getConnection();
        console.log('--- Database Setup Start ---');
        
        // Create settings table to store eBay tokens
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                setting_key VARCHAR(255) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Settings table created/verified');
        
        // Add category_id if missing from products
        try {
            await connection.execute('ALTER TABLE products ADD COLUMN category_id VARCHAR(100)');
            console.log('✅ Added category_id column');
        } catch (e) {}

        // Add video_url if missing
        try {
            await connection.execute('ALTER TABLE products ADD COLUMN video_url TEXT');
            console.log('✅ Added video_url column');
        } catch (e) {}

        connection.release();
        console.log('--- Database Setup Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database Setup Failed:', error.message);
        process.exit(1);
    }
}

createSettingsTable();
