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

        // 3. Create Inventory Item (Simplified)
        // Note: This is a complex JSON, showing the simplified version
        const sku = `PROD-${product.id}`;
        // ... (API calls would go here)
        
        res.json({ message: 'Product listing started (logic pending)', sku });
    } catch (error) {
        res.status(500).json({ error: 'Listing failed', details: error.message });
    }
};
