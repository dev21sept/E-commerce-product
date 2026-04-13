const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ebayApiService = require('../services/ebayApiService');
const { wrapInTemplate } = require('../services/descriptionService');
const Product = require('../models/Product');

exports.analyzeProductImage = async (req, res) => {
    console.log(`\n--- [AI STUDIO] New Analysis Request Received ---`);
    try {
        const { images, platform = 'ebay', structure = ['Brand', 'Size', 'Color'], descriptionStyle = 'AI Generated', customTemplateText = '', gender = 'Unisex', condition = 'New' } = req.body;
        console.log(`Platform: ${platform}, Images: ${images?.length || 0}`);

        if (!images || images.length === 0) {
            return res.status(400).json({ error: "No images provided for analysis." });
        }

        const imageContent = images.map(url => ({
            type: "image_url",
            image_url: { url: url.startsWith('data:') ? url : url }
        }));

        let descriptionInstruction = '';
        if (descriptionStyle === 'AI Generated') {
            descriptionInstruction = `Description - HIGH-CONVERSION & PERSUASIVE (min 300 words):
        - Use HTML <b> for section headers.
        - Use HTML <br><br> for spacing.
        - Analyze the item to write a detailed, professional summary. Include:
        - 1. Hook: <b>The Ultimate Look / Perfect Upgrade:</b> {Engaging intro}.<br>
        - 2. Brand Story: <b>About {Brand}:</b> {Quality/Heritage info}.<br>
        - 3. Features: <b>Key Features:</b> Bullet points for material, design, & durability.<br>
        - 4. Versatility / Usage: <b>Wear It Anywhere / Usage:</b> {Styling or functional tips}.<br>
        - 5. Satisfaction: <b>Our Guarantee:</b> Professional and fast shipping.`;
        } else if (customTemplateText && customTemplateText.trim() !== '') {
            descriptionInstruction = `Description - USE THIS EXACT CUSTOM TEMPLATE:
            "${customTemplateText}"
            
            (STRICT: Replace all placeholders like {Brand}, {Size}, {Color}, {Condition}, {Title} etc. with data from the images. 
             If a placeholder is not provided in your analysis, use a professional default. 
             Maintain the EXACT visual layout and spacing of the template. Use HTML tags like <b> and <br> for formatting.)`;
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
4. Provide a highly specific, concise search query (2-5 words) that matches its exact eBay Leaf Category (e.g., 'Mens Graphic T-Shirts', 'Wireless In-Ear Headphones', 'Portable Electric Fans').
5. Return your response ONLY as a JSON object with 'category_query'. Be ruthlessly accurate.`
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

                    let ancestors = suggestions[0].categoryTreeNodeAncestors || [];
                    ancestors.sort((a, b) => a.categoryTreeNodeLevel - b.categoryTreeNodeLevel);
                    categoryPath = ancestors.map(a => a.categoryName).concat(suggestions[0].category.categoryName).join(' > ');
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
                            
1. Title Components - Extract these precise attributes: [${structure.join(', ')}]
   Use these strict definitions for what each attribute means:
   - "Brand": Company name (e.g., Nike, Apple, Levi's)
   - "Product Type": What the item physically is (e.g., Sneakers, T-Shirt, Portable Fan, Laptop)
   - "Model / Series": The specific named model (e.g., Air Max 97, ThinkPad T480, 501)
   - "Size": The specific size tag (e.g., 9, XL, 36x30)
   - "Color": Outer color (e.g., Black, Red)
   - "Material": What it's made of (e.g., Leather, Denim, Stainless Steel)
   - "Style / Use Case": The fashion sub-style or functional purpose (e.g., Running, Athletic, Vintage, Business)
   - "Key Features": 1-2 words for a standout detail (e.g., Wireless, Waterproof, Graphic)
   - "Gender / Department": (e.g., Men's, Women's, Unisex)

   CRITICAL RULES FOR TITLE PARTS:
   - Make your best professional guess for every requested attribute based on the image. (e.g., if you see running shoes, the Product Type is "Sneakers" and Style is "Running").
   - DO NOT leave requested attributes blank if you can logically infer them.
   - Return ONLY the exact attributes requested in the list. Do not include unrequested ones.
   - Output these as a JSON object inside 'title_parts'.
   
2. ${descriptionInstruction}
3. Item Specifics - FILL EVERY FIELD: ${aspectNamesList.join(', ')}. 
   - For Clothing/Shoes: Rely strictly on visual cues, tags, material textures, and physical design to fill fields.
   - For Electronics/Other: Use your vast knowledge base to infer missing technical specifics (e.g., connectivity, wattage, specs) based on the visual model or type of the product if text is not visible. Fill as many as you logically can.
   
4. Pricing: Estimate a realistic 'selling_price' (e.g. 25.00) in USD based on the item's brand, model, and condition. Do NOT return 0.00 if you can guess a market value.

Context: Gender: ${gender}, Condition: ${condition}, Category: ${categoryPath}.

Response ONLY as JSON: {
  "brand": "Company Name",
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
            .map(key => {
                let val = titleParts[key] || '';
                return val.replace(/,/g, ''); // Remove commas from any title part
            })
            .filter(val => val.trim() !== '')
            .join(' ')
            .replace(/\s+/g, ' ') // Clean up multiple spaces
            .substring(0, 80)
            .trim();

        const templatedDescription = wrapInTemplate(finalData.description, titleString);

        return res.json({
            success: true,
            data: {
                ...finalData,
                brand: finalData.brand || finalData.item_specifics?.Brand || finalData.title_parts?.Brand || '',
                description: templatedDescription,
                title: titleString, // Overwrite with our strictly built string
                searchTitle: categoryResult?.category_query || titleString,
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
        const formatted = suggestions.map(s => {
            let ancestors = s.categoryTreeNodeAncestors || [];
            ancestors.sort((a, b) => a.categoryTreeNodeLevel - b.categoryTreeNodeLevel);
            return {
                id: s.category.categoryId,
                fullName: ancestors.map(a => a.categoryName).concat(s.category.categoryName).join(' > ')
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Category search error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
