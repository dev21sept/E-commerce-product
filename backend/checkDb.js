require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: true }
    });

    const [rows] = await conn.execute('SELECT id, title, description FROM products ORDER BY id DESC LIMIT 5');
    for (const r of rows) {
        console.log(`ID: ${r.id} | Title: ${r.title.substring(0, 30)}`);
        console.log(`Desc: ${r.description ? r.description.substring(0, 150) : 'none'}`);
        console.log('---');
    }

    conn.end();
}
check();
