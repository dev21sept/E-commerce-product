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
    const state = req.query.state || 'dashboard'; // Pass the source page as state
    if (!ruName) return res.status(400).json({ error: 'RuName is required' });
    
    const url = ebayService.getUserConsentUrl(ruName, state);
    res.json({ url });
};

exports.handleCallback = async (req, res) => {
    const { code, state, error, error_description } = req.query;
    console.log('--- EBAY CALLBACK RECEIVED ---');
    console.log('Query:', req.query);

    if (error) {
        console.error('eBay Auth Error:', error, error_description);
        return res.status(400).send(`eBay Login Error: ${error_description || error}. Please try again.`);
    }
    
    if (!code) {
        console.error('No code found in eBay redirect');
        return res.status(400).send('Authentication code missing from eBay. Please try connecting again.');
    }

    const ruName = process.env.EBAY_RU_NAME;
    try {
        const tokens = await ebayService.getUserToken(code, ruName);
        
        await saveSetting('ebay_access_token', tokens.access_token);
        await saveSetting('ebay_refresh_token', tokens.refresh_token);
        await saveSetting('ebay_token_expiry', (Date.now() + (tokens.expires_in * 1000)).toString());
        
        const frontendUrl = (process.env.FRONTEND_URL || 'https://fascinating-longma-3fed25.netlify.app').trim().replace(/\/$/, '');
        // Redirect back to the originating page
        const redirectPath = state === 'products' ? '/products' : '/';
        res.redirect(`${frontendUrl}${redirectPath}?ebay_auth=success`);
    } catch (error) {
        console.error('Callback Error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed check server logs');
    }
};

// Function to ensure we have a valid token
async function getValidToken() {
    try {
        console.log('Fetching tokens from DB...');
        let accessToken = await getSetting('ebay_access_token');
        let refreshToken = await getSetting('ebay_refresh_token');
        let expiresAt = await getSetting('ebay_token_expiry');

        console.log('DB Check:', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken, 
            expiresAt 
        });

        if (!refreshToken) {
            console.error('CRITICAL: No refresh token found. User MUST login again.');
            return null;
        }
        
        // If expired or about to expire, refresh it
        if (!expiresAt || Date.now() > Number(expiresAt) - 60000) { 
            console.log('Refreshing eBay token using refresh token...');
            const newTokenData = await ebayService.refreshUserToken(refreshToken);
            accessToken = newTokenData;
            expiresAt = Date.now() + (7200 * 1000); // 2 hours
            
            await saveSetting('ebay_access_token', accessToken);
            await saveSetting('ebay_token_expiry', expiresAt.toString());
        }
        return accessToken;
    } catch (error) {
        console.error('Token Retrieval/Refresh Error:', error.message);
        return null;
    }
}

