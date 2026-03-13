const pool = require('../config/db');
const { fetchEbayProduct } = require('../services/ebayScraper');

// Fetch eBay product data
exports.fetchEbayData = async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'eBay URL is required' });
    }

    try {
        const productData = await fetchEbayProduct(url);
        // Attach the original URL
        productData.ebayUrl = url;
        res.json(productData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch eBay product data', details: error.message });
    }
};

// Standalone scrape for description (User request)
exports.scrapeEbayDescription = async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const { fetchDescriptionOnly } = require('../services/descriptionService');

    try {
        const description = await fetchDescriptionOnly(url);
        res.json({ description });
    } catch (error) {
        console.log("Scraping error:", error);
        res.status(500).json({ error: "Scraping failed", details: error.message });
    }
};



// Create a new product
exports.createProduct = async (req, res) => {
    console.log("[DB] Attempting to create a new product...");
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            title, description, category, categoryId, brand,
            condition_name, retail_price, selling_price,
            discount_percentage, seller_name, seller_feedback,
            ebay_url, about_item, item_specifics, images, variations, video_url
        } = req.body;

        console.log(`[DB] Saving product: ${title?.substring(0, 30)}...`);

        const [result] = await connection.execute(
            `INSERT INTO products (title, description, category, category_id, brand, condition_name, retail_price, selling_price, discount_percentage, seller_name, seller_feedback, ebay_url, about_item, item_specifics, video_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title || null,
                description || null,
                category || null,
                categoryId || null,
                brand || null,
                condition_name || null,
                retail_price || null,
                selling_price || null,
                discount_percentage || null,
                seller_name || null,
                seller_feedback || null,
                ebay_url || null,
                about_item || null,
                item_specifics ? JSON.stringify(item_specifics) : null,
                video_url || null
            ]
        );

        const productId = result.insertId;
        console.log(`[DB] Main product record created with ID: ${productId}`);

        // Insert images
        if (images && images.length > 0) {
            for (const imgUrl of images) {
                await connection.execute(
                    'INSERT INTO product_images (product_id, image_url) VALUES (?, ?)',
                    [productId, imgUrl]
                );
            }
            console.log(`[DB] Inserted ${images.length} images.`);
        }

        // Insert variations (e.g. Size, Color dropdowns)
        if (variations && Array.isArray(variations)) {
            for (const variation of variations) {
                const { name, values } = variation;
                if (values && Array.isArray(values)) {
                    for (const value of values) {
                        await connection.execute(
                            'INSERT INTO product_variations (product_id, variation_name, variation_value) VALUES (?, ?, ?)',
                            [productId, name, value]
                        );
                    }
                }
            }
            console.log(`[DB] Inserted variations.`);
        }

        await connection.commit();
        console.log("[DB] Transaction committed successfully.");
        res.status(201).json({ message: 'Product created successfully', productId });
    } catch (error) {
        console.error("[DB] CRITICAL ERROR DURING SAVE:", error.message);
        await connection.rollback();
        res.status(500).json({ error: 'Failed to create product', details: error.message });
    } finally {
        connection.release();
    }
};


// Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const [products] = await pool.execute('SELECT * FROM products ORDER BY id DESC');

        // Fetch images and variations for each product
        for (let product of products) {
            const [images] = await pool.execute('SELECT image_url FROM product_images WHERE product_id = ?', [product.id]);
            product.images = images.map(img => img.image_url);

            const [variationsRows] = await pool.execute('SELECT variation_name, variation_value FROM product_variations WHERE product_id = ?', [product.id]);
            const variationMap = {};
            variationsRows.forEach(({ variation_name, variation_value }) => {
                if (!variationMap[variation_name]) variationMap[variation_name] = [];
                variationMap[variation_name].push(variation_value);
            });
            product.variations = Object.keys(variationMap).map(name => ({ name, values: variationMap[name] }));
        }

        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products', details: error.message });
    }
};

// Get single product
exports.getProduct = async (req, res) => {
    try {
        const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (products.length === 0) return res.status(404).json({ error: 'Product not found' });

        const product = products[0];
        const [images] = await pool.execute('SELECT image_url FROM product_images WHERE product_id = ?', [product.id]);
        const [variationsRows] = await pool.execute('SELECT variation_name, variation_value FROM product_variations WHERE product_id = ?', [product.id]);

        product.images = images.map(img => img.image_url);

        // Group variations by name
        const variationMap = {};
        variationsRows.forEach(({ variation_name, variation_value }) => {
            if (!variationMap[variation_name]) {
                variationMap[variation_name] = [];
            }
            variationMap[variation_name].push(variation_value);
        });

        product.variations = Object.keys(variationMap).map(name => ({
            name,
            values: variationMap[name]
        }));

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product', details: error.message });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            title, description, category, categoryId, brand,
            condition_name, retail_price, selling_price,
            discount_percentage, seller_name, seller_feedback,
            ebay_url, about_item, item_specifics, images, variations, video_url
        } = req.body;

        await connection.execute(
            `UPDATE products SET title=?, description=?, category=?, category_id=?, brand=?, condition_name=?, retail_price=?, selling_price=?, discount_percentage=?, seller_name=?, seller_feedback=?, ebay_url=?, about_item=?, item_specifics=?, video_url=?
             WHERE id = ?`,
            [
                title || null,
                description || null,
                category || null,
                categoryId || null,
                brand || null,
                condition_name || null,
                retail_price || null,
                selling_price || null,
                discount_percentage || null,
                seller_name || null,
                seller_feedback || null,
                ebay_url || null,
                about_item || null,
                item_specifics ? JSON.stringify(item_specifics) : null,
                video_url || null,
                req.params.id
            ]
        );

        // Update images (delete and re-insert)
        await connection.execute('DELETE FROM product_images WHERE product_id = ?', [req.params.id]);
        if (images && images.length > 0) {
            for (const imgUrl of images) {
                await connection.execute(
                    'INSERT INTO product_images (product_id, image_url) VALUES (?, ?)',
                    [req.params.id, imgUrl]
                );
            }
        }

        // Update variations
        await connection.execute('DELETE FROM product_variations WHERE product_id = ?', [req.params.id]);
        if (variations && Array.isArray(variations)) {
            for (const variation of variations) {
                const { name, values } = variation;
                if (values && Array.isArray(values)) {
                    for (const value of values) {
                        await connection.execute(
                            'INSERT INTO product_variations (product_id, variation_name, variation_value) VALUES (?, ?, ?)',
                            [req.params.id, name, value]
                        );
                    }
                }
            }
        }

        await connection.commit();
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: 'Failed to update product', details: error.message });
    } finally {
        connection.release();
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product', details: error.message });
    }
};
