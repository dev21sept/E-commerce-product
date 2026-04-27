const mongoose = require('mongoose');

const fetchRuleSchema = new mongoose.Schema(
    {
        rule_name: {
            type: String,
            required: true,
            trim: true
        },
        title_sequence: {
            type: [String],
            default: []
        },
        description_prompt: {
            type: String,
            default: ''
        },
        condition_note: {
            type: String,
            default: ''
        },
        condition_note_mode: {
            type: String,
            enum: ['fixed', 'selected'],
            default: 'selected'
        },
        custom_title_fields: {
            type: [String],
            default: []
        },
        custom_condition_note: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

fetchRuleSchema.index({ rule_name: 1 }, { unique: true });

module.exports = mongoose.model('FetchRule', fetchRuleSchema);
