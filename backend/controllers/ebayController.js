const crypto = require('crypto');
const ebayService = require('../services/ebayApiService');
const Product = require('../models/Product');
const Setting = require('../models/Setting');

// Handle eBay Marketplace Account Deletion Notification (Mandatory for Production Keys)
exports.handleDeletionNotification = async (req, res) => {
    const challengeCode = req.query.challenge_code;
    if (!challengeCode) {
        return res.status(400).send('Challenge code missing');
    }

    const verificationToken = process.env.EBAY_VERIFICATION_TOKEN || 'your_secret_token_here';
    const endpoint = process.env.EBAY_DELETION_ENDPOINT || 'https://' + req.get('host') + '/api/ebay/deletion';

    const hash = crypto.createHash('sha256');
    hash.update(challengeCode + verificationToken + endpoint);
    const responseHash = hash.digest('hex');

    res.status(200).json({
        challengeResponse: responseHash
    });
};

// Helper to get a setting from MongoDB
async function getSetting(key) {
    try {
        const setting = await Setting.findOne({ setting_key: key });
        return setting ? setting.setting_value : null;
    } catch (e) {
        console.error('Error fetching setting from MongoDB:', e);
        return null;
    }
}

// Helper to save a setting to MongoDB
async function saveSetting(key, value) {
    try {
        await Setting.findOneAndUpdate(
            { setting_key: key },
            { setting_value: value, updated_at: Date.now() },
            { upsert: true, new: true }
        );
    } catch (e) {
        console.error('Error saving setting to MongoDB:', e);
    }
}

exports.getAuthUrl = (req, res) => {
    const ruName = req.query.ruName || process.env.EBAY_RU_NAME;
    const state = req.query.state || 'dashboard'; 
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
        
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
        const redirectPath = state === 'products' ? '/products' : '/';
        res.redirect(`${frontendUrl}${redirectPath}?ebay_auth=success`);
    } catch (error) {
        console.error('Callback Error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed check server logs');
    }
};

async function getValidToken() {
    try {
        console.log('Fetching tokens from MongoDB...');
        let accessToken = await getSetting('ebay_access_token');
        let refreshToken = await getSetting('ebay_refresh_token');
        let expiresAt = await getSetting('ebay_token_expiry');

        if (!refreshToken) {
            console.error('CRITICAL: No refresh token found. User MUST login again.');
            return null;
        }
        
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
        
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const imageList = product.images || [];
        const sku = `PROD-${product._id}-${Date.now()}`; 

        const inventoryItem = {
            availability: { shipToLocationAvailability: { quantity: 1 } },
            condition: 'NEW',
            product: {
                title: product.title.substring(0, 80),
                description: (product.description || product.title).substring(0, 4000),
                imageUrls: imageList.slice(0, 12),
                aspects: {
                    Brand: [product.brand || 'Unbranded'],
                }
            }
        };

        if (product.item_specifics) {
            Object.entries(product.item_specifics).forEach(([k, v]) => {
                inventoryItem.product.aspects[k] = [Array.isArray(v) ? v[0] : v];
            });
        }

        console.log('Step 1: Creating/Updating Inventory Item...');
        await ebayService.createOrReplaceInventoryItem(token, sku, inventoryItem);

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

        let fulfillmentPolicyId, paymentPolicyId, returnPolicyId;
        const [fList, pList, rList] = await Promise.all([
            ebayService.getFulfillmentPolicies(token),
            ebayService.getPaymentPolicies(token),
            ebayService.getReturnPolicies(token)
        ]);

        fulfillmentPolicyId = fList[0]?.fulfillmentPolicyId;
        paymentPolicyId = pList[0]?.paymentPolicyId;
        returnPolicyId = rList[0]?.returnPolicyId;

        if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
            if (process.env.EBAY_ENVIRONMENT === 'production') {
                 throw new Error(`[Production] Missing Business Policies. Please ensure you have Shipping, Payment, and Return policies on your eBay account.`);
            } else {
                if (!fulfillmentPolicyId) {
                    const res = await ebayService.initDefaultFulfillmentPolicy(token);
                    fulfillmentPolicyId = res.fulfillmentPolicyId;
                }
                if (!paymentPolicyId) {
                    const res = await ebayService.initDefaultPaymentPolicy(token);
                    paymentPolicyId = res.paymentPolicyId;
                }
                if (!returnPolicyId) {
                    const res = await ebayService.initDefaultReturnPolicy(token);
                    returnPolicyId = res.returnPolicyId;
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

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
            listingPolicies: {
                fulfillmentPolicyId,
                paymentPolicyId,
                returnPolicyId
            }
        };

        console.log('Step 2: Creating Offer...');
        const offerResponse = await ebayService.createOffer(token, offer);
        const offerId = offerResponse.offerId;

        console.log('Step 3: Publishing Offer...');
        const publishResponse = await ebayService.publishOffer(token, offerId);
        res.json({ 
            message: 'SUCCESS! Listed on eBay!', 
            sku, 
            listingId: publishResponse.listingId 
        });

    } catch (error) {
        console.error('--- EBAY LISTING ERROR ---');
        const ebayError = error.response?.data?.errors?.[0];
        res.status(500).json({ 
            error: 'Listing failed', 
            details: `[${error.step || 'eBay'}] ${ebayError?.message || error.message}`
        });
    }
};
