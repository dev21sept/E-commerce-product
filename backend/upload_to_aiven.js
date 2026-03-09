const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function uploadSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 23155,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: {
            rejectUnauthorized: false
        },
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, '..', 'recreate_schema.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log('--- Connected to Aiven MySQL ---');
        console.log('Uploading schema...');

        await connection.query(sqlContent);

        console.log('SUCCESS: Schema uploaded to Aiven MySQL!');
    } catch (error) {
        console.error('ERROR uploading schema:', error);
    } finally {
        await connection.end();
    }
}

uploadSchema();
