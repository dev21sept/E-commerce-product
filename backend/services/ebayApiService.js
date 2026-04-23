const axios = require('axios');
const qs = require('qs');

const EBAY_APP_ID = process.env.EBAY_APP_ID;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID;
const EBAY_DEV_ID = process.env.EBAY_DEV_ID;
const EBAY_ENVIRONMENT = process.env.EBAY_ENVIRONMENT || 'sandbox';

const API_BASE_URL = EBAY_ENVIRONMENT === 'sandbox' 
    ? 'https://api.sandbox.ebay.com' 
    : 'https://api.ebay.com';

const TRADING_API_URL = EBAY_ENVIRONMENT === 'sandbox'
    ? 'https://api.sandbox.ebay.com/ws/api.dll'
    : 'https://api.ebay.com/ws/api.dll';

const AUTH_BASE_URL = EBAY_ENVIRONMENT === 'sandbox'
    ? 'https://auth.sandbox.ebay.com'
    : 'https://auth.ebay.com';

let cachedAppToken = null;
let appTokenExpiry = null;

/**
 * Gets an App-Only Access Token (Client Credentials Grant)
 * Uses caching to prevent rate-limiting and 'invalid_client' errors on high frequency calls.
 */
async function getAppToken() {
    if (cachedAppToken && appTokenExpiry && Date.now() < appTokenExpiry) {
        return cachedAppToken;
    }

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
        
        cachedAppToken = response.data.access_token;
        // eBay tokens are usually valid for 7200 seconds (2 hours), cache for 1 hour (3600000 ms) to be safe
        appTokenExpiry = Date.now() + 3600000; 
        
        return cachedAppToken;
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
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
        'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
        'https://api.ebay.com/oauth/api_scope/commerce.identity.address.readonly',
        'https://api.ebay.com/oauth/api_scope/commerce.identity.email.readonly'
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

    const scope = [
        'https://api.ebay.com/oauth/api_scope',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.marketing',
        'https://api.ebay.com/oauth/api_scope/sell.account',
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
    ].join(' ');

    try {
        const response = await axios.post(`${API_BASE_URL}/identity/v1/oauth2/token`,
            qs.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                scope: scope
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
        // Return the error data so the controller can handle "Offer already exists"
        throw error;
    }
}

/**
 * Gets all offers for a specific SKU
 */
async function getOffers(token, sku) {
    try {
        const response = await axios.get(`${API_BASE_URL}/sell/inventory/v1/offer?sku=${sku}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Language': 'en-US'
            }
        });
        return response.data.offers || [];
    } catch (error) {
        console.error(`Error fetching offers for SKU ${sku}:`, error.response?.data || error.message);
        return [];
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

/**
 * Step 4: Create or Update Location
 */
async function createOrUpdateLocation(token, locationKey, locationData) {
    try {
        const response = await axios.post(`${API_BASE_URL}/sell/inventory/v1/location/${locationKey}`, locationData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Language': 'en-US'
            }
        });
        return response.data;
    } catch (error) {
        const ebayError = error.response?.data?.errors?.[0];
        const errorMsg = ebayError?.message || error.message || "";
        // Error 25002 or message contains "already exists"
        if (ebayError?.errorId === 25002 || errorMsg.toLowerCase().includes("already exists")) {
            console.log(`Location ${locationKey} already exists, skipping creation.`);
            return { message: 'Location already exists' };
        }
        console.error(`Error with location ${locationKey}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Get Business Policies (Needed for Offers)
 */
async function getFulfillmentPolicies(token, marketplaceId = 'EBAY_US') {
    const response = await axios.get(`${API_BASE_URL}/sell/account/v1/fulfillment_policy?marketplace_id=${marketplaceId}`, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Language': 'en-US'
        }
    });
    return response.data.fulfillmentPolicies || [];
}

async function getPaymentPolicies(token, marketplaceId = 'EBAY_US') {
    const response = await axios.get(`${API_BASE_URL}/sell/account/v1/payment_policy?marketplace_id=${marketplaceId}`, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Language': 'en-US'
        }
    });
    return response.data.paymentPolicies || [];
}

async function getReturnPolicies(token, marketplaceId = 'EBAY_US') {
    const response = await axios.get(`${API_BASE_URL}/sell/account/v1/return_policy?marketplace_id=${marketplaceId}`, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Language': 'en-US'
        }
    });
    return response.data.returnPolicies || [];
}

async function initDefaultFulfillmentPolicy(token) {
    const policy = {
        name: 'Automation_Ship_' + Date.now(),
        description: 'Automated shipping policy for US Sandbox',
        marketplaceId: 'EBAY_US',
        categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS_VEHICLES' }],
        handlingTime: { value: 1, unit: 'DAY' },
        shippingOptions: [{
            optionType: 'DOMESTIC',
            costType: 'FLAT_RATE',
            shippingServices: [{
                shippingServiceCode: 'USPSPriority', // Most stable code for US Sandbox
                shippingCost: { value: '0.00', currency: 'USD' }
            }]
        }],
        shipToLocations: {
            regionIncluded: [{ regionName: 'US' }]
        }
    };
    const res = await axios.post(`${API_BASE_URL}/sell/account/v1/fulfillment_policy`, policy, {
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json',
            'Content-Language': 'en-US'
        }
    });
    return res.data;
}

