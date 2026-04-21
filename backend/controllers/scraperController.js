const { fetchEbayProduct } = require('../services/ebayScraper');
const { fetchDescriptionOnly } = require('../services/descriptionService');
const ebayApiService = require('../services/ebayApiService');

// Fetch eBay product data
exports.fetchEbayData = async (req, res) => {
    const { url } = req.body;
    console.log(`\n--- [SCRAPER] New Request ---`);
    console.log(`URL: ${url}`);
    
    if (!url) {
        return res.status(400).json({ error: 'eBay URL is required' });
    }

    try {
        console.log(`[Phase 1] Fetching eBay Data with Scraper...`);
        const productData = await fetchEbayProduct(url);
        
        console.log(`✅ [Phase 1] Data Fetched Successfully!`);
        
        // --- PHASE 2: Fetch Official Aspects with Fallback ---
        let finalCategoryId = productData.categoryId;
        let aspectsData = null;

        try {
            const appToken = await ebayApiService.getAppToken();
            
            // Try 1: Direct fetch with found categoryId
            if (finalCategoryId) {
                console.log(`[Phase 2] Attempting aspect fetch for Category: ${finalCategoryId}...`);
                aspectsData = await ebayApiService.getItemAspectsForCategory(appToken, finalCategoryId);
            }

            // Try 2: Fallback to suggestions if Try 1 failed or no categoryId found
            if (!aspectsData || !aspectsData.aspects || aspectsData.aspects.length === 0) {
                const searchName = productData.category || productData.title || 'General';
                console.log(`[Phase 2] Fallback: Searching suggestions for "${searchName}"...`);
                const suggestions = await ebayApiService.getCategorySuggestions(appToken, searchName);
                
                if (suggestions && suggestions.length > 0) {
                    finalCategoryId = suggestions[0].category.categoryId;
                    productData.categoryId = finalCategoryId;
                    
                    let ancestors = suggestions[0].categoryTreeNodeAncestors || [];
                    ancestors.sort((a, b) => a.categoryTreeNodeLevel - b.categoryTreeNodeLevel);
                    productData.category = ancestors.map(a => a.categoryName).concat(suggestions[0].category.categoryName).join(' > ');
                    
                    console.log(`[Phase 2] Using suggested Leaf Category: ${finalCategoryId} (${productData.category})`);
                    aspectsData = await ebayApiService.getItemAspectsForCategory(appToken, finalCategoryId);
                }
            }

            if (aspectsData && aspectsData.aspects) {
                productData.officialAspects = aspectsData.aspects.map(aspect => ({
                    localizedAspectName: aspect.localizedAspectName,
                    required: aspect.aspectConstraint?.aspectRequired || false,
                    usage: aspect.aspectConstraint?.aspectUsage || 'OPTIONAL',
                    values: aspect.aspectValues ? aspect.aspectValues.map(v => v.localizedValue) : []
                }));

                // Sort by importance: Required > Recommended > Optional
                productData.officialAspects.sort((a, b) => {
                    if (a.required && !b.required) return -1;
                    if (!a.required && b.required) return 1;
                    if (a.usage === 'RECOMMENDED' && b.usage !== 'RECOMMENDED') return -1;
                    if (a.usage !== 'RECOMMENDED' && b.usage === 'RECOMMENDED') return 1;
                    return 0;
                });

                console.log(`✅ [Phase 2] Successfully loaded and sequenced ${productData.officialAspects.length} official aspects.`);
            } else {
                // Final fallback: Provide standard aspects if everything fails
                // This ensures we fulfill Point 3 (always have dropdowns for fields)
                const standardAspects = ['Brand', 'Size', 'Color', 'Type', 'Material', 'Style', 'Department', 'Condition'];
                productData.officialAspects = standardAspects.map(name => ({
                    localizedAspectName: name,
                    required: false,
                    usage: 'RECOMMENDED',
                    values: [] // SearchableSelect will handle empty options by allowing free text
                }));
                console.log(`⚠️ [Phase 2] Using standard fallback aspects for category ${finalCategoryId}`);
            }
        } catch (aspectErr) {
            console.error(`❌ [PHASE 2 ERROR]`, aspectErr.message);
            // Even on error, provide basic aspects
            const standardAspects = ['Brand', 'Size', 'Color', 'Type', 'Material', 'Condition'];
            productData.officialAspects = standardAspects.map(name => ({
                localizedAspectName: name,
                required: false,
                usage: 'RECOMMENDED',
                values: []
            }));
        }

        productData.ebayUrl = url;
        
        // --- DYNAMIC SKU GENERATION ---
        const Product = require('../models/Product');
        const productCount = await Product.countDocuments();
        productData.sku = `VA${productCount + 1}E`;
        
        // Map scraper field names to frontend form field names
        productData.condition_name = productData.condition;
        productData.condition_notes = productData.conditionNotes;

        res.json(productData);
    } catch (error) {
        console.error(`❌ [SCRAPER ERROR]`, error.message);
        res.status(500).json({ error: 'Failed to fetch eBay product data', details: error.message });
    }
};

// Standalone scrape for description
exports.scrapeEbayDescription = async (req, res) => {
    const { url } = req.body;
    console.log(`\n--- [DESCRIPTION SCRAPER] Request ---`);
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        console.log(`[Phase 1] Scraping Description Frame...`);
        const description = await fetchDescriptionOnly(url);
        console.log(`✅ [Phase 1] Description Scraped (${description.length} chars)`);
        res.json({ description });
    } catch (error) {
        console.error(`❌ [DESC SCRAPER ERROR]`, error.message);
        res.status(500).json({ error: "Scraping failed", details: error.message });
    }
};

exports.getCategoryAspects = async (req, res) => {
    const { categoryId } = req.params;
    try {
        const appToken = await ebayApiService.getAppToken();
        const aspectsData = await ebayApiService.getItemAspectsForCategory(appToken, categoryId);
        
        let officialAspects = [];
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
        }
        res.json(officialAspects);
    } catch (error) {
        console.error(`❌ [ASPECTS ERROR]`, error.message);
        res.status(500).json({ error: "Failed to fetch aspects", details: error.message });
    }
};
