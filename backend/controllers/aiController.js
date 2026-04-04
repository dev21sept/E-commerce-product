const { OpenAI } = require('openai');
const Product = require('../models/Product');
const ebayApiService = require('../services/ebayApiService');
const path = require('path');

// Dotenv is handled in index.js for the main app.
// Standalone scripts should load it themselves if needed.

let openai;
try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
        console.log('✅ OpenAI Client: API Key detected (length: ' + apiKey.length + ')');
    } else {
        console.warn('⚠️ OpenAI Client: OPENAI_API_KEY is missing from environment.');
    }
    
    openai = new OpenAI({
        apiKey: apiKey || 'dummy-key-to-prevent-startup-crash'
    });
} catch (error) {
    console.error('❌ OpenAI Client: Failed to initialize:', error.message);
}

exports.analyzeProductImage = async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ ERROR: OPENAI_API_KEY is missing. AI analysis will fail.');
            return res.status(500).json({ error: 'OpenAI API key is missing. Please contact administrator.' });
        }
        
        const { images, condition, gender, titleStructure, descriptionStyle, customTemplateText } = req.body;
        console.log(`Analyzing ${images ? images.length : 0} images. Condition: ${condition}, Gender: ${gender}, Title Structure: ${titleStructure ? titleStructure.join(' -> ') : 'Default'}, Styling: ${descriptionStyle || 'AI Generated'}`);

        if (!images || !Array.isArray(images) || images.length === 0) {
            console.log('Error: Empty or missing images array');
            return res.status(400).json({ error: 'No images provided for analysis.' });
        }

        const structure = (titleStructure && Array.isArray(titleStructure) && titleStructure.length > 0) 
            ? titleStructure 
            : ['Brand', 'Product Type', 'Gender / Department', 'Size', 'Color'];

        console.log(`--- Requesting AI analysis for ${images.length} product images ---`);

        // Prepare image content for OpenAI Vision
        const imageContent = images.map(img => ({
            type: "image_url",
            image_url: {
                url: img
            }
        }));

        // Description Template Logic - Use custom if provided, otherwise defaults
        let descriptionInstruction = customTemplateText ? 
            `Description - Take this custom layout and fill it with accurate product details. 
            (STRICT REQUIREMENTS:
            1. TOTAL MINIMUM LENGTH: 500 WORDS. If the provided template is short, you MUST add extra professional paragraphs at the end about 'Product Highlights', 'Style Tips', and 'Market Value Analysis' to make it a long, premium listing.
            2. FORMATTING: Wrap every label/key in <strong> tags. Use <br><br> (Double HTML Line Breaks) after EVERY SINGLE LINE or point for maximum vertical length.
            3. NO PLACEHOLDERS: Omit any line if the value is 'N/A' or unknown. DO NOT use brackets in output.
            4. Preserve the exact vertical sequence of the template provided below).
            
            CUSTOM LAYOUT TEMPLATE TO FILL AND EXPAND:
            ${customTemplateText}` :
            `Description - HIGH-CONVERSION EBAY LISTING (minimum 600 words). 
   Use a professional, structured HTML layout with <strong>bold titles</strong> and emojis. 
   STRICT REQUIREMENT: Use <br><br> (Double HTML Line Breaks) between EVERY SECTION for maximum vertical length and professional spacing.
   
   Structure:
   <strong>🔥 PRODUCT OVERVIEW</strong>: A 100-word persuasive intro about why this item is a must-have.
   <strong>✨ KEY FEATURES & BENEFITS</strong>: A detailed <ul> list with at least 8-10 points.
   <strong>📏 SPECIFICATIONS & MATERIALS</strong>: Deep dive into craftsmanship, texture, and origin.
   <strong>🛡️ CONDITION & QUALITY ASSURANCE</strong>: State condition as "${condition || 'New'}". Mention our 10-point quality check.
   <strong>🚛 SHIPPING & SERVICE</strong>: Professional trust-building blurb.
   <strong>🌟 ABOUT THE BRAND</strong>: A short paragraph about the brand's heritage.
 
   Use professional, persuasive sales language. NO symbols like **. ONLY use <strong> tags.`;

        // If no custom text was provided, we use the predefined styles if selected
        if (!customTemplateText) {
            if (descriptionStyle === 'Template 1') {
                descriptionInstruction = `Description - STAY SIMPLE BUT DETAILED (min 300 words):
       <strong>{Title}</strong><br><br>
       ${condition || 'Pre-Owned In Great Condition'}.<br><br>
       Please refer to all high-resolution photos for exact measurements and visual details.<br><br>
       <strong>Brand:</strong> {Brand}<br>
       <strong>Size:</strong> {Size}<br>
       <strong>Color:</strong> {Color}<br><br>
       <strong>Condition Note:</strong> Carefully inspected. No major flaws unless noted.<br><br>
       Sold exactly as pictured. Packaged with care for fast shipping. Thanks for looking!<br><br>
       <strong>SKU:</strong> {Extract or leave blank}`;
            } else if (descriptionStyle === 'Template 2') {
                descriptionInstruction = `Description - DETAILED & RICH (min 450 words):
       <strong>Details:-</strong><br><br>
       <strong>Brand:</strong> {Brand}<br>
       <strong>Size:</strong> {Size}<br>
       <strong>Color:</strong> {Color}<br>
       <strong>Style:</strong> {Style}<br><br>
       <strong>Keywords:</strong> {At least 20 high-value ranking keywords separated by commas}<br><br>
       <strong>Measurements (Lay Flat):</strong><br>
       <strong>Pit to pit:</strong> {Value}"<br>
       <strong>Length:</strong> {Value}"<br>
       <strong>Sleeve:</strong> {Value}"<br><br>
       <strong>Condition Report:</strong><br>
       ${condition || 'Pre Owned in great condition'}. No holes, stains or tears. High quality preservation.<br><br>
       <strong>Seller Note:</strong> We value your business. Offers are always welcome! Ships fast and packaged with professional care.`;
            } else if (descriptionStyle === 'Template 3') {
                descriptionInstruction = `Description - COMPREHENSIVE & LENGTHY (min 600 words):
       <strong>${condition || 'ITEM CONDITION: EXCELLENT / LIKE NEW'}</strong>.<br><br>
       <strong>Technical Measurements:</strong><br>
       • Pit to Pit: {Value}<br>
       • Shoulder to Shoulder: {Value}<br>
       • Total Length: {Value}<br>
       • Sleeve Length: {Value}<br><br>
       <strong>Item Specifications:</strong><br>
       - <strong>Brand:</strong> {Brand}<br>
       - <strong>Department:</strong> {Gender/Dept}<br>
       - <strong>Size/Fit:</strong> {Size} ({Size Type})<br>
       - <strong>Actual Type:</strong> {Product Type}<br>
       - <strong>Style/Aesthetic:</strong> {Style}<br>
       - <strong>Material Blend:</strong> {Material}<br>
       - <strong>Visual Pattern:</strong> {Pattern}<br>
       - <strong>Special Features:</strong> {Features}<br><br>
       <strong>Expert Analysis:</strong> {Write a 200-word paragraph about the quality and versatility of this specific item}.<br><br>
       <strong>Our Guarantee:</strong> We want you to have a perfect experience. Please examine all pictures carefully before purchasing. 100% Satisfaction intended!<br><br>
       Thank You For Shopping!`;
            }
        }

        // --- PHASE 1: CATEGORY IDENTIFICATION ---
        console.log('--- Phase 1: Identifying Category ---');
        const idResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an eBay categorization expert. Your ONLY task is to identify the accurate eBay leaf category path and numeric ID for the given product."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Identify the eBay hierarchical category path and numeric Leaf Category ID for this product. Return your response ONLY as a JSON object with 'category' and 'category_id'. Keep it accurate."
                        },
                        ...imageContent
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        const idData = JSON.parse(idResponse.choices[0].message.content);
        const categoryId = idData.category_id || idData.categoryId || '';
        const categoryPath = idData.category || '';
        console.log(`✅ Phase 1 Result: Category ID ${categoryId} (${categoryPath})`);

        // --- PHASE 2: FETCH OFFICIAL ASPECTS ---
        let officialAspects = [];
        let aspectNamesList = [];
        if (categoryId) {
            try {
                console.log(`--- Fetching official eBay aspects for Category: ${categoryId} ---`);
                const appToken = await ebayApiService.getAppToken();
                const aspectsData = await ebayApiService.getItemAspectsForCategory(appToken, categoryId);
                
                if (aspectsData && aspectsData.aspects) {
                    officialAspects = aspectsData.aspects.map(aspect => ({
                        localizedAspectName: aspect.localizedAspectName,
                        required: aspect.aspectConstraint?.aspectRequired || false,
                        usage: aspect.aspectConstraint?.aspectUsage || 'OPTIONAL',
                        dataType: aspect.aspectConstraint?.aspectDataType || 'STRING',
                        values: aspect.aspectValues ? aspect.aspectValues.map(v => v.localizedValue) : []
                    }));
                    aspectNamesList = officialAspects.map(a => a.localizedAspectName);
                    
                    // Force include Country/Region of Manufacture and Country of Origin if missing
                    const requiredFields = ['Country/Region of Manufacture', 'Country of Origin'];
                    requiredFields.forEach(field => {
                        if (!aspectNamesList.includes(field)) {
                            aspectNamesList.push(field);
                            officialAspects.push({
                                localizedAspectName: field,
                                required: false,
                                usage: 'RECOMMENDED',
                                dataType: 'STRING',
                                values: []
                            });
                        }
                    });
                    console.log(`✅ Successfully fetched ${officialAspects.length} official aspects.`);
                }
            } catch (aspectError) {
                console.error('⚠️ Could not fetch eBay official aspects:', aspectError.message);
            }
        }

        // If fetch failed, fallback to a basic list
        if (aspectNamesList.length === 0) {
            aspectNamesList = ['Brand', 'Type', 'Size', 'Color', 'Material', 'Condition', 'Country/Region of Manufacture', 'Country of Origin', 'Style', 'Pattern', 'Vintage', 'Season', 'Department', 'Theme'];
        }

        // --- PHASE 3: FULL ANALYSIS & DATA FILLING ---
        console.log('--- Phase 3: Detailed AI Analysis (Filling Official Aspects) ---');
        const mainResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a world-class eBay SEO expert. You provide high-conversion listing data by filling official eBay aspects with 100% accuracy based on visual inspection."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze these product images to generate a professional eBay listing.
                            