async function initDefaultPaymentPolicy(token) {
    const policy = {
        name: 'Automation_Pay_' + Date.now(),
        description: 'Automated payment policy',
        marketplaceId: 'EBAY_US',
        categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS_VEHICLES' }],
        paymentMethods: [{ paymentMethodType: 'INTEGRATED_MERCHANT_PAYMENTS' }]
    };
    const res = await axios.post(`${API_BASE_URL}/sell/account/v1/payment_policy`, policy, {
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json',
            'Content-Language': 'en-US'
        }
    });
    return res.data;
}

async function initDefaultReturnPolicy(token) {
    const policy = {
        name: 'Automation_Ret_' + Date.now(),
        description: 'Automated return policy',
        marketplaceId: 'EBAY_US',
        categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS_VEHICLES' }],
        returnsAccepted: true,
        returnPeriod: { value: 30, unit: 'DAY' },
        returnShippingCostPayer: 'BUYER'
    };
    const res = await axios.post(`${API_BASE_URL}/sell/account/v1/return_policy`, policy, {
        headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json',
            'Content-Language': 'en-US'
        }
    });
    return res.data;
}

/**
 * Gets Item Aspects for a specific Category from Taxonomy API
 */
/**
 * Gets category suggestions for a keyword from Taxonomy API
 */
