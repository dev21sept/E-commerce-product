const mongoose = require('mongoose');
const Product = require('../models/Product');

// Create a new product (MongoDB version)
exports.createProduct = async (req, res) => {
    console.log("[MongoDB] Attempting to create a new product...");
    try {
        const {
            title, description, category, category_id, categoryId, brand,
            condition_name, retail_price, selling_price, discount_percentage,
            seller_name, seller_feedback, ebay_url, about_item, item_specifics,
            images, variations, video_url, overwrite
        } = req.body;

        const finalCategoryId = categoryId || category_id;

        console.log(`[MongoDB] Saving product: ${title?.substring(0, 30)}...`);

        // IMAGE-BASED DEDUPLICATION: Search for existing product with one matching image
        if (images && images.length > 0) {
            const existingProduct = await Product.findOne({
                images: { $in: images.filter(img => img && img.length > 50) }
            });

            if (existingProduct) {
                if (!overwrite) {
                    console.log(`⚠️ DUPLICATE DETECTED: Product exists with ID: ${existingProduct._id}`);
                    return res.status(200).json({
                        success: false,
                        duplicate: true,
                        message: 'Product with these images already exists!',
                        productId: existingProduct._id,
                        existingProduct: existingProduct
                    });
                } else {
                    console.log(`⚡ OVERWRITING: ID: ${existingProduct._id}`);
                    const updated = await Product.findByIdAndUpdate(existingProduct._id, {
                        ...req.body,
                        updated_at: new Date()
                    }, { new: true });
                    return res.status(200).json({ message: 'Product updated successfully', productId: updated._id });
                }
            }
        }

        // Transform variations if needed (SQL version had nested structure)
        let formattedVariations = [];
        if (variations && Array.isArray(variations)) {
            variations.forEach(v => {
                if (v.values && Array.isArray(v.values)) {
                    v.values.forEach(val => {
                        formattedVariations.push({ name: v.name, value: val });
                    });
                } else if (v.value) {
                    formattedVariations.push({ name: v.name, value: v.value });
                }
            });
        }

        const newProduct = new Product({
            title,
            description,
            category,
            category_id: finalCategoryId,
            brand,
            condition_name,
            retail_price: parseFloat(retail_price) || 0,
            selling_price: parseFloat(selling_price) || 0,
            discount_percentage,
            seller_name,
            seller_feedback,
            ebay_url,
            about_item,
            item_specifics,
            images: images || [],
            variations: formattedVariations,
            video_url,
            ai_generated: req.body.ai_generated || false,
            source: req.body.source || 'ebay'
        });

        await newProduct.save();
        console.log(`[MongoDB] Product record created with ID: ${newProduct._id}`);

        res.status(201).json({ message: 'Product created successfully', productId: newProduct._id });
    } catch (error) {
        console.error("[MongoDB] ERROR DURING SAVE:", error.message);
        res.status(500).json({ error: 'Failed to create product', details: error.message });
    }
};

// Get all products (MongoDB version)
exports.getAllProducts = async (req, res) => {
    console.log(`[API] GET /products called (DB State: ${mongoose.connection.readyState})`);
    
    // If disconnected, try to connect instead of just failing
    if (mongoose.connection.readyState === 0) {
        const connectMongoDB = require('../config/mongodb');
        connectMongoDB(); // Fire and forget, Mongoose will buffer
    }

    try {
        console.log(`[MongoDB] Querying products with 10s timeout...`);
        // Simple find without sort first to test speed
        const products = await Product.find({})
            .maxTimeMS(10000) // 10 seconds timeout at MongoDB level
            .lean(); // Faster, returns plain JS objects

        console.log(`[MongoDB] Query finished. Found ${products.length} products`);
        
        const formattedProducts = products.map(p => {
            const product = { ...p, id: p._id.toString() };
            
            const variationMap = {};
            const variations = product.variations || []; 
            variations.forEach(({ name, value }) => {
                if (name && value) {
                    if (!variationMap[name]) variationMap[name] = [];
                    variationMap[name].push(value);
                }
            });
            product.variationsFormatted = Object.keys(variationMap).map(name => ({ name, values: variationMap[name] }));
            
            return product;
        });

        console.log(`[API] Sending ${formattedProducts.length} products`);
        res.json(formattedProducts);
    } catch (error) {
        console.error(`[API ERROR] getAllProducts:`, error.message);
        res.status(500).json({ error: 'Failed to fetch products', details: error.message });
    }
};

// Get single product (MongoDB version)
exports.getProduct = async (req, res) => {
    try {
        const p = await Product.findById(req.params.id);
        if (!p) return res.status(404).json({ error: 'Product not found' });

        const product = p.toObject();
        product.id = product._id.toString();

        // Reformat variations for frontend
        const variationMap = {};
        const variations = product.variations || []; // Safety check
        variations.forEach(({ name, value }) => {
            if (name && value) {
                if (!variationMap[name]) variationMap[name] = [];
                variationMap[name].push(value);
            }
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

// Update product (MongoDB version)
exports.updateProduct = async (req, res) => {
    try {
        const {
            title, description, category, categoryId, brand, sku,
            condition_name, condition_notes, retail_price, selling_price,
            discount_percentage, seller_name, seller_feedback,
            ebay_url, about_item, item_specifics, officialAspects, images, variations, video_url
        } = req.body;

        let formattedVariations = [];
        if (variations && Array.isArray(variations)) {
            variations.forEach(v => {
                if (v.values && Array.isArray(v.values)) {
                    v.values.forEach(val => {
                        formattedVariations.push({ name: v.name, value: val });
                    });
                } else if (v.value) {
                    formattedVariations.push({ name: v.name, value: v.value });
                }
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            {
                title, description, category, category_id: categoryId, categoryId, brand, sku,
                condition_name, condition_notes, retail_price: parseFloat(retail_price) || 0, 
                selling_price: parseFloat(selling_price) || 0,
                discount_percentage, seller_name, seller_feedback,
                ebay_url, about_item, item_specifics, officialAspects, images, 
                variations: formattedVariations, video_url,
                updated_at: Date.now()
            },
            { new: true }
        );

        if (!updatedProduct) return res.status(404).json({ error: 'Product not found' });

        res.json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update product', details: error.message });
    }
};

// Delete product (MongoDB version)
exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product', details: error.message });
    }
};
