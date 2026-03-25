const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    setting_key: { type: String, unique: true, required: true },
    setting_value: { type: String, required: true },
    updated_at: { type: Date, default: Date.now }
});

settingSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('Setting', settingSchema);