async function getCategorySuggestions(token, query, categoryTreeId = '0') {
    try {
        const response = await axios.get(`${API_BASE_URL}/commerce/taxonomy/v1/category_tree/${categoryTreeId}/get_category_suggestions?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data.categorySuggestions || [];
    } catch (error) {
        console.error(`Error getting category suggestions for ${query}:`, error.response?.data || error.message);
        return [];
    }
}

async function getItemAspectsForCategory(token, categoryId, categoryTreeId = '0') {
    try {
        const response = await axios.get(`${API_BASE_URL}/commerce/taxonomy/v1/category_tree/${categoryTreeId}/get_item_aspects_for_category?category_id=${categoryId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error getting item aspects for category ${categoryId}:`, error.response?.data || error.message);
        // Return null or empty instead of throwing to prevent breaking the flow
        return null;
    }
}

/**
 * Gets valid Item Conditions for a specific Category from Taxonomy API
 */
async function getItemConditions(token, categoryId, categoryTreeId = '0') {
    try {
        const response = await axios.get(`${API_BASE_URL}/commerce/taxonomy/v1/category_tree/${categoryTreeId}/get_item_conditions?category_id=${categoryId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data.itemConditions || [];
    } catch (error) {
        console.error(`Error getting item conditions for category ${categoryId}:`, error.response?.data || error.message);
        return [];
    }
}

/**
 * Uploads a picture to eBay Picture Services (EPS)
 * This allows using local Base64 images with the REST Inventory API.
 */
async function uploadPicture(userToken, base64Data) {
    try {
        // Remove all variations of data:image prefix
        let cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
        // Remove any remaining whitespace, newlines, or carriage returns to prevent XML corruption
        cleanBase64 = cleanBase64.replace(/[\r\n\t\s]+/g, "");
        
        console.log(`[EPS] Prepared Base64 size: ${cleanBase64.length} chars (approx ${Math.round((cleanBase64.length * 3) / 4 / 1024)} KB)`);

        const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<UploadSiteHostedPicturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${userToken}</eBayAuthToken>
  </RequesterCredentials>
  <PictureData>${cleanBase64}</PictureData>
  <PictureSet>Standard</PictureSet>
</UploadSiteHostedPicturesRequest>`;

        const response = await axios.post(TRADING_API_URL, xmlPayload, {
            headers: {
                'X-EBAY-API-CALL-NAME': 'UploadSiteHostedPictures',
                'X-EBAY-API-SITEID': '0',
                'X-EBAY-API-APP-NAME': EBAY_APP_ID,
                'X-EBAY-API-DEV-NAME': EBAY_DEV_ID,
                'X-EBAY-API-CERT-NAME': EBAY_CERT_ID,
                'X-EBAY-API-COMPATIBILITY-LEVEL': '1113',
                'Content-Type': 'text/xml'
            }
        });

        // Check for Error in XML Response
        if (response.data.includes('<Ack>Failure</Ack>') || response.data.includes('<Ack>Error</Ack>')) {
            const errorMatch = response.data.match(/<LongMessage>(.*?)<\/LongMessage>/) || response.data.match(/<ShortMessage>(.*?)<\/ShortMessage>/);
            const ebayError = errorMatch ? errorMatch[1] : `Unknown eBay Error. Raw: ${response.data.substring(0, 200)}`;
            throw new Error(`eBay EPS Error: ${ebayError}`);
        }

        // Simple regex to extract the URL from the XML response
        const match = response.data.match(/<SiteHostedPictureDetails>[\s\S]*?<FullURL>(.*?)<\/FullURL>/);
        if (match && match[1]) {
            return match[1];
        } else {
            console.error("EPS Upload Response:", response.data);
            throw new Error(`Failed to extract image URL. Response start: ${response.data.substring(0, 150)}`);
        }
    } catch (error) {
        console.error('Error uploading to eBay EPS:', error.message);
        throw error;
    }
}

/**
 * Gets orders for the authenticated user from Fulfillment API
 * Filters: default is last 30 days, PAID status
 */
async function getOrders(token) {
    try {
        const response = await axios.get(`${API_BASE_URL}/sell/fulfillment/v1/order`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data; // { orders: [], total: X, ... }
    } catch (error) {
        console.error('Error fetching eBay orders:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Updates an order with tracking information
 * trackingData: { trackingNumber: string, shippingCarrierCode: string, lineItems: [{ lineItemId: string, quantity: number }] }
 */
async function updateShippingFulfillment(token, orderId, trackingData) {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`,
            trackingData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Error updating tracking for order ${orderId}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Gets inventory items for the authenticated user
 * Supports pagination via limit and offset
 */
async function getInventoryItems(token, limit = 100, offset = 0) {
    try {
        const response = await axios.get(`${API_BASE_URL}/sell/inventory/v1/inventory_item?limit=${limit}&offset=${offset}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data; // { inventoryItems: [], total: X, ... }
    } catch (error) {
        console.error('Error fetching eBay inventory items:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Gets the Authenticated User's Profile (Username/ID)
 */
async function getUserProfile(token) {
    try {
        const baseUrl = EBAY_ENVIRONMENT === 'sandbox' ? 'https://apiz.sandbox.ebay.com' : 'https://apiz.ebay.com';
        const response = await axios.get(`${baseUrl}/commerce/identity/v1/user/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching User Profile:', error.response?.data || error.message);
        // Fallback or re-throw
        return null;
    }
}

/**
 * Fetches valid conditions for a specific eBay category
 */
async function getCategoryConditions(token, categoryId) {
    try {
        console.log(`[EBAY API] Fetching conditions via Taxonomy API for category: ${categoryId}`);
        
        // 1. First try the dedicated Taxonomy Conditions endpoint (Deepak's preference)
        const conditions = await getItemConditions(token, categoryId);
        
        if (conditions && conditions.length > 0) {
            console.log(`[EBAY] Found ${conditions.length} conditions via Taxonomy Conditions API.`);
            return conditions.map(c => ({
                condition_id: c.conditionId,
                condition_name: c.conditionDisplayName,
                label: c.conditionDisplayName,
                id: c.conditionId, // Use the real eBay ConditionID
                name: c.conditionDisplayName
            }));
        }

        // 2. Fallback to Aspects if the direct endpoint returns nothing (unlikely for leaf categories)
        console.log(`[EBAY] No conditions from primary endpoint, falling back to Aspects for: ${categoryId}`);
        const aspectsData = await getItemAspectsForCategory(token, categoryId);
        
        if (aspectsData && aspectsData.aspects) {
            const conditionAspect = aspectsData.aspects.find(a => 
                a.localizedAspectName.toLowerCase().includes('condition')
            );

            if (conditionAspect && conditionAspect.aspectValues) {
                console.log(`[EBAY] Extracted ${conditionAspect.aspectValues.length} condition values from Aspects.`);
                return conditionAspect.aspectValues.map(v => ({
                    condition_id: v.localizedValue, // Fallback ID if real ID isn't found
                    condition_name: v.localizedValue,
                    label: v.localizedValue,
                    id: v.localizedValue, 
                    name: v.localizedValue
                }));
            }
        }
        
        console.warn(`[EBAY] No condition information found for category ${categoryId}`);
        return [];
    } catch (error) {
        console.error('Error fetching category conditions:', error.response?.data || error.message);
        return [];
    }
}

module.exports = {
    getAppToken,
    getUserConsentUrl,
    getUserToken,
    refreshUserToken,
    uploadPicture,
    createOrReplaceInventoryItem,
    createOffer,
    publishOffer,
    createOrUpdateLocation,
    getFulfillmentPolicies,
    getPaymentPolicies,
    getReturnPolicies,
    initDefaultFulfillmentPolicy,
    initDefaultPaymentPolicy,
    initDefaultReturnPolicy,
    getItemAspectsForCategory,
    getItemConditions,
    getCategorySuggestions,
    getOffers,
    getOrders,
    getInventoryItems,
    getCategoryConditions,
    updateShippingFulfillment,
    getUserProfile
};

