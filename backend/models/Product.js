const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    category: mongoose.Schema.Types.Mixed,
    categoryId: String,
    category_id: String, // Keep for backward compatibility
    sku: String,
    brand: String,
    condition_id: String,
    condition_name: String,
    condition_notes: String,
    retail_price: Number,
    selling_price: Number,
    discount_percentage: String,
    seller_name: String,
    seller_feedback: String,
    ebay_url: String,
    video_url: String,
    about_item: String,
    item_specifics: mongoose.Schema.Types.Mixed,
    officialAspects: mongoose.Schema.Types.Mixed,
    images: [String],
    variations: [
        {
            name: String,
            value: String
        }
    ],
    gender: String, // Added as requested
    ai_generated: { type: Boolean, default: false },
    source: { type: String, enum: ['ai', 'ebay', 'scraper'], default: 'ebay' },
    target_platform: { type: String, enum: ['ebay', 'poshmark', 'vinted'], default: 'ebay' },
    sql_id: Number, // Temporary for migration
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

productSchema.pre('save', function() {
    this.updated_at = Date.now();
});

module.exports = mongoose.model('Product', productSchema);
