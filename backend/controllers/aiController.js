const { OpenAI } = require('openai');
const Product = require('../models/Product');
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
        
        const { images, condition, gender } = req.body;
        console.log(`Analyzing ${images ? images.length : 0} images. Condition: ${condition}, Gender: ${gender}`);

        if (!images || !Array.isArray(images) || images.length === 0) {
            console.log('Error: Empty or missing images array');
            return res.status(400).json({ error: 'No images provided for analysis.' });
        }

        console.log(`--- Requesting AI analysis for ${images.length} product images ---`);

        // Prepare image content for OpenAI Vision
        const imageContent = images.map(img => ({
            type: "image_url",
            image_url: {
                url: img
            }
        }));

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a world-class eBay SEO expert. Your primary goal is 100% accurate product identification and categorization, followed by detailed copywriting. Zero tolerance for misidentifying basic items like T-Shirts vs Shirts."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Analyze these product images carefully (check tags, labels, and all angles) to provide a comprehensive eBay listing:
1. Category - Complete hierarchical eBay category path. (STRICT REQUIREMENT: Identify precisely. For clothing, distinguish T-Shirts from Shirts by checking for collars and buttons. Accuracy is mandatory.)
2. Title - Professional, keyword-rich title (Exactly <= 80 chars).
3. Description - PREMIUM EBAY LISTING TEMPLATE (minimum 350 words). Use a high-conversion, structured HTML layout. 
   Include EXACT sections with <strong>bold titles</strong> and emojis. 
   IMPORTANT: Use <br><br> (Double HTML Line Breaks) between ALL sections for maximum readability on eBay:

    <strong>PRODUCT OVERVIEW</strong>: Professional, high-impact intro.

    <strong>KEY FEATURES & BENEFITS</strong>: Detailed bulleted list using <ul> and <li> tags with descriptive points.

    <strong>SPECIFICATIONS</strong>: Materials, measurements (if seen), and craftsmanship.

    <strong>CONDITION & AUTHENTICITY</strong>: State condition as "${condition || 'New'}" and mention quality assurance.

    <strong>SHIPPING & TRUST</strong>: Short professional trust blurb.

   Use professional, persuasive sales language. ALWAYS Use <br> for individual line breaks within sections. DO NOT use markdown like ** for bolding, ONLY use <strong> tags.
4. Item Specifics (Aspects) - A massive JSON object. These MUST change completely based on the DETECTED CATEGORY to match eBay's specific requirements (Item Aspects). For example:
     - IF CLOTHING: provide Brand, Style, Size Type, Size, Material, Features, Pattern, Neckline, Sleeve Length, etc.
     - IF SHOES: provide Brand, Type, Color, Style, US Shoe Size, Shoe Width, Department, Upper Material, Heel Height, etc.
     - IF ELECTRONICS: provide Brand, Model, Connectivity, Features, Processor, Storage, etc.
     - DETECT PRECISION: Read tags carefully for "Country of Origin", "Material", "Brand", and "Size".
    (IMPORTANT: DO NOT include attributes with values like 'None', 'N/A', or 'Unknown'. If a key is not applicable (like 'Lining' for a T-shirt), OMIT it entirely. Focus on providing 25-30 HIGH-VALUE attributes that are actually seen or inferred). 
5. Price - Real-world estimated market value for selling. 
   (IMPORTANT: DO NOT include seller, marketplace, or shipping info in the JSON). Provide at least 25-30 attributes in total.

Context:
- Gender: ${gender || 'N/A'}
- Condition: ${condition || 'New'}

Format your response STRICTLY as: {
  "category": "",
  "title": "",
  "description": "",
  "item_specifics": {},
  "selling_price": 0.00
}`
                        },
                        ...imageContent
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        const rawAiData = JSON.parse(response.choices[0].message.content);
        
        // Sanitize keys (ensure everything is lowercase for safety)
        const aiData = {
            category: rawAiData.category || rawAiData.Category || rawAiData.ebay_category || '',
            title: rawAiData.title || rawAiData.Title || '',
            description: rawAiData.description || rawAiData.Description || '',
            item_specifics: rawAiData.item_specifics || rawAiData.Item_Specifics || {},
            selling_price: rawAiData.selling_price || rawAiData.Price || 0
        };

        console.log('AI Logic Result (Sanitized):', aiData);

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
