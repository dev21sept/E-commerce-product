const pool = require('./config/db');

async function fix() {
    try {
        const query = 'UPDATE products SET description = ? WHERE description LIKE ? OR description LIKE ?';
        const msg = 'Please click "Import from eBay" again to fetch the updated, clean text version of this description.';
        const [result] = await pool.execute(query, [msg, '%<svg%', '%<div%']);
        console.log(`Updated ${result.affectedRows} products containing raw HTML.`);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
fix();
