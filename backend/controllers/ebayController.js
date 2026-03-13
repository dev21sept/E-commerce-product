const ebayService = require('../services/ebayApiService');
const pool = require('../config/db');

// In a real app, you'd store these in a DB per user
let userTokens = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
};

// Helper to get a setting from DB
async function getSetting(key) {
    const [rows] = await pool.execute('SELECT setting_value FROM settings WHERE setting_key = ?', [key]);
    return rows.length > 0 ? rows[0].setting_value : null;
}

// Helper to save a setting to DB
async function saveSetting(key, value) {
    await pool.execute(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
    );
}

exports.getAuthUrl = (req, res) => {
    const ruName = req.query.ruName || process.env.EBAY_RU_NAME;
    if (!ruName) return res.status(400).json({ error: 'RuName is required' });
    
    const url = ebayService.getUserConsentUrl(ruName);
    res.json({ url });
};

exports.handleCallback = async (req, res) => {
    const { code } = req.query;
    const ruName = process.env.EBAY_RU_NAME;
    
    if (!code) return res.status(400).send('Authentication code missing');

    try {
        const tokens = await ebayService.getUserToken(code, ruName);
        
        // Store tokens securely in DB
        await saveSetting('ebay_access_token', tokens.access_token);
        await saveSetting('ebay_refresh_token', tokens.refresh_token);
        await saveSetting('ebay_token_expiry', (Date.now() + (tokens.expires_in * 1000)).toString());
        
        const frontendUrl = process.env.FRONTEND_URL || 'https://fascinating-longma-3fed25.netlify.app';
        res.redirect(`${frontendUrl}/?ebay_auth=success`);
    } catch (error) {
        console.error('Callback Error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed check server logs');
    }
};

// Function to ensure we have a valid token
async function getValidToken() {
    let accessToken = await getSetting('ebay_access_token');
    let refreshToken = await getSetting('ebay_refresh_token');
    let expiresAt = await getSetting('ebay_token_expiry');

    if (!refreshToken) throw new Error('User not authenticated with eBay');
    
    if (!expiresAt || Date.now() > Number(expiresAt) - 60000) { 
        console.log('Refreshing eBay token...');
        const newTokenData = await ebayService.refreshUserToken(refreshToken);
        accessToken = newTokenData;
        expiresAt = Date.now() + (7200 * 1000); // 2 hours
        
        await saveSetting('ebay_access_token', accessToken);
        await saveSetting('ebay_token_expiry', expiresAt.toString());
    }
    return accessToken;
}

exports.listProduct = async (req, res) => {
    const { productId } = req.params;
    
    try {
        const token = await getValidToken();
        
        // 1. Fetch product from our DB
        const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [productId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        const product = rows[0];

        // 2. Fetch images
        const [imgs] = await pool.execute('SELECT image_url FROM product_images WHERE product_id = ?', [productId]);
        const imageList = imgs.map(i => i.image_url);

        const sku = `PROD-${product.id}`;

        // 3. Create/Update Inventory Item
        const inventoryItem = {
            availability: { shipToLocationAvailability: { quantity: 1 } },
            condition: 'NEW',
            product: {
                title: product.title,
                description: product.description || product.title,
                imageUrls: imageList.slice(0, 5), // eBay permits up to 12, taking first 10 for safety
                aspects: {
                    Brand: [product.brand || 'Unbranded'],
                }
            }
        };

        await ebayService.createOrReplaceInventoryItem(token, sku, inventoryItem);

        // 4. Create Offer
        const offer = {
            sku: sku,
            marketplaceId: 'EBAY_US',
            format: 'FIXED_PRICE',
            availableQuantity: 1,
            categoryId: product.category_id || '31387', // Default to a generic category if not found
            listingDescription: product.description || product.title,
            pricingSummary: {
                price: {
                    currency: 'USD',
                    value: product.selling_price || '10.00'
                }
            },
            merchantLocationKey: 'default', // You might need to configure this in eBay Account
            tax: { vatPercentage: 0 }
        };

        const offerResponse = await ebayService.createOffer(token, offer);
        const offerId = offerResponse.offerId;

        // 5. Publish Offer
        const publishResponse = await ebayService.publishOffer(token, offerId);
        
        res.json({ 
            message: 'Product listed successfully on eBay Sandbox!', 
            sku, 
            listingId: publishResponse.listingId 
        });
    } catch (error) {
        console.error('--- EBAY LISTING ERROR ---');
        const ebayError = error.response?.data?.errors?.[0];
        if (ebayError) {
            console.error('eBay says:', ebayError.message);
            console.error('Category:', ebayError.category);
        } else {
            console.error('System Error:', error.message);
        }
        
        res.status(500).json({ 
            error: 'Listing failed', 
            details: ebayError?.message || error.message,
            fullError: error.response?.data
        });
    }
};
