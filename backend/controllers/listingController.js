const ebayService = require('../services/ebayApiService');
const Product = require('../models/Product');
const Setting = require('../models/Setting');

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
        
        // Refresh 1 minute before expiry
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

/**
 * Lists a product directly on eBay using the Inventory API
 */
exports.listOnEbay = async (req, res) => {
    const { productId } = req.params;
    console.log(`\n--- [DIRECT LISTING] Starting for Product ${productId} ---`);
    
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

        // FORCE UNIQUE SKU for every attempt to ensure fresh data on eBay
        const timestamp = Date.now().toString().substring(8);
        const sku = (product.sku || `SKU-${product._id.toString().substring(18)}`) + "-" + timestamp;
        const imageList = product.images || [];

        // 1. Prepare Inventory Item
        // ... (Image processing logic remains same but logs more)
        // Detect and Upload Base64 images to eBay EPS if necessary
        const processedImages = [];
        console.log(`[EPS DEBUG] Starting image processing for ${imageList.length} total images.`);

        for (let i = 0; i < imageList.length; i++) {
            const img = imageList[i];
            const isBase64 = img?.startsWith('data:image') || img?.length > 2000;
            const isUrl = img?.startsWith('http');

            if (isBase64) {
                try {
                    console.log(`[EPS DEBUG] Image ${i+1}: Uploading Base64 image to eBay EPS...`);
                    const ebayUrl = await ebayService.uploadPicture(token, img);
                    console.log(`[EPS DEBUG] Image ${i+1}: EPS Upload Success -> ${ebayUrl.substring(0, 50)}...`);
                    processedImages.push(ebayUrl);
                } catch (e) {
                    console.error(`[EPS DEBUG] Image ${i+1}: EPS Upload FAILED:`, e.message);
                }
            } else if (isUrl) {
                console.log(`[EPS DEBUG] Image ${i+1}: Already a URL, keeping: ${img.substring(0, 50)}...`);
                processedImages.push(img);
            } else {
                console.warn(`[EPS DEBUG] Image ${i+1}: Skipped (Invalid format or too short)`);
            }
        }

        // Filter out invalid/local URLs that eBay API will reject
        const validImages = processedImages
            .filter(url => url && (url.startsWith('http://') || url.startsWith('https://')))
            .filter(url => !url.includes('localhost') && !url.includes('127.0.0.1'))
            .slice(0, 12);

        console.log(`[EPS DEBUG] Final count of valid images for eBay: ${validImages.length}`);

        if (validImages.length === 0 && imageList.length > 0) {
            throw new Error("Photos processing failed: No valid public URLs were generated. Ensure photos are uploaded or are valid links.");
        }

        const inventoryItem = {
            availability: { shipToLocationAvailability: { quantity: 1 } },
            condition: 'NEW', // Default, should map from condition_name
            product: {
                title: product.title.substring(0, 80),
                description: (product.description || product.title).substring(0, 4000),
                aspects: {
                    Brand: [product.brand || 'Unbranded'],
                }
            }
        };

        // Only add imageUrls if we actually have public URLs
        if (validImages.length > 0) {
            inventoryItem.product.imageUrls = validImages;
        }

        console.log(`[PAYLOAD DEBUG] Inventory Item for SKU ${sku}:`, JSON.stringify(inventoryItem, null, 2));

        // Map Condition
        const cond = (product.condition_name || "").toLowerCase();
        if (cond.includes('new')) inventoryItem.condition = 'NEW';
        else if (cond.includes('used') || cond.includes('pre-owned')) inventoryItem.condition = 'USED_EXCELLENT';

        // Map Item Specifics
        if (product.item_specifics) {
            const specs = typeof product.item_specifics === 'string' ? JSON.parse(product.item_specifics) : product.item_specifics;
            Object.entries(specs).forEach(([k, v]) => {
                if (v) inventoryItem.product.aspects[k] = [Array.isArray(v) ? v[0] : String(v)];
            });
        }

        console.log('Step 1: Creating/Updating Inventory Item...');
        await ebayService.createOrReplaceInventoryItem(token, sku, inventoryItem);

        // 2. Ensure Location exists
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
                name: 'Main Store',
                merchantLocationStatus: 'ENABLED',
                locationTypes: ['STORE']
            };
            await ebayService.createOrUpdateLocation(token, locationKey, locationInfo);
        } catch (locationErr) {
            // Ignore "already exists" errors
        }

        // 3. Get Business Policies
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
                // Initialize defaults for Sandbox
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
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // 4. Create Offer
        const offer = {
            sku: sku,
            marketplaceId: 'EBAY_US',
            format: 'FIXED_PRICE',
            availableQuantity: 1,
            categoryId: product.categoryId || product.category_id || '31387', 
            listingDescription: (product.description || product.title),
            pricingSummary: {
                price: {
                    currency: 'USD',
                    value: String(product.selling_price || '10.00')
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
        let offerId;
        try {
            const offerResponse = await ebayService.createOffer(token, offer);
            offerId = offerResponse.offerId;
        } catch (error) {
            const ebayError = error.response?.data?.errors?.[0];
            if (ebayError?.errorId === 25001 || ebayError?.message?.includes('already exists')) {
                console.log(`[RECOVERY] Offer already exists for ${sku}. Fetching existing...`);
                const existingOffers = await ebayService.getOffers(token, sku);
                if (existingOffers.length > 0) {
                    offerId = existingOffers[0].offerId;
                    console.log(`[RECOVERY] Found existing Offer ID: ${offerId}`);
                } else {
                    throw error; // Re-throw if we can't find it
                }
            } else {
                throw error;
            }
        }

        // 5. Publish Offer (Skip if draft)
        const isDraft = req.query.draft === 'true';
        if (isDraft) {
            console.log(`✅ [SUCCESS] Product ${productId} saved as DRAFT (Offer ID: ${offerId})`);
            return res.json({ 
                success: true,
                message: 'SUCCESS! Saved as Draft on eBay!', 
                sku, 
                offerId,
                status: 'DRAFT'
            });
        }

        console.log('Step 3: Publishing Offer...');
        const publishResponse = await ebayService.publishOffer(token, offerId);
        
        console.log(`✅ [SUCCESS] Product ${productId} listed as ${publishResponse.listingId}`);
        
        res.json({ 
            success: true,
            message: 'SUCCESS! Listed on eBay!', 
            sku, 
            listingId: publishResponse.listingId,
            ebayUrl: `https://www.sandbox.ebay.com/itm/${publishResponse.listingId}`
        });

    } catch (error) {
        console.error('--- EBAY LISTING ERROR ---');
        const ebayError = error.response?.data?.errors?.[0];
        console.error('Details:', ebayError || error.message);
        
        res.status(500).json({ 
            error: 'Listing failed', 
            details: ebayError?.message || error.message
        });
    }
};
