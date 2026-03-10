const fs = require('fs');
const pool = require('./config/db');

async function check() {
    try {
        const [rows] = await pool.execute('SELECT id, title, ebay_url, description FROM products ORDER BY id DESC LIMIT 5');
        const data = rows.map(r => `ID: ${r.id}\nURL: ${r.ebay_url}\nDesc: ${r.description ? r.description.substring(0, 500) : 'none'}\n---\n`).join('');
        fs.writeFileSync('db_out.txt', data);
    } catch (e) {
        fs.writeFileSync('db_out.txt', e.message);
    }
    process.exit(0);
}
check();
