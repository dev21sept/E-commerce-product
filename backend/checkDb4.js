const pool = require('./config/db');

async function check() {
    try {
        const [rows] = await pool.execute('SELECT id, title, ebay_url, description FROM products ORDER BY id DESC LIMIT 5');
        rows.forEach(r => {
            console.log(`ID: ${r.id} | Title: ${r.title}\nURL: ${r.ebay_url}`);
            console.log(`Desc preview: ${r.description ? r.description.substring(0, 500) : 'null'}\n---`);
        });
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
