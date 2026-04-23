const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ebayApiService = require('../services/ebayApiService');
const { wrapInTemplate } = require('../services/descriptionService');
const Product = require('../models/Product');

exports.analyzeProductImage = async (req, res) => {
    console.log(`\n--- [AI STUDIO] New Analysis Request Received ---`);
    try {
        const {
            images,
            platform = 'ebay',
            structure = ['Brand', 'Product Type', 'Model / Series', 'Material', 'Key Features', 'Size'],
            descriptionStyle = 'AI Generated',
            customTemplateText = '',
            gender = 'Unisex',
            condition = 'New'
        } = req.body;
        console.log(`Platform: ${platform}, Images: ${images?.length || 0}`);

        if (!images || images.length === 0) {
            return res.status(400).json({ error: "No images provided for analysis." });
        }

        const imageContent = images.map(url => ({
            type: "image_url",
            image_url: { url: url.startsWith('data:') ? url : url }
        }));

        let descriptionInstruction = '';
        if (customTemplateText && customTemplateText.trim() !== '') {
            descriptionInstruction = `Description - STRICTLY FOLLOW THE USER'S CUSTOM INSTRUCTION/TEMPLATE:
            "${customTemplateText}"
            
            (STRICT: If the instruction contains placeholders like {Brand}, {Size}, {Material}, {Type}, etc., replace them with data from the images. 
             SMART ADAPTATION: If the user provides a fixed template (e.g., mentioning "Jeans") but the image clearly shows something else (e.g., a "T-Shirt"), adapt the template intelligently to match the physical product while maintaining the user's requested tone and structure. 
             If it is a general prompt like "Summarize in 2 sentences", follow it EXACTLY. 
             Do NOT use any other default structures. Format with HTML tags like <b> and <br> for spacing.)`;
        } else if (descriptionStyle === 'AI Generated') {
            descriptionInstruction = `Description - HIGH-CONVERSION & PERSUASIVE (min 300 words):
        - Use HTML <b> for section headers.
        - Use HTML <br><br> for spacing.
        - Analyze the item to write a detailed, professional summary. Include:
        - 1. Hook: <b>The Ultimate Look / Perfect Upgrade:</b> {Engaging intro}.<br>
        - 2. Brand Story: <b>About {Brand}:</b> {Quality/Heritage info}.<br>
        - 3. Features: <b>Key Features:</b> Bullet points for material, design, & durability.<br>
        - 4. Versatility / Usage: <b>Wear It Anywhere / Usage:</b> {Styling or functional tips}.<br>
        - 5. Satisfaction: <b>Our Guarantee:</b> Professional and fast shipping.`;
        } else if (descriptionStyle === 'Template 1') {
            descriptionInstruction = `Description - PROFESSIONAL EBAY LISTING:
        - <b>Product Overview:</b> Detailed summary.<br>
        - <b>Key Specifications:</b> Brand, Material, Color, Origin.<br>
        - <b>Performance & Style:</b> {How it looks/feels}.<br>
        - <b>Shipping & Handling:</b> Fast & professional packaging.`;
        } else if (descriptionStyle === 'Template 2') {
            descriptionInstruction = `Description - DETAILED WITH MEASUREMENTS:
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
        • Total Length: {Value}<br>
        • Sleeve Length: {Value}<br><br>
        <strong>Item Specifications:</strong><br>
        - <b>Brand:</b> {Brand}<br>
        - <b>Material:</b> {Material}<br>
        - <b>Style:</b> {Style}<br><br>
        <strong>Expert Analysis:</strong> {Write a professional 200-word paragraph about the quality, texture, and lasting value of this specific piece}.<br><br>
        <strong>100% Satisfaction Guarantee:</strong> We pack with care and ship within 24 hours!`;
        }

        // --- PHASE 1: CATEGORY IDENTIFICATION ---
        console.log(`--- Phase 1: Identifying ${platform} Category ---`);
        const categoryResponse = await openai.chat.completions.create({
            model: "gpt-4.1",
            temperature: 0, // Make it deterministic so the same image gives the same category every time
            messages: [
                {
                    role: "system",
                    content: `You are an expert in marketplace categorization for ${platform}. Your goal is to identify the deepest, most accurate leaf-category for ANY type of product (clothing, electronics, tools, etc.).`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: platform === 'ebay'
                                ? `1. Analyze ALL provided images thoroughly.
2. Carefully read ALL visible tags, brand logos, model numbers, and text on the product/box.
3. Use this deep visual and textual evidence to determine the exact product identity.
4. Provide a HIGHLY SPECIFIC search query (3-6 words) that targets the ABSOLUTE LEAF CATEGORY (the deepest possible level). (e.g., instead of 'Clothing', use 'Mens Graphic T-Shirts' or 'NFL Fan Apparel T-Shirts').
5. Return your response ONLY as a JSON object with 'category_query'. You MUST be as detailed as possible to avoid broad parent categories like 'Clothing' (ID 206).`
                                : platform === 'vinted'
                                    ? "Identify the ABSOLUTE LEAF CATEGORY (deepest possible sub-category) for Vinted for ANY product (e.g., T-shirts, Shirts, Pants, Shoes). NEVER stop at a general category; always identify the final specific sub-category based on the product's visual features (e.g., instead of just 'Shirts', identify if it's 'Long-sleeved shirts' or 'Button-down shirts'). Return the full hierarchical path separated by '>' (e.g., Men > Clothing > Tops & T-shirts > T-shirts > Print T-shirts). Response ONLY as JSON: { \"category\": \"...\" }"
                                    : `Identify the ${platform} category path for this product. Return your response ONLY as a JSON object with 'category'. Keep it accurate for ${platform}'s structure.`
                        },
                        ...imageContent
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        const categoryResult = JSON.parse(categoryResponse.choices[0].message.content);

        let categoryId = '';
        let categoryPath = 'General';

        if (platform === 'ebay') {
            const query = categoryResult?.category_query || 'General';
            try {
                const appToken = await ebayApiService.getAppToken();
                const suggestions = await ebayApiService.getCategorySuggestions(appToken, query);
                if (suggestions && suggestions.length > 0) {
                    // Find the best suggestion (eBay usually sorts by relevance, but we want to ensure it has a valid ID)
                    const bestSuggest = suggestions[0];
                    categoryId = bestSuggest.category.categoryId;

                    let ancestors = bestSuggest.categoryTreeNodeAncestors || [];
                    // Ensure ancestors are sorted by level
                    ancestors.sort((a, b) => a.categoryTreeNodeLevel - b.categoryTreeNodeLevel);
                    categoryPath = ancestors.map(a => a.categoryName).concat(bestSuggest.category.categoryName).join(' > ');
                    
                    console.log(`[AI] Suggestion: ${categoryPath} (Leaf ID: ${categoryId})`);
                } else {
                    categoryPath = query;
                }
            } catch (err) {
                console.error("Failed to fetch official category suggestions:", err.message);
                categoryPath = query;
            }
        } else {
            categoryPath = categoryResult?.category || 'General';
        }

        console.log(`✅ Phase 1: ${categoryPath} (ID: ${categoryId})`);

        // --- PHASE 2: FETCH OFFICIAL ASPECTS (EBAY ONLY) ---
        let officialAspects = [];
        let aspectNamesList = [];
        if (platform === 'ebay' && categoryId) {
            try {
                console.log(`--- Fetching official eBay aspects for Category: ${categoryId} ---`);
                const appToken = await ebayApiService.getAppToken();
                const aspectsData = await ebayApiService.getItemAspectsForCategory(appToken, categoryId);

               // eBay aspects might use different names. We look for anything related to "Condition"
            const conditionAspect = aspectsData.aspects.find(a => 
                a.localizedAspectName.toLowerCase().includes('condition') || 
                a.localizedAspectName.toLowerCase() === 'cond'
            );

            if (conditionAspect && conditionAspect.aspectValues) {
                console.log(`[EBAY] Found ${conditionAspect.aspectValues.length} condition values for category ${categoryId}`);
                // Note: This logic is for internal reference/validation
            } else {
                console.warn(`[EBAY] Aspect 'Condition' not found in features for ${categoryId}. Aspects found: ${aspectsData.aspects.map(a => a.localizedAspectName).join(', ')}`);
            }

                if (aspectsData && aspectsData.aspects) {
                    officialAspects = aspectsData.aspects.map(aspect => ({
                        localizedAspectName: aspect.localizedAspectName,
                        required: aspect.aspectConstraint?.aspectRequired || false,
                        usage: aspect.aspectConstraint?.aspectUsage || 'OPTIONAL',
                        values: aspect.aspectValues ? aspect.aspectValues.map(v => v.localizedValue) : []
                    }));

                    // Sort by importance: Required > Recommended > Optional
                    officialAspects.sort((a, b) => {
                        if (a.required && !b.required) return -1;
                        if (!a.required && b.required) return 1;
                        if (a.usage === 'RECOMMENDED' && b.usage !== 'RECOMMENDED') return -1;
                        if (a.usage !== 'RECOMMENDED' && b.usage === 'RECOMMENDED') return 1;
                        return 0;
                    });

                    aspectNamesList = officialAspects.map(a => a.localizedAspectName);
                    console.log(`✅ Successfully fetched and sequenced ${officialAspects.length} official eBay aspects.`);
                }
            } catch (e) {
                console.error('⚠️ eBay API Error:', e.message);
            }
        }

        if (aspectNamesList.length === 0) {
            aspectNamesList = ['Brand', 'Type', 'Size', 'Color', 'Material', 'Condition', 'Style', 'Department'];
        }

        // --- PHASE 3: FULL ANALYSIS & DATA FILLING ---
        console.log(`--- Phase 3: Detailed AI Analysis for ${platform} ---`);
        console.log(`Structure requested:`, structure); // Debugging

        const mainResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            temperature: 0, // Enforce strict consistency across repeated requests
            messages: [
                {
                    role: "system",
                    content: `You are a world-class ${platform} listing expert. You strictly follow instructions.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze images for a professional ${platform} listing.
                            
1. Visual Research & Title Construction:
   - YOU ARE A MARKETPLACE RESEARCHER. Imagine you are performing a reverse image search on Google Lens and eBay.
   - Identify the EXACT retail name of this product. If it's a specific limited edition or a named series (e.g., "NFL 49ers Patrick Willis St. Patricks Day Graphic Tee"), find that exact phrasing.
   - Look for keywords that top sellers use to rank higher (e.g. "Vintage", "Rare", "Authentic", "Official Licensed").
   - Extract these precise attributes for the Title Sequence: [${structure.join(', ')}]
   
   CRITICAL DEFINITIONS:
   - "Brand": (e.g., Nike, Reebok, Adidas)
   - "Product Type": Use high-value terms (e.g., "Graphic T-Shirt", "Full Zip Windbreaker", "Running Sneakers"). NEVER LEAVE BLANK.
   - "Model / Series": The exact named line (e.g., "Dri-FIT", "Force One", "Cooperstown Collection")
   - "Size": e.g., XL, 10.5.
   - "Color": Primary and secondary colors (e.g., "Dark Green / White"). Be specific!
   - "Material": (e.g., "Heavyweight Cotton", "Gore-Tex")
   - "Key Features": Standout selling points (e.g., "Embroidered Logo", "Holographic Tag", "Double Sided")
   - "Gender / Department": (e.g., Men's, Women's, Youth)

   CRITICAL RULES:
   - GOAL: A professional, keyword-rich title between 70-80 characters.
   - NO BLANKS: Fill every requested attribute by inferring from visual cues.
   - WEB LOGIC: Use the most common retail name found across the web for this exact item.
   - Output as a JSON object inside 'title_parts'.
   
2. ${descriptionInstruction}
3. Item Specifics - FILL EVERY FIELD: ${aspectNamesList.join(', ')}. 
   - For Clothing/Shoes: Rely strictly on visual cues, tags, material textures, and physical design to fill fields.
   - For Electronics/Other: Use your vast knowledge base to infer missing technical specifics based on visual cues.
   
    
4. Pricing: Estimate a realistic 'selling_price' in USD.

Context: Gender: ${gender}, Category: ${categoryPath}.

Response ONLY as JSON: {
  "brand": "Company Name",
  "title": "A long, descriptive, 80-character marketplace title",
  "title_parts": { "AttributeName": "Value", ... },
  "description": "",
  "item_specifics": { "FieldName": "Value", ... },
  "selling_price": 0.00,
  "target_platform": "${platform}"
} 

CRITICAL: DO NOT include 'condition_name' or any related state. This will be fetched via API.`
                        },
                        ...imageContent
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        const finalData = JSON.parse(mainResponse.choices[0].message.content);

        // --- DYNAMIC SKU GENERATION ---
        const productCount = await Product.countDocuments();
        finalData.sku = `VA${productCount + 1}A`;

        const aiResponseParts = finalData.title_parts || {};
        const standardizedParts = {};

        // --- STANDARDIZE PARTS FOR FRONTEND ARCHITECT ---
        structure.forEach(key => {
            const foundKey = Object.keys(aiResponseParts).find(k => k.toLowerCase() === key.toLowerCase());
            standardizedParts[key] = foundKey ? aiResponseParts[foundKey] : '';
        });

        // --- MANUALLY BUILD THE TITLE BASED ON STRUCTURE ---
        const titleString = structure
            .map(key => {
                let val = standardizedParts[key] || '';
                val = String(val).replace(/,/g, ''); // Remove commas
                // If it's the Size field, prepend "Size " for clarity
                if (key.toLowerCase().includes('size') && val && !val.toLowerCase().startsWith('size')) {
                    return `Size ${val}`;
                }
                return val;
            })
            .filter(val => val && val.toString().trim() !== '' && val !== 'null')
            .join(' ')
            .replace(/\s+/g, ' ')
            .substring(0, 80)
            .trim();

        const finalTitle = titleString || finalData.title || standardizedParts['Brand'] || 'New Listing';
        const templatedDescription = wrapInTemplate(finalData.description, titleString);

        return res.json({
            success: true,
            data: {
                ...finalData,
                title_parts: standardizedParts, // SEND STANDARDIZED KEYS TO FRONTEND
                brand: standardizedParts['Brand'] || finalData.brand || '',
                description: templatedDescription,
                title: finalTitle, // Overwrite with our strictly built string
                searchTitle: categoryResult?.category_query || finalTitle,
                category: {
                    name: categoryPath.split(' > ').pop(),
                    path: categoryPath.includes(' > ') ? categoryPath.split(' > ').slice(0, -1).join(' > ') : '',
                    fullName: categoryPath,
                    id: categoryId
                },
                categoryId: categoryId,
                officialAspects: officialAspects
            }
        });

    } catch (error) {
        console.error('❌ Final Analysis Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.saveAiListing = async (req, res) => {
    try {
        const { officialAspects, ...data } = req.body;
        const newProduct = new Product(data);
        await newProduct.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.searchCategories = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);

        const appToken = await ebayApiService.getAppToken();
        const suggestions = await ebayApiService.getCategorySuggestions(appToken, query);

        // Format for frontend
        const formatted = suggestions.map(s => {
            let ancestors = s.categoryTreeNodeAncestors || [];
            ancestors.sort((a, b) => a.categoryTreeNodeLevel - b.categoryTreeNodeLevel);
            const path = ancestors.map(a => a.categoryName).join(' > ');
            const name = s.category.categoryName;
            return {
                id: s.category.categoryId,
                name: name,
                path: path,
                fullName: path ? `${path} > ${name}` : name
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Category search error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
