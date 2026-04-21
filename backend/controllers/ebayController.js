const crypto = require('crypto');
const ebayService = require('../services/ebayApiService');
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const Order = require('../models/Order');

// Handle eBay Marketplace Account Deletion Notification (Mandatory for Compliance)
exports.handleDeletionNotification = async (req, res) => {
    try {
        const challengeCode = req.query.challenge_code;
        
        // 1. Handle Challenge Verification (GET)
        if (challengeCode) {
            const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
            // Use BACKEND_URL from .env if available, otherwise fallback to request host
            const baseUrl = (process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
            const endpoint = `${baseUrl}/api/ebay/deletion`;
            
            if (!verificationToken) {
                console.warn(`[EBAY DELETION] Warning: EBAY_VERIFICATION_TOKEN not set in .env`);
            }

            const hash = crypto.createHash('sha256');
            hash.update(challengeCode + (verificationToken || '') + endpoint);
            const responseHash = hash.digest('hex');

            // Only log verification for debugging if needed, otherwise keep it quiet
            return res.status(200).json({
                challengeResponse: responseHash
            });
        }

        // 2. Handle Actual Notification (POST)
        if (req.method === 'POST') {
            // Success response is mandatory for eBay
            return res.status(200).send('OK');
        }

        return res.status(400).send('Invalid Request');

    } catch (error) {
        console.error(`❌ [EBAY DELETION CRASH]:`, {
            message: error.message,
            stack: error.stack,
            method: req.method,
            query: req.query
        });
        return res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message 
        });
    }
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
            { upsert: true, returnDocument: 'after' }
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
        
        // Fetch and save the seller's profile info
        try {
            console.log('Fetching eBay user profile...');
            const profile = await ebayService.getUserProfile(tokens.access_token);
            if (profile && profile.userId) {
                console.log(`Connected to eBay account: ${profile.userId}`);
                await saveSetting('ebay_seller_name', profile.userId);
            }
        } catch (profileErr) {
            console.error('Error fetching user profile during callback:', profileErr.message);
        }

        // Trigger background sync for both Inventory and Orders
        console.log('Starting full eBay sync (Inventory + Orders)...');
        exports.syncInventory(tokens.access_token).catch(err => console.error('Initial inventory sync error:', err));
        exports.syncOrders(tokens.access_token).catch(err => console.error('Initial orders sync error:', err));

        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim().replace(/\/$/, '');
        const redirectPath = state === 'products' ? '/products' : '/';
        res.redirect(`${frontendUrl}${redirectPath}?ebay_auth=success`);
    } catch (error) {
        console.error('Callback Error:', error.response?.data || error.message);
        const ebayError = error.response?.data;
        const errorMsg = ebayError?.error_description || ebayError?.error || error.message;
        res.status(500).send(`Authentication failed: ${errorMsg}. Please check your credentials and RuName.`);
    }
};

exports.syncOrders = async (providedToken = null) => {
    try {
        let token = providedToken || await getValidToken();
        if (!token) return { error: 'No valid token' };

        console.log('--- STARTING EBAY ORDERS SYNC ---');
        const data = await ebayService.getOrders(token);
        const orders = data.orders || [];
        
        let syncedCount = 0;
        for (const o of orders) {
            const orderData = {
                orderId: o.orderId,
                ebayOrderId: o.orderId,
                sellerId: o.sellerId,
                buyerUsername: o.buyer?.username,
                totalAmount: o.totalFeeBasisAmount?.value,
                currency: o.totalFeeBasisAmount?.currency,
                status: o.orderFulfillmentStatus,
                paymentStatus: o.orderPaymentStatus,
                createdDate: o.creationDate,
                paidDate: o.paymentSummary?.payments?.[0]?.paymentDate,
                lineItems: o.lineItems?.map(li => ({
                    lineItemId: li.lineItemId,
                    title: li.title,
                    sku: li.sku,
                    quantity: li.quantity,
                    price: li.lineItemCost?.value,
                    thumbnail: li.image?.imageUrl
                })),
                shippingStep: o.fulfillmentStartInstructions?.[0]?.shippingStep
            };

            await Order.findOneAndUpdate(
                { orderId: o.orderId },
                orderData,
                { upsert: true, new: true }
            );
            syncedCount++;
        }

        console.log(`--- ORDERS SYNC COMPLETE: ${syncedCount} orders processed ---`);
        return { success: true, count: syncedCount };
    } catch (error) {
        console.error('Sync Orders Error:', error.message);
        throw error;
    }
};


