const crypto = require('crypto');
const ebayService = require('../services/ebayApiService');
const Product = require('../models/Product');
const Setting = require('../models/Setting');

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
        const ebayError = error.response?.data;
        const errorMsg = ebayError?.error_description || ebayError?.error || error.message;
        res.status(500).send(`Authentication failed: ${errorMsg}. Please check your credentials and RuName.`);
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

