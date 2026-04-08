const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ebayApiService = require('../services/ebayApiService');
const Product = require('../models/Product');

exports.analyzeProductImage = async (req, res) => {
    try {
        const { images, platform = 'ebay', structure = ['Brand', 'Size', 'Color'], descriptionStyle = 'AI Generated', customTemplateText = '', gender = 'Unisex', condition = 'New' } = req.body;

        if (!images || images.length === 0) {
            return res.status(400).json({ error: "No images provided for analysis." });
        }

        const imageContent = images.map(url => ({
            type: "image_url",
            image_url: { url: url.startsWith('data:') ? url : url }
        }));

        let descriptionInstruction = '';
        if (customTemplateText && customTemplateText.trim() !== '') {
            descriptionInstruction = `Description - USE THIS EXACT CUSTOM TEMPLATE:
            "${customTemplateText}"
            
            (STRICT: Replace all placeholders like {Brand}, {Size}, {Color}, {Condition}, {Title} etc. with data from the images. 
             If a placeholder is not provided in your analysis, use a professional default. 
             Maintain the EXACT visual layout and spacing of the template. Use HTML tags like <b> and <br> for formatting.)`;
        } else {
            if (descriptionStyle === 'AI Generated') {
                descriptionInstruction = `Description - HIGH-CONVERSION & PERSUASIVE (min 300 words):
        - Use HTML <b> for section headers.
        - Use HTML <br><br> for spacing.
        - 1. Hook: <b>The Ultimate Look:</b> {Engaging intro}.<br>
        - 2. Brand Story: <b>About {Brand}:</b> {Quality/Heritage info}.<br>
        - 3. Features: <b>Key Features:</b> Bullet points for material, design, & durability.<br>
        - 4. Versatility: <b>Wear It Anywhere:</b> {Styling tips}.<br>
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
        }

        // --- PHASE 1: CATEGORY IDENTIFICATION ---
        console.log(`--- Phase 1: Identifying ${platform} Category ---`);
        const categoryResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert in marketplace categorization for ${platform}.`
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: platform === 'ebay' 
                                ? "Identify the most specific, concise search phrase or category name for this product (e.g. 'Mens Print T-Shirts' or 'Portable Fans'). Return your response ONLY as a JSON object with 'category_query'. Keep it highly accurate."
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
                    categoryId = suggestions[0].category.categoryId;
                    categoryPath = suggestions[0].categoryTreeNodeAncestors?.map(a => a.categoryName).concat(suggestions[0].category.categoryName).join(' > ') || suggestions[0].category.categoryName;
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
                
                if (aspectsData && aspectsData.aspects) {
                    officialAspects = aspectsData.aspects.map(aspect => ({
                        localizedAspectName: aspect.localizedAspectName,
                        required: aspect.aspectConstraint?.aspectRequired || false,
                        usage: aspect.aspectConstraint?.aspectUsage || 'OPTIONAL',
                        values: aspect.aspectValues ? aspect.aspectValues.map(v => v.localizedValue) : []
                    }));
                    aspectNamesList = officialAspects.map(a => a.localizedAspectName);
                    console.log(`✅ Successfully fetched ${officialAspects.length} official eBay aspects.`);
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
                            
1. Title Components - EXTRACT ONLY these attributes: ${structure.join(', ')}. 
   - DO NOT extract anything else. NO Size, NO Color, NO Model unless it's in the list.
   - Return these as a JSON object inside 'title_parts'.
   
2. ${descriptionInstruction}
3. Item Specifics - FILL EVERY FIELD: ${aspectNamesList.join(', ')}. 
   - For Clothing/Shoes: Rely strictly on visual cues, tags, material textures, and physical design to fill fields.
   - For Electronics/Other: Use your vast knowledge base to infer missing technical specifics (e.g., connectivity, wattage, specs) based on the visual model or type of the product if text is not visible. Fill as many as you logically can.
   
4. Pricing: Estimate a realistic 'selling_price' (e.g. 25.00) in USD based on the item's brand, model, and condition. Do NOT return 0.00 if you can guess a market value.

Context: Gender: ${gender}, Condition: ${condition}, Category: ${categoryPath}.

Response ONLY as JSON: {
  "title_parts": { "AttributeName": "Value", ... },
  "description": "",
  "item_specifics": { "FieldName": "Value", ... },
  "selling_price": 0.00,
  "target_platform": "${platform}"
}`
                        },
                        ...imageContent
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        const finalData = JSON.parse(mainResponse.choices[0].message.content);
        
        // --- MANUALLY BUILD THE TITLE BASED ON STRUCTURE ---
        // This ensures the AI CANNOT inject extra fields into the final string
        const titleParts = finalData.title_parts || {};
        const titleString = structure
            .map(key => titleParts[key] || '')
            .filter(val => val.trim() !== '')
            .join(' ')
            .substring(0, 80);

        return res.json({
            success: true,
            data: {
                ...finalData,
                title: titleString, // Overwrite with our strictly built string
                category: categoryPath,
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
        const formatted = suggestions.map(s => ({
            id: s.category.categoryId,
            fullName: s.categoryTreeNodeAncestors?.map(a => a.categoryName).concat(s.category.categoryName).join(' > ') || s.category.categoryName
        }));
        
        res.json(formatted);
    } catch (error) {
        console.error('Category search error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
