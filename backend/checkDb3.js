const pool = require('./config/db');

async function check() {
    try {
        const [rows] = await pool.execute('SELECT id, title, description FROM products ORDER BY id DESC LIMIT 5');
        rows.forEach(r => {
            console.log(`ID: ${r.id} | Title: ${r.title}`);
            console.log(`Desc preview: ${r.description ? r.description.substring(0, 100) : 'null'}\n---`);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
