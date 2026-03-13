const axios = require('axios');
const qs = require('qs');

const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID;
const EBAY_ENVIRONMENT = process.env.EBAY_ENVIRONMENT || 'sandbox';

const API_BASE_URL = EBAY_ENVIRONMENT === 'sandbox' 
    ? 'https://api.sandbox.ebay.com' 
    : 'https://api.ebay.com';

const AUTH_BASE_URL = EBAY_ENVIRONMENT === 'sandbox'
    ? 'https://auth.sandbox.ebay.com'
    : 'https://auth.ebay.com';

/**
 * Gets an App-Only Access Token (Client Credentials Grant)
 * Useful for public data like finding items.
 */
async function getAppToken() {
    const authHeader = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/identity/v1/oauth2/token`, 
            qs.stringify({
                grant_type: 'client_credentials',
                scope: 'https://api.ebay.com/oauth/api_scope'
            }), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${authHeader}`
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting eBay App Token:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Generates the User Consent URL
 */
function getUserConsentUrl(ruName, state = 'dashboard') {
    const scope = [
        'https://api.ebay.com/oauth/api_scope',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.marketing',
        'https://api.ebay.com/oauth/api_scope/sell.account',
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
    ].join(' ');

    return `${AUTH_BASE_URL}/oauth2/authorize?client_id=${EBAY_APP_ID}&response_type=code&redirect_uri=${ruName}&scope=${encodeURIComponent(scope)}&state=${state}`;
}

/**
 * Exchanges Auth Code for User Access Token
 */
async function getUserToken(code, ruName) {
    const authHeader = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64');

    try {
        const response = await axios.post(`${API_BASE_URL}/identity/v1/oauth2/token`,
            qs.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: ruName
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${authHeader}`
                }
            }
        );
        return response.data; // Includes access_token and refresh_token
    } catch (error) {
        console.error('Error getting User Token:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Refreshes an expired User Access Token
 */
async function refreshUserToken(refreshToken) {
    const authHeader = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64');

    try {
        const response = await axios.post(`${API_BASE_URL}/identity/v1/oauth2/token`,
            qs.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${authHeader}`
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        throw error;
    }
}
/**
 * Step 1: Create or Replace Inventory Item
 */
async function createOrReplaceInventoryItem(token, sku, productData) {
    try {
        const response = await axios.put(`${API_BASE_URL}/sell/inventory/v1/inventory_item/${sku}`, productData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Language': 'en-US',
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error creating inventory item ${sku}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Step 2: Create Offer
 */
async function createOffer(token, offerData) {
    try {
        const response = await axios.post(`${API_BASE_URL}/sell/inventory/v1/offer`, offerData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Language': 'en-US',
                'Content-Type': 'application/json'
            }
        });
        return response.data; // Includes offerId
    } catch (error) {
        console.error('Error creating offer:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Step 3: Publish Offer
 */
async function publishOffer(token, offerId) {
    try {
        const response = await axios.post(`${API_BASE_URL}/sell/inventory/v1/offer/${offerId}/publish`, {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data; // Includes listingId
    } catch (error) {
        console.error(`Error publishing offer ${offerId}:`, error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    getAppToken,
    getUserConsentUrl,
    getUserToken,
    refreshUserToken,
    createOrReplaceInventoryItem,
    createOffer,
    publishOffer
};