1. Title - SE0 Title (Max 80 chars). Structure: ${structure.join(' -> ')}.
2. ${descriptionInstruction}
3. Item Specifics - YOU MUST FILL EVERY SINGLE ONE OF THESE ${aspectNamesList.length} OFFICIAL FIELDS. 
   STRICT RULE: DO NOT SKIP ANY FIELD. If you omit even one field from the list, the system will fail. 
   FIELDS TO FILL: ${aspectNamesList.join(', ')}
   
   (STRICT REQUIREMENTS: 
   - YOUR 'item_specifics' OBJECT MUST HAVE EXACTLY ${aspectNamesList.length} KEYS.
   - If a value is unknown, use your expert product knowledge to provide the most common/standard industry value (e.g. 'Regular' for Fit, 'Standard' for Style). 
   - For Materials/Country of Origin, use high-confidence estimates based on visuals. 
   - NEVER leave a field empty or null.
   - Do NOT use brackets or 'N/A'.)

Context:
- Gender: ${gender || 'N/A'}
- Condition: ${condition || 'New'}
- Category: ${categoryPath} (ID: ${categoryId})

Format your response STRICTLY as a JSON object: {
  "title": "",
  "description": "",
  "item_specifics": { "FieldName": "Value", ... },
  "selling_price": 0.00
}`
                        },
                        ...imageContent
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        const rawAiData = JSON.parse(mainResponse.choices[0].message.content);
        
        // --- SANITIZATION STEP: Clean common AI placeholders ---
        const cleanItemSpecifics = {};
        const placeholders = ['n/a', 'unknown', 'none', 'null', '[]', '()', 'not available', 'empty'];
        
        if (rawAiData.item_specifics) {
            Object.entries(rawAiData.item_specifics).forEach(([key, val]) => {
                const lowVal = String(val).toLowerCase().trim();
                // If value is a placeholder or too short, replace with 'Standard' to avoid empty fields
                if (placeholders.includes(lowVal) || !val || val === "") {
                    cleanItemSpecifics[key] = "Standard"; 
                } else {
                    cleanItemSpecifics[key] = val;
                }
            });
        }
        
        // Ensure all fetched aspects have AT LEAST a "Standard" value if missing
        aspectNamesList.forEach(name => {
            if (!cleanItemSpecifics[name]) {
                cleanItemSpecifics[name] = "Standard";
            }
        });

        const aiData = {
            category: categoryPath,
            category_id: categoryId,
            title: rawAiData.title || '',
            description: rawAiData.description || '',
            item_specifics: cleanItemSpecifics,
            selling_price: rawAiData.selling_price || 0,
            official_aspects: officialAspects
        };

        console.log('Final AI Logic Result:', aiData);

        res.json({
            success: true,
            data: aiData
        });
    } catch (error) {
        console.error('AI Analysis Error:', error);
        res.status(500).json({ error: 'Failed to analyze images: ' + error.message });
    }
};

exports.saveAiListing = async (req, res) => {
    try {
        const listingData = req.body;
        console.log(`--- Saving AI Listing for: ${listingData.title?.substring(0, 30)} ---`);

        // IMAGE-BASED DEDUPLICATION: Search for existing product with at least one matching image
        if (listingData.images && listingData.images.length > 0) {
            const existingProduct = await Product.findOne({ 
                images: { $in: listingData.images.filter(img => img && img.length > 50) } 
            });

            if (existingProduct) {
                // If the user hasn't explicitly asked to overwrite, return conflict
                if (!req.body.overwrite) {
                    console.log(`⚠️ DUPLICATE DETECTED: Product already exists with ID: ${existingProduct._id}`);
                    return res.status(200).json({ 
                        success: false, 
                        duplicate: true, 
                        message: 'Product already exists with these images!',
                        productId: existingProduct._id,
                        existingProduct: existingProduct
                    });
                } else {
                    // Update existing instead
                    console.log(`⚡ OVERWRITING: Updating existing product ID: ${existingProduct._id}`);
                    const updated = await Product.findByIdAndUpdate(existingProduct._id, { 
                        ...listingData,
                        updated_at: new Date()
                    }, { new: true });
                    return res.json({ success: true, message: 'Existing product updated successfully!', product: updated });
                }
            }
        }

        const newProduct = new Product({
            ...listingData,
            ai_generated: true,
            source: 'ai',
            created_at: new Date(),
            updated_at: new Date()
        });

        await newProduct.save();
        console.log('✅ Listing saved to MongoDB successfully!');
        res.json({ success: true, message: 'Listing saved to MongoDB', product: newProduct });
    } catch (error) {
        console.error('❌ MONGODB SAVE ERROR:', error);
        res.status(500).json({
            error: 'Failed to save listing: ' + error.message,
            details: error.name === 'ValidationError' ? error.errors : null
        });
    }
};
