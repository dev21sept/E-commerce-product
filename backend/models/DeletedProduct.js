const mongoose = require('mongoose');

const deletedProductSchema = new mongoose.Schema({
    productId: { type: String, index: true },
    sku: { type: String, index: true },
    title: { type: String, index: true },
    source: { type: String, index: true },
    ebayOfferId: { type: String, index: true },
    ebayListingId: { type: String, index: true },
    deleted_at: { type: Date, default: Date.now }
});

deletedProductSchema.index({ sku: 1, source: 1 });
deletedProductSchema.index({ title: 1, source: 1 });

module.exports = mongoose.model('DeletedProduct', deletedProductSchema);