exports.listProduct = async (req, res) => {
    const { productId } = req.params;
    console.log(`Attempting to list product ${productId} on eBay...`);
    
    try {
        const token = await getValidToken();
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Authentication Required', 
                details: 'Your eBay session has expired or not been established. Please click "Connect eBay" again.' 
            });
        }
        
        // 1. Fetch product from our DB
        const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [productId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        const product = rows[0];

        // 2. Fetch images
        const [imgs] = await pool.execute('SELECT image_url FROM product_images WHERE product_id = ?', [productId]);
        const imageList = imgs.map(i => i.image_url);

        const sku = `PROD-${product.id}-${Date.now()}`; // Unique SKU to avoid conflicts

        // 3. Create/Update Inventory Item
        const inventoryItem = {
            availability: { shipToLocationAvailability: { quantity: 1 } },
            condition: 'NEW',
            product: {
                title: product.title.substring(0, 80), // eBay limit
                description: (product.description || product.title).substring(0, 4000),
                imageUrls: imageList.slice(0, 5),
                aspects: {
                    Brand: [product.brand || 'Unbranded'],
                }
            }
        };

        console.log('Step 1: Creating/Updating Inventory Item...');
        try {
            await ebayService.createOrReplaceInventoryItem(token, sku, inventoryItem);
        } catch (err) {
            err.step = 'Create Inventory Item';
            throw err;
        }

        console.log('Step 1.5: Verifying Merchant Location...');
        try {
            const locationKey = 'default';
            const locationInfo = {
                location: {
                    address: {
                        addressLine1: '123 Main St',
                        city: 'San Jose',
                        stateOrProvince: 'CA',
                        postalCode: '95131',
                        country: 'US'
                    }
                },
                locationInstructions: 'Main warehouse',
                locationWebUrl: 'http://example.com',
                name: 'Main Store',
                merchantLocationStatus: 'ENABLED',
                locationTypes: ['STORE']
            };
            await ebayService.createOrUpdateLocation(token, locationKey, locationInfo);
        } catch (locationErr) {
            const ebayError = locationErr.response?.data?.errors?.[0];
            const errorMsg = ebayError?.message || locationErr.message || "";
            if (ebayError?.errorId === 25002 || errorMsg.toLowerCase().includes("already exists")) {
                console.log('Merchant location already exists, proceeding...');
            } else {
                locationErr.step = 'Create Location';
                throw locationErr;
            }
        }

        // 3.5 Fetch Business Policies
        console.log('Step 1.7: Fetching Business Policies...');
        let fulfillmentPolicyId, paymentPolicyId, returnPolicyId;
        try {
            const [fPolicies, pPolicies, rPolicies] = await Promise.all([
                ebayService.getFulfillmentPolicies(token),
                ebayService.getPaymentPolicies(token),
                ebayService.getReturnPolicies(token)
            ]);

            fulfillmentPolicyId = fPolicies[0]?.fulfillmentPolicyId;
            paymentPolicyId = pPolicies[0]?.paymentPolicyId;
            returnPolicyId = rPolicies[0]?.returnPolicyId;

            console.log('Policies found:', { fulfillmentPolicyId, paymentPolicyId, returnPolicyId });

            if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
                console.warn('One or more business policies are missing. Attempting to list with null policies to see if eBay provides defaults.');
            }
        } catch (policyErr) {
            console.error('Error fetching policies, proceeding without them:', policyErr.message);
        }

        // 4. Create Offer
        console.log('Step 2: Creating Offer...');
        let offerId;
        try {
            const offer = {
                sku: sku,
                marketplaceId: 'EBAY_US',
                format: 'FIXED_PRICE',
                availableQuantity: 1,
                categoryId: product.category_id || '31387', 
                listingDescription: (product.description || product.title).substring(0, 4000),
                pricingSummary: {
                    price: {
                        currency: 'USD',
                        value: product.selling_price || '10.00'
                    }
                },
                merchantLocationKey: 'default', 
                tax: { vatPercentage: 0 },
                listingPolicies: {
                    fulfillmentPolicyId,
                    paymentPolicyId,
                    returnPolicyId
                }
            };
            const offerResponse = await ebayService.createOffer(token, offer);
            offerId = offerResponse.offerId;
        } catch (err) {
            err.step = 'Create Offer';
            throw err;
        }

        // 5. Publish Offer
        console.log('Step 3: Publishing Offer...');
        try {
            const publishResponse = await ebayService.publishOffer(token, offerId);
            res.json({ 
                message: 'SUCCESS! Listed on eBay Sandbox!', 
                sku, 
                listingId: publishResponse.listingId 
            });
        } catch (err) {
            err.step = 'Publish Offer';
            throw err;
        }
    } catch (error) {
        console.error('--- EBAY LISTING ERROR ---');
        const ebayError = error.response?.data?.errors?.[0];
        const errorMsg = ebayError?.message || error.message || "";
        console.error('Error Step:', error.step || 'Unknown');
        console.error('Full Error:', JSON.stringify(error.response?.data, null, 2));
        
        res.status(500).json({ 
            error: 'Listing failed', 
            details: `[${error.step || 'eBay'}] ${ebayError?.message || error.message}`,
            step: error.step,
            fullError: error.response?.data
        });
    }
};
