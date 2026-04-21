const ebayService = require('../services/ebayApiService');
const Setting = require('../models/Setting');
const Order = require('../models/Order');

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

async function getValidToken() {
    try {
        let accessToken = await getSetting('ebay_access_token');
        let refreshToken = await getSetting('ebay_refresh_token');
        let expiresAt = await getSetting('ebay_token_expiry');

        if (!refreshToken) {
            return null;
        }
        
        // Refresh 1 minute before expiry
        if (!expiresAt || Date.now() > Number(expiresAt) - 60000) { 
            const newTokenData = await ebayService.refreshUserToken(refreshToken);
            accessToken = newTokenData;
            expiresAt = Date.now() + (7200 * 1000); 
            
            await saveSetting('ebay_access_token', accessToken);
            await saveSetting('ebay_token_expiry', expiresAt.toString());
        }
        return accessToken;
    } catch (error) {
        console.error('Token Retrieval Error:', error.message);
        return null;
    }
}

/**
 * Fetch all orders from Database (Synced from eBay)
 */
exports.getOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdDate: -1 });
        res.json({ orders, total: orders.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders from database', details: error.message });
    }
};



/**
 * Update tracking information for an order
 */
exports.updateTracking = async (req, res) => {
    const { orderId } = req.params;
    const { trackingNumber, shippingCarrierCode } = req.body;

    if (!trackingNumber || !shippingCarrierCode) {
        return res.status(400).json({ error: 'Tracking number and carrier code are required' });
    }

    try {
        const token = await getValidToken();
        if (!token) return res.status(401).json({ error: 'eBay not connected' });

        const result = await ebayService.updateShippingFulfillment(token, orderId, {
            trackingNumber,
            shippingCarrierCode
        });

        res.json({ success: true, message: 'Tracking updated successfully', result });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update tracking', details: error.message });
    }
};
