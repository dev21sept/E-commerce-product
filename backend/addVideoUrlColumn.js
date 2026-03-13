const pool = require('./config/db');

(async () => {
    try {
        console.log("Adding video_url column to products table...");
        await pool.execute('ALTER TABLE products ADD COLUMN video_url VARCHAR(255) DEFAULT NULL;');
        console.log("Column added successfully!");
    } catch (error) {
        if(error.code === 'ER_DUP_FIELDNAME') {
            console.log("Column already exists.");
        } else {
            console.error("Error modifying table:", error);
        }
    } finally {
        process.exit();
    }
})();
