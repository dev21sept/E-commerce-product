const mongoose = require('mongoose');
const Product = require('../models/Product');
const DeletedProduct = require('../models/DeletedProduct');
const { normalizeProductImages } = require('../utils/imageProcessor');
const ebayService = require('../services/ebayApiService');
const Setting = require('../models/Setting');
const connectMongoDB = require('../config/mongodb');

async function getSetting(key) {
    try {
        const setting = await Setting.findOne({ setting_key: key });
        return setting ? setting.setting_value : null;
    } catch (e) {
        console.error('Error fetching setting from MongoDB:', e);
        return null;
    }
}

async function getValidToken() {
    try {
        const accessToken = await getSetting('ebay_access_token');
        const refreshToken = await getSetting('ebay_refresh_token');
        const expiresAt = await getSetting('ebay_token_expiry');

        if (!refreshToken) return null;

        if (!expiresAt || Date.now() > Number(expiresAt) - 300000) {
            const newTokenData = await ebayService.refreshUserToken(refreshToken);
            return newTokenData;
        }

        return accessToken;
    } catch (error) {
        console.error('Token Retrieval Error:', error.message);
        return null;
    }
}

async function recordDeletionTombstone(product) {
    try {
        await DeletedProduct.findOneAndUpdate(
            {
                $or: [
                    product.sku ? { sku: product.sku } : null,
                    product.title ? { title: product.title, source: product.source || 'ebay' } : null,
                    product.ebayOfferId ? { ebayOfferId: product.ebayOfferId } : null,
                    product.ebayListingId ? { ebayListingId: product.ebayListingId } : null
                ].filter(Boolean)
            },
            {
                productId: product._id.toString(),
                sku: product.sku || null,
                title: product.title || null,
                source: product.source || 'ebay',
                ebayOfferId: product.ebayOfferId || null,
                ebayListingId: product.ebayListingId || null,
                deleted_at: Date.now()
            },
            { upsert: true, returnDocument: 'after' }
        );
    } catch (error) {
        console.error('Failed to create deletion tombstone:', error.message);
    }
}

async function deleteRemoteEbayListing(product) {
    const isEbaySource = ['ebay', 'scraper'].includes(product.source);
    if (!isEbaySource && !product.ebayOfferId && !product.sku) {
        return { skipped: true };
    }

    const token = await getValidToken();
    if (!token) {
        throw new Error('eBay session is not connected, so the remote listing could not be removed.');
    }

    if (product.ebayOfferId) {
        try {
            await ebayService.deleteOffer(token, product.ebayOfferId);
            return { deleted: 'offer' };
        } catch (offerError) {
            console.warn(`Offer delete failed for ${product.ebayOfferId}, trying inventory item fallback: ${offerError.message}`);
        }
    }

    if (product.sku) {
        await ebayService.deleteInventoryItem(token, product.sku);
        return { deleted: 'inventory_item' };
    }

    return { skipped: true };
}

// Create a new product (MongoDB version)
exports.createProduct = async (req, res) => {
    console.log("[MongoDB] Attempting to create a new product...");
    try {
        const {
            title, description, category, category_id, categoryId, brand, sku,
            condition_name, condition_notes, condition_id, gender, retail_price, selling_price, 
            discount_percentage, seller_name, seller_feedback, ebay_url, about_item, 
            item_specifics, officialAspects, images, variations, video_url, overwrite
        } = req.body;
        const normalizedImages = await normalizeProductImages(images || []);

        const finalCategoryId = categoryId || category_id;

        console.log(`[MongoDB] Saving product: ${title?.substring(0, 30)}...`);

        // IMAGE-BASED DEDUPLICATION: Search for existing product with one matching image
        if (normalizedImages.length > 0) {
            const existingProduct = await Product.findOne({
                images: { $in: normalizedImages.filter(img => img && img.length > 50) }
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
                    }, { returnDocument: 'after' });
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
            sku,
            condition_name,
            condition_notes,
            condition_id,
            gender,
            retail_price: parseFloat(retail_price) || 0,
            selling_price: parseFloat(selling_price) || 0,
            discount_percentage,
            seller_name,
            seller_feedback,
            ebay_url,
            about_item,
            item_specifics,
            officialAspects,
            images: normalizedImages,
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
        // Speed Optimization: Only fetch fields needed for the table/list
        // This avoids loading heavy descriptions and all images for every record
        const products = await Product.find({})
            .select('title sku selling_price images category created_at updated_at source ai_generated brand condition_name condition_notes gender item_specifics variations description status')
            .sort({ updated_at: -1 })
            .maxTimeMS(10000)
            .lean();

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
            condition_name, condition_notes, condition_id, gender, retail_price, selling_price,
            discount_percentage, seller_name, seller_feedback,
            ebay_url, about_item, item_specifics, officialAspects, images, variations, video_url
        } = req.body;
        const normalizedImages = await normalizeProductImages(images || []);

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
                condition_name, condition_notes, condition_id, gender, retail_price: parseFloat(retail_price) || 0,
                selling_price: parseFloat(selling_price) || 0,
                discount_percentage, seller_name, seller_feedback,
                ebay_url, about_item, item_specifics, officialAspects, images: normalizedImages,
                variations: formattedVariations, video_url,
                updated_at: Date.now()
            },
            { returnDocument: 'after' }
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
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        let remoteDeleteResult = { skipped: true };
        try {
            remoteDeleteResult = await deleteRemoteEbayListing(product.toObject());
        } catch (remoteError) {
            console.warn('Remote eBay delete warning:', remoteError.message);
        }

        await recordDeletionTombstone(product.toObject());
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete product', details: error.message });
    }
};
