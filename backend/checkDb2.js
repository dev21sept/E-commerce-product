const pool = require('./config/db');

async function check() {
    const [rows] = await pool.execute('SELECT id, title, description FROM products ORDER BY id DESC LIMIT 5');
    for (const r of rows) {
        console.log(`ID: ${r.id} | Title: ${r.title.substring(0, 30)}`);
        console.log(`Desc: ${r.description ? r.description.substring(0, 150) : 'none'}`);
        console.log('---');
    }
    process.exit(0);
}
check();
