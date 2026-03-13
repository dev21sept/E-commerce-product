const ebayService = require('../services/ebayApiService');
const pool = require('../config/db');

// In a real app, you'd store these in a DB per user
let userTokens = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null
};

exports.getAuthUrl = (req, res) => {
    const ruName = req.query.ruName || process.env.EBAY_RU_NAME;
    if (!ruName) return res.status(400).json({ error: 'RuName is required' });
    
    const url = ebayService.getUserConsentUrl(ruName);
    res.json({ url });
};

exports.handleCallback = async (req, res) => {
    const { code } = req.query; // eBay sends code as query param in GET
    const ruName = process.env.EBAY_RU_NAME;
    
    if (!code) return res.status(400).send('Authentication code missing');

    try {
        const tokens = await ebayService.getUserToken(code, ruName);
        userTokens.accessToken = tokens.access_token;
        userTokens.refreshToken = tokens.refresh_token;
        userTokens.expiresAt = Date.now() + (tokens.expires_in * 1000);
        
        // Redirect back to frontend with a success message
        const frontendUrl = process.env.FRONTEND_URL || 'https://fascinating-longma-3fed25.netlify.app';
        res.redirect(`${frontendUrl}/?ebay_auth=success`);
    } catch (error) {
        console.error('Callback Error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed check server logs');
    }
};

// Function to ensure we have a valid token
async function getValidToken() {
    if (!userTokens.refreshToken) throw new Error('User not authenticated with eBay');
    
    if (Date.now() > userTokens.expiresAt - 60000) { // Refresh 1 min before expiry
        const newToken = await ebayService.refreshUserToken(userTokens.refreshToken);
        userTokens.accessToken = newToken;
        userTokens.expiresAt = Date.now() + (7200 * 1000); // Usually 2 hours
    }
    return userTokens.accessToken;
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
        console.error('Full Listing Error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Listing failed', 
            details: error.response?.data?.errors?.[0]?.message || error.message 
        });
    }
};
