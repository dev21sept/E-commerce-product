const crypto = require('crypto');
const ebayService = require('../services/ebayApiService');
const Product = require('../models/Product');
const DeletedProduct = require('../models/DeletedProduct');
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

const connectMongoDB = require('../config/mongodb');

// Helper to get a setting from MongoDB
async function getSetting(key) {
    try {
        await connectMongoDB();
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
        await connectMongoDB();
        await Setting.findOneAndUpdate(
            { setting_key: key },
            { setting_value: value, updated_at: Date.now() },
            { upsert: true, returnDocument: 'after' }
        );
    } catch (e) {
        console.error('Error saving setting to MongoDB:', e);
    }
}

async function deleteSettings(keys = []) {
    try {
        await connectMongoDB();
        await Setting.deleteMany({ setting_key: { $in: keys } });
    } catch (e) {
        console.error('Error deleting setting(s) from MongoDB:', e);
    }
}

function extractSellerProfile(profile) {
    const businessName = profile?.businessAccount?.name || null;
    const businessEmail = profile?.businessAccount?.email || null;
    const profileName =
        businessName ||
        profile?.userId ||
        profile?.username ||
        [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
        null;
    const profileEmail =
        businessEmail ||
        profile?.email ||
        profile?.primaryEmail ||
        profile?.emailAddress ||
        null;

    return {
        name: profileName,
        email: profileEmail
    };
}

exports.getAuthUrl = (req, res) => {
    const ruName = process.env.EBAY_RU_NAME;
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
    if (!ruName) {
        return res.status(500).send('EBAY_RU_NAME is missing from production environment settings.');
    }
    try {
        const tokens = await ebayService.getUserToken(code, ruName);
        
        await saveSetting('ebay_access_token', tokens.access_token);
        await saveSetting('ebay_refresh_token', tokens.refresh_token);
        await saveSetting('ebay_token_expiry', (Date.now() + (tokens.expires_in * 1000)).toString());
        
        // Fetch and save the seller's profile info
        try {
            console.log('Fetching eBay user profile during callback...');
            const profile = await ebayService.getUserProfile(tokens.access_token);
            if (profile) {
                const { name, email } = extractSellerProfile(profile);
                
                if (name) await saveSetting('ebay_seller_name', name);
                if (email) await saveSetting('ebay_seller_email', email);
                
                console.log(`Connected to eBay account: ${name} (${email})`);
                console.log('--- PRODUCTION OAUTH TOKENS SAVED TO MONGODB ---');
            }
        } catch (profileErr) {
            console.error('Error fetching user profile during callback:', profileErr.message);
        }

        // Trigger background sync only if explicitly requested or just leave it for the manual button
        console.log('--- Skip auto-sync on callback (User controlled) ---');
        // exports.syncInventory(tokens.access_token).catch(err => console.error('Initial inventory sync error:', err));
        // exports.syncOrders(tokens.access_token).catch(err => console.error('Initial orders sync error:', err));

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
                { upsert: true, returnDocument: 'after' }
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
                const tombstoneMatch = await DeletedProduct.findOne({
                    $or: [
                        item.sku ? { sku: item.sku } : null,
                        item.product?.title ? { title: item.product.title, source: 'ebay' } : null
                    ].filter(Boolean)
                }).lean();

                if (tombstoneMatch) {
                    console.log(`[SYNC] Skipping deleted product: ${item.sku || item.product?.title || 'unknown'}`);
                    continue;
                }

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

                // Smart Deduplication: Match by SKU first, then by Title if SKU is missing
                const searchCriteria = item.sku 
                    ? { sku: item.sku } 
                    : { title: item.product.title, source: 'ebay' };
                
                    searchCriteria,
                    { ...product, updated_at: Date.now() },
                    { upsert: true, returnDocument: 'after' }
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
        const result = await exports.syncInventory();
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
        const response = await require('axios').get('https://api.ebay.com/sell/inventory/v1/location', {
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
        let sellerName = await getSetting('ebay_seller_name');
        let sellerEmail = await getSetting('ebay_seller_email');
        let profileFetched = false;
        
        // Self-healing: If connected but name or email is missing, fetch it now.
        if (token && (!sellerName || sellerName === 'Unknown User' || !sellerEmail)) {
            try {
                console.log('--- SELF HEALING: FETCHING EBAY PROFILE ---');
                const profile = await ebayService.getUserProfile(token);
                console.log('--- RAW EBAY PROFILE DATA:', JSON.stringify(profile));
                if (profile) {
                    const { name, email } = extractSellerProfile(profile);
                    
                    if (name) {
                        sellerName = name;
                        await saveSetting('ebay_seller_name', name);
                    }
                    if (email) {
                        sellerEmail = email;
                        await saveSetting('ebay_seller_email', email);
                    }
                    profileFetched = true;
                    console.log('--- SUCCESSFULLY SAVED EBAY PROFILE:', { name, email });
                }
            } catch (err) {
                console.error('Self-healing profile fetch failed:', err.message);
            }
        }
        
        const isConnected = !!token;
        
        if (!isConnected) {
            console.warn('--- STATUS CHECK: Ebay is DISCONNECTED (No token) ---');
        }
        
        res.json({
            connected: isConnected,
            sellerName: isConnected ? (sellerName || null) : null,
            sellerEmail: isConnected ? (sellerEmail || null) : null,
            profileDataAvailable: isConnected ? Boolean(sellerName || sellerEmail) : false,
            profileFetched,
            environment: 'PRODUCTION'
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

/**
 * Disconnect eBay (Logout)
 */
exports.disconnectEbay = async (req, res) => {
    try {
        await deleteSettings([
            'ebay_access_token',
            'ebay_refresh_token',
            'ebay_token_expiry',
            'ebay_seller_name',
            'ebay_seller_email'
        ]);
        
        console.log('--- EBAY ACCOUNT DISCONNECTED SUCCESFULLY ---');
        res.json({ success: true, message: 'Disconnected from eBay' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to disconnect' });
    }
};

async function getValidToken() {
    try {
        let accessToken = await getSetting('ebay_access_token');
        let refreshToken = await getSetting('ebay_refresh_token');
        let expiresAt = await getSetting('ebay_token_expiry');

        if (!refreshToken) {
            console.error('--- CRITICAL: Refresh Token missing from Database ---');
            return null;
        }
        
        // If expired or about to expire in 5 mins
        if (!expiresAt || Date.now() > Number(expiresAt) - 300000) { 
            console.log('--- REFRESHING EBAY TOKEN (Session management) ---');
            try {
                const newTokenData = await ebayService.refreshUserToken(refreshToken);
                accessToken = newTokenData;
                expiresAt = Date.now() + (7200 * 1000); // Reset cooldown to 2 hours
                
                await saveSetting('ebay_access_token', accessToken);
                await saveSetting('ebay_token_expiry', expiresAt.toString());
                console.log('--- TOKEN REFRESHED SUCCESSFULLY ---');
            } catch (err) {
                console.error('--- TOKEN REFRESH FAILED. RE-LOGIN REQUIRED ---', err.message);
                return null;
            }
        }
        return accessToken;
    } catch (error) {
        console.error('Fatal Token Error:', error.message);
        return null;
    }
}

