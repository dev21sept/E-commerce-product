const ebayService = require('../services/ebayApiService');
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const axios = require('axios');

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
        // Detect and Upload Base64 images to eBay EPS if necessary
        const processedImages = [];
        let firstUploadError = null;
        console.log(`[EPS DEBUG] Starting image processing for ${imageList.length} total images.`);

        for (let i = 0; i < imageList.length; i++) {
            const rawImg = imageList[i];
            const img = typeof rawImg === 'string' ? rawImg.trim() : '';
            const isUrl = /^https?:\/\//i.test(img);
            const isDataUri = /^data:image\/[a-z0-9.+-]+;base64,/i.test(img);
            const looksLikeRawBase64 =
                !isUrl &&
                !isDataUri &&
                img.length > 2000 &&
                /^[a-z0-9+/=\r\n]+$/i.test(img);
            const isBase64 = isDataUri || looksLikeRawBase64;

            if (isUrl) {
                try {
                    let sourceHost = 'invalid-url';
                    try { sourceHost = new URL(img).host; } catch (_) {}
                    console.log(`[MEDIA DEBUG] Image ${i + 1}: Source URL -> ${img}`);
                    console.log(`[MEDIA DEBUG] Image ${i + 1}: Source Host -> ${sourceHost}`);
                    console.log(`[MEDIA DEBUG] Image ${i + 1}: Uploading URL to eBay Media API...`);
                    const mediaUrl = await ebayService.createImageFromUrl(token, img);
                    console.log(`[MEDIA DEBUG] Image ${i + 1}: Media API Success -> ${mediaUrl.substring(0, 50)}...`);
                    processedImages.push(mediaUrl);
                    continue;
                } catch (mediaErr) {
                    console.warn(`[MEDIA DEBUG] Image ${i + 1}: Media API failed. Falling back to EPS flow. Reason: ${mediaErr.message}`);
                }

                // EPS fallback path for URL images
                if (img.length > 450) {
                    try {
                        console.log(`[EPS DEBUG] Image ${i + 1}: URL too long (${img.length} chars). Trying EPS ExternalPictureURL...`);
                        const ebayUrl = await ebayService.uploadPictureFromUrl(token, img);
                        console.log(`[EPS DEBUG] Image ${i + 1}: External URL EPS Upload Success -> ${ebayUrl.substring(0, 50)}...`);
                        processedImages.push(ebayUrl);
                    } catch (e) {
                        console.warn(`[EPS DEBUG] Image ${i + 1}: External URL EPS upload failed. Falling back to binary upload. Reason: ${e.message}`);
                        try {
                            const response = await axios.get(img, {
                                responseType: 'arraybuffer',
                                timeout: 20000,
                                maxRedirects: 5,
                                headers: { 'User-Agent': 'Mozilla/5.0' }
                            });
                            const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
                            if (contentType && !contentType.startsWith('image/')) {
                                throw new Error(`Source URL content-type is not image: ${contentType}`);
                            }
                            const base64 = Buffer.from(response.data).toString('base64');
                            const detectedMime = contentType.split(';')[0] || 'image/jpeg';
                            const fallbackUrl = await ebayService.uploadPicture(token, `data:${detectedMime};base64,${base64}`);
                            console.log(`[EPS DEBUG] Image ${i + 1}: Binary fallback EPS Upload Success -> ${fallbackUrl.substring(0, 50)}...`);
                            processedImages.push(fallbackUrl);
                        } catch (fallbackErr) {
                            console.error(`[EPS DEBUG] Image ${i + 1}: URL binary fallback FAILED:`, fallbackErr.message);
                            if (!firstUploadError) firstUploadError = fallbackErr.message;
                        }
                    }
                } else {
                    try {
                        console.log(`[EPS DEBUG] Image ${i + 1}: Short URL fallback via EPS ExternalPictureURL...`);
                        const ebayUrl = await ebayService.uploadPictureFromUrl(token, img);
                        console.log(`[EPS DEBUG] Image ${i + 1}: Short URL EPS Upload Success -> ${ebayUrl.substring(0, 50)}...`);
                        processedImages.push(ebayUrl);
                    } catch (epsErr) {
                        console.error(`[EPS DEBUG] Image ${i + 1}: Short URL EPS upload FAILED:`, epsErr.message);
                        // Keep original short URL as last fallback.
                        processedImages.push(img);
                    }
                }
            } else if (isBase64) {
                try {
                    console.log(`[EPS DEBUG] Image ${i + 1}: Uploading Base64 image to eBay EPS...`);
                    const ebayUrl = await ebayService.uploadPicture(token, img);
                    console.log(`[EPS DEBUG] Image ${i + 1}: EPS Upload Success -> ${ebayUrl.substring(0, 50)}...`);
                    processedImages.push(ebayUrl);
                } catch (e) {
                    const errMsg = e.response?.data || e.message;
                    console.error(`[EPS DEBUG] Image ${i + 1}: EPS Upload FAILED:`, errMsg);
                    if (!firstUploadError) firstUploadError = errMsg;
                }
            } else {
                console.warn(`[EPS DEBUG] Image ${i + 1}: Skipped (Invalid format or too short)`);
            }
        }

        // Filter out invalid/local URLs that eBay API will reject
        const validImages = processedImages
            .filter(url => url && (url.startsWith('http://') || url.startsWith('https://')))
            .filter(url => !url.includes('localhost') && !url.includes('127.0.0.1'))
            .slice(0, 12);

        console.log(`[EPS DEBUG] Final count of valid images for eBay: ${validImages.length}`);

        if (validImages.length === 0 && imageList.length > 0) {
            console.error(`[EPS ERROR] All ${imageList.length} images failed to process.`);
            // If all images fail, we can try to proceed with NO photos if eBay allows (usually doesn't)
            // But let's throw a clear error for now
            const extraDetails = typeof firstUploadError === 'string' ? firstUploadError : JSON.stringify(firstUploadError);
            throw new Error(`All photos failed to upload to eBay. Primary Error: ${extraDetails.substring(0, 200)}`);
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

        // Map Condition (Standard eBay API Strings)
        const cond = (product.condition_name || "").toLowerCase();
        if (cond.includes('new')) {
            inventoryItem.condition = 'NEW';
        } else if (cond.includes('refurbished')) {
            inventoryItem.condition = 'LIKE_NEW';
        } else if (cond.includes('used') || cond.includes('pre-owned') || cond.includes('very good') || cond.includes('good') || cond.includes('excellent')) {
            inventoryItem.condition = 'USED_EXCELLENT';
        } else if (cond.includes('parts') || cond.includes('not working')) {
            inventoryItem.condition = 'FOR_PARTS_OR_NOT_WORKING';
        } else {
            inventoryItem.condition = 'NEW'; // Default fallback
        }

        // Map Item Specifics
        if (product.item_specifics) {
            const specs = typeof product.item_specifics === 'string' ? JSON.parse(product.item_specifics) : product.item_specifics;
            Object.entries(specs).forEach(([k, v]) => {
                // eBay REST API does not allow dots (.) or special chars in aspect names
                const cleanKey = k.replace(/[^\w\s]/gi, '').trim();
                const cleanVal = Array.isArray(v) ? v[0] : String(v);

                if (cleanKey && cleanVal && cleanVal.trim() !== "") {
                    inventoryItem.product.aspects[cleanKey] = [cleanVal.trim().substring(0, 50)];
                }
            });
        }

        console.log(`[DEBUG] Final Inventory Item Payload:`, JSON.stringify(inventoryItem, null, 2));
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
            categoryId: product.categoryId || product.category_id || '171228',
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

        console.log(`[DEBUG] Final Offer Payload:`, JSON.stringify(offer, null, 2));
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

        const isSandbox = process.env.EBAY_ENVIRONMENT === 'sandbox';
        const ebayDomain = isSandbox ? 'sandbox.ebay.com' : 'ebay.com';

        console.log(`✅ [SUCCESS] Product ${productId} listed as ${publishResponse.listingId}`);

        res.json({
            success: true,
            message: 'SUCCESS! Listed on eBay!',
            sku,
            listingId: publishResponse.listingId,
            ebayUrl: `https://www.${ebayDomain}/itm/${publishResponse.listingId}`
        });

    } catch (error) {
        console.error('--- EBAY LISTING ERROR ---');
        const ebayError = error.response?.data?.errors?.[0];
        const fullError = JSON.stringify(error.response?.data || error.message);
        console.error('Full Error Details:', fullError);

        // 🚨 HANDLE BUSINESS POLICY ELIGIBILITY (Error 20403)
        if (ebayError?.errorId === 20403 || fullError.includes("not eligible for Business Policy")) {
            return res.status(403).json({
                error: 'Business Policies Not Activated',
                details: 'Apne eBay Sandbox account mein Business Policies "Opt-in" karein.',
                instruction: 'Niche diye gaye link par jaakar "Get Started" par click karein:',
                link: 'https://www.bizpolicy.sandbox.ebay.com/businesspolicy/policyoptin',
                nextSteps: 'Activate karne ke baad, fir se "List on eBay" try karein.'
            });
        }

        res.status(500).json({
            error: 'Listing failed',
            details: ebayError?.message || error.message,
            fullError: fullError // Adding this to help debug cryptic errors like "Invalid ."
        });
    }
};
