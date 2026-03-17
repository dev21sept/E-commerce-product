const pool = require('./config/db');
const fs = require('fs');

async function findProduct() {
    try {
        const [rows] = await pool.query(
            "SELECT title, item_specifics FROM products WHERE title LIKE ?", 
            ["%Mens Under Armour UA Rival Fleece Sweatshirt Jacket Zip Hoody Hoodie NF New%"]
        );
        
        if (rows.length === 0) {
            fs.writeFileSync('product_details.json', JSON.stringify({error: "Product not found"}, null, 2));
            return;
        }

        const product = rows[0];
        let specifics = product.item_specifics;
        if (typeof specifics === 'string') {
            try {
                specifics = JSON.parse(specifics);
            } catch (e) {}
        }

        const data = {
            title: product.title,
            specifics: specifics,
            count: Object.keys(specifics || {}).length
        };

        fs.writeFileSync('product_details.json', JSON.stringify(data, null, 2));
        console.log("Details saved to product_details.json");
    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

findProduct();
