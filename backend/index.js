const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const pool = require('./config/db');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Auto-setup database tables and columns
async function setupDatabase() {
    try {
        const connection = await pool.getConnection();
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                setting_key VARCHAR(255) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // Ensure columns exist (ignore errors if they already exist)
        const columns = [
            'ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id VARCHAR(100)',
            'ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT'
        ];
        
        for (const sql of columns) {
            try { await connection.execute(sql); } catch (e) {}
        }
        
        connection.release();
        console.log('✅ Database tables and columns verified');
    } catch (error) {
        console.error('❌ Database setup failed during startup:', error.message);
    }
}
setupDatabase();

const productRoutes = require('./routes/productRoutes');
const ebayRoutes = require('./routes/ebayRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api', productRoutes);
app.use('/api/ebay', ebayRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
