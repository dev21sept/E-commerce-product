const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('--- Env Verification ---');
console.log('DB_HOST:', process.env.DB_HOST ? 'Present' : 'MISSING');
console.log('DB_USER:', process.env.DB_USER ? 'Present' : 'MISSING');
console.log('DB_PASS:', process.env.DB_PASS ? 'Present' : 'MISSING');
console.log('DB_NAME:', process.env.DB_NAME ? 'Present' : 'MISSING');
console.log('DB_PORT:', process.env.DB_PORT);
console.log('PORT:', process.env.PORT);

const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false }
        });
        console.log('SUCCESS: Connected to Aiven!');
        await connection.end();
    } catch (err) {
        console.error('FAILED to connect:', err.message);
    }
}

testConnection();
