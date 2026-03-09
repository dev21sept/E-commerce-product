const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function checkTables() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false }
        });

        console.log('--- Checking Tables in Aiven ---');
        const [rows] = await connection.query('SHOW TABLES');
        console.log('Tables found:', rows.map(r => Object.values(r)[0]));

        await connection.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkTables();
