const FetchRule = require('../models/FetchRule');

const normalizeArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
        .map((item) => String(item || '').trim())
        .filter(Boolean);
};

const normalizePayload = (body = {}) => ({
    rule_name: String(body.rule_name || '').trim(),
    title_sequence: normalizeArray(body.title_sequence),
    description_prompt: String(body.description_prompt || '').trim(),
    condition_note: String(body.condition_note || '').trim(),
    condition_note_mode: body.condition_note_mode === 'fixed' ? 'fixed' : 'selected',
    custom_title_fields: normalizeArray(body.custom_title_fields),
    custom_condition_note: String(body.custom_condition_note || '').trim()
});

exports.getRules = async (req, res) => {
    try {
        const rules = await FetchRule.find().sort({ createdAt: -1 });
        res.json({ success: true, data: rules });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getConditionNotes = async (req, res) => {
    try {
        const rules = await FetchRule.find({}, { condition_note: 1, custom_condition_note: 1, _id: 0 });
        const uniqueNotes = [...new Set(
            rules
                .flatMap((rule) => [rule.condition_note, rule.custom_condition_note])
                .map((note) => String(note || '').trim())
                .filter(Boolean)
        )];

        res.json({ success: true, data: uniqueNotes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createRule = async (req, res) => {
    try {
        const payload = normalizePayload(req.body);

        if (!payload.rule_name) {
            return res.status(400).json({ error: 'rule_name is required' });
        }

        const created = await FetchRule.create(payload);
        res.status(201).json({ success: true, data: created });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'rule_name must be unique' });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.updateRule = async (req, res) => {
    try {
        const payload = normalizePayload(req.body);

        if (!payload.rule_name) {
            return res.status(400).json({ error: 'rule_name is required' });
        }

        const updated = await FetchRule.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        res.json({ success: true, data: updated });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'rule_name must be unique' });
        }
        res.status(500).json({ error: error.message });
    }
};

exports.deleteRule = async (req, res) => {
    try {
        const deleted = await FetchRule.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Rule not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