exports.syncInventory = async (providedToken = null) => {
    try {
        let token = providedToken || await getValidToken();
        if (!token) return { error: 'No valid token' };

        console.log('--- STARTING EBAY INVENTORY SYNC ---');
        let offset = 0;
        let limit = 100;
        let hasMore = true;
        let totalSynced = 0;

        while (hasMore) {
            const data = await ebayService.getInventoryItems(token, limit, offset);
            const items = data.inventoryItems || [];
            
            if (items.length === 0) break;

            for (const item of items) {
                // Map eBay item to our Product model
                const product = {
                    title: item.product.title,
                    description: item.product.description,
                    sku: item.sku,
                    brand: item.product.brand,
                    images: item.product.imageUrls || [],
                    selling_price: item.price?.value,
                    source: 'ebay',
                    updated_at: Date.now()
                };

                // Upsert based on SKU
                await Product.findOneAndUpdate(
                    { sku: item.sku },
                    product,
                    { upsert: true, new: true }
                );
                totalSynced++;
            }

            if (items.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }

        console.log(`--- SYNC COMPLETE: ${totalSynced} items processed ---`);
        return { success: true, count: totalSynced };
    } catch (error) {
        console.error('Sync Inventory Error:', error.message);
        throw error;
    }
};

// Explicit Sync Endpoint
exports.triggerSync = async (req, res) => {
    try {
        const result = await this.syncInventory();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get User's eBay Business Policies
 */
exports.getUserPolicies = async (req, res) => {
    try {
        const token = await getValidToken();
        if (!token) return res.status(401).json({ error: 'eBay not connected' });

        const [fulfillment, payment, returns] = await Promise.allSettled([
            ebayService.getFulfillmentPolicies(token),
            ebayService.getPaymentPolicies(token),
            ebayService.getReturnPolicies(token)
        ]);

        res.json({ 
            fulfillment: fulfillment.status === 'fulfilled' ? fulfillment.value : [], 
            payment: payment.status === 'fulfilled' ? payment.value : [], 
            returns: returns.status === 'fulfilled' ? returns.value : [] 
        });
    } catch (error) {
        console.error('getUserPolicies crash:', error.message);
        res.status(500).json({ error: 'Failed to fetch policies', details: error.message });
    }
};

/**
 * Get eBay Inventory Locations
 */
exports.getInventoryLocations = async (req, res) => {
    try {
        const token = await getValidToken();
        if (!token) return res.status(401).json({ error: 'eBay not connected' });

        // Using a generic call to fetch locations
        const response = await require('axios').get(`${process.env.EBAY_ENVIRONMENT === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com'}/sell/inventory/v1/location`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        res.json(response.data.locations || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch locations', details: error.message });
    }
};

/**
 * Get Connection Status & Seller Name
 */
exports.getConnectionStatus = async (req, res) => {
    try {
        const token = await getValidToken();
        const sellerName = await getSetting('ebay_seller_name');
        
        res.json({
            connected: !!token,
            sellerName: sellerName || 'Unknown User'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch connection status' });
    }
};

exports.getCategoryConditions = async (req, res) => {
    try {
        const { categoryId } = req.query;
        if (!categoryId) return res.status(400).json({ error: 'CategoryID is required' });

        const token = await ebayService.getAppToken(); // Taxonomy API works best with App Token
        console.log(`[EBAY] Fetching conditions for CategoryID: ${categoryId} using App Token`);
        const conditions = await ebayService.getCategoryConditions(token, categoryId);
        res.json({ conditions });
    } catch (error) {
        console.error('Error in getCategoryConditions controller:', error.message);
        res.status(500).json({ error: 'Failed to fetch category conditions' });
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

