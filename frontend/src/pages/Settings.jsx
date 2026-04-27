import React, { useEffect, useMemo, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import {
    createFetchRule,
    deleteFetchRule,
    getFetchRules,
    getSavedConditionNotes,
    updateFetchRule
} from '../services/api';

const BASE_TITLE_FIELDS = [
    'Brand',
    'Product Type',
    'Model / Series',
    'Size',
    'Color',
    'Material',
    'Style / Use Case',
    'Gender / Department'
];

const DEFAULT_CONDITION_NOTES = [
    'Pre-owned In Excellent Condition.',
    'Pre-owned In Good Condition.',
    'Pre-owned In Good Condition. Please See Pictures.',
    'Brand New With Tags.',
    'Brand New Without Tags.'
];

const CUSTOM_NOTE_OPTION = '__custom_note__';

const getEmptyForm = () => ({
    rule_name: '',
    title_sequence: [...BASE_TITLE_FIELDS],
    description_prompt: '',
    condition_note_mode: 'fixed',
    condition_note: '',
    custom_title_fields: [],
    custom_condition_note: ''
});

const mapRuleToForm = (rule) => ({
    rule_name: rule?.rule_name || '',
    title_sequence: Array.isArray(rule?.title_sequence) && rule.title_sequence.length > 0
        ? rule.title_sequence
        : [...BASE_TITLE_FIELDS],
    description_prompt: rule?.description_prompt || '',
    condition_note_mode: rule?.condition_note_mode || 'fixed',
    condition_note: rule?.condition_note || '',
    custom_title_fields: Array.isArray(rule?.custom_title_fields) ? rule.custom_title_fields : [],
    custom_condition_note: rule?.custom_condition_note || ''
});

const normalizePayload = (form) => ({
    rule_name: String(form.rule_name || '').trim(),
    title_sequence: [...new Set((form.title_sequence || []).map((v) => String(v || '').trim()).filter(Boolean))],
    description_prompt: String(form.description_prompt || '').trim(),
    condition_note_mode: 'fixed',
    condition_note: String(form.condition_note || '').trim(),
    custom_title_fields: [...new Set((form.custom_title_fields || []).map((v) => String(v || '').trim()).filter(Boolean))],
    custom_condition_note: String(form.custom_condition_note || '').trim()
});

const RuleForm = ({ initialRule, savedNotes, submitLabel, onSubmit, onCancel }) => {
    const [form, setForm] = useState(mapRuleToForm(initialRule));
    const [conditionSelection, setConditionSelection] = useState(
        initialRule?.custom_condition_note ? CUSTOM_NOTE_OPTION : (initialRule?.condition_note || '')
    );

    useEffect(() => {
        setForm(mapRuleToForm(initialRule));
        setConditionSelection(
            initialRule?.custom_condition_note ? CUSTOM_NOTE_OPTION : (initialRule?.condition_note || '')
        );
    }, [initialRule]);

    const conditionNoteOptions = useMemo(
        () => [...new Set([...DEFAULT_CONDITION_NOTES, ...(savedNotes || [])])],
        [savedNotes]
    );

    const addFieldToSequence = (value) => {
        const field = String(value || '').trim();
        if (!field) return;
        setForm((prev) => {
            if (prev.title_sequence.includes(field)) return prev;
            return { ...prev, title_sequence: [...prev.title_sequence, field] };
        });
    };

    const removeFieldFromSequence = (value) => {
        setForm((prev) => ({
            ...prev,
            title_sequence: prev.title_sequence.filter((field) => field !== value)
        }));
    };

    const addCustomTitleFieldRow = () => {
        setForm((prev) => ({ ...prev, custom_title_fields: [...prev.custom_title_fields, ''] }));
    };

    const updateCustomTitleField = (index, value) => {
        setForm((prev) => ({
            ...prev,
            custom_title_fields: prev.custom_title_fields.map((field, i) => (i === index ? value : field))
        }));
    };

    const removeCustomTitleField = (index) => {
        setForm((prev) => ({
            ...prev,
            custom_title_fields: prev.custom_title_fields.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = normalizePayload(form);
        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rule Name</label>
                    <input
                        value={form.rule_name}
                        onChange={(e) => setForm((p) => ({ ...p, rule_name: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-indigo-500"
                        placeholder="Rule name"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Condition Note</label>
                    <select
                        value={conditionSelection}
                        onChange={(e) => {
                            const value = e.target.value;
                            setConditionSelection(value);
                            if (value === CUSTOM_NOTE_OPTION) {
                                setForm((p) => ({ ...p, condition_note: '' }));
                            } else {
                                setForm((p) => ({ ...p, condition_note: value }));
                            }
                        }}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-indigo-500 bg-white"
                    >
                        <option value="">Select saved condition note</option>
                        {conditionNoteOptions.map((note) => (
                            <option key={note} value={note}>{note}</option>
                        ))}
                        <option value={CUSTOM_NOTE_OPTION}>Add Custom Condition Note...</option>
                    </select>
                    {conditionSelection === CUSTOM_NOTE_OPTION && (
                        <textarea
                            rows={2}
                            value={form.custom_condition_note}
                            onChange={(e) => setForm((p) => ({ ...p, custom_condition_note: e.target.value }))}
                            className="w-full mt-2 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-indigo-500"
                            placeholder="Type custom condition note"
                        />
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Title Sequence</label>
                <div className="flex flex-wrap gap-2">
                    {BASE_TITLE_FIELDS.map((field) => (
                        <button
                            key={field}
                            type="button"
                            onClick={() => addFieldToSequence(field)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 text-indigo-700 bg-indigo-50"
                        >
                            {field}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={addCustomTitleFieldRow}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 text-emerald-700 bg-emerald-50"
                    >
                        + Custom Field
                    </button>
                </div>

                {form.custom_title_fields.length > 0 && (
                    <div className="space-y-2 bg-gray-50 border border-gray-100 rounded-2xl p-3">
                        {form.custom_title_fields.map((field, idx) => (
                            <div key={`custom-${idx}`} className="flex items-center gap-2">
                                <input
                                    value={field}
                                    onChange={(e) => updateCustomTitleField(idx, e.target.value)}
                                    className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-emerald-500"
                                    placeholder={`Custom title field ${idx + 1}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => addFieldToSequence(field)}
                                    className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-[11px] font-bold"
                                >
                                    Use
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeCustomTitleField(idx)}
                                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <Reorder.Group
                    axis="x"
                    values={form.title_sequence}
                    onReorder={(next) => setForm((p) => ({ ...p, title_sequence: next }))}
                    className="flex gap-2 overflow-x-auto py-1"
                >
                    {form.title_sequence.map((field, idx) => (
                        <Reorder.Item
                            key={field}
                            value={field}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white whitespace-nowrap"
                        >
                            <span className="text-xs font-bold text-gray-700">{idx + 1}. {field}</span>
                            <button
                                type="button"
                                onClick={() => removeFieldFromSequence(field)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description Prompt</label>
                <textarea
                    rows={6}
                    value={form.description_prompt}
                    onChange={(e) => setForm((p) => ({ ...p, description_prompt: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-indigo-500"
                    placeholder="Admin-defined prompt for AI description"
                />
            </div>

            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-10 px-4 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-black flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {submitLabel}
                </button>
            </div>
        </form>
    );
};

const Settings = () => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [savedNotes, setSavedNotes] = useState(DEFAULT_CONDITION_NOTES);
    const [editingId, setEditingId] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const refreshRules = async () => {
        const [ruleRes, notesRes] = await Promise.all([getFetchRules(), getSavedConditionNotes()]);
        setRules(ruleRes?.data || []);
        if (Array.isArray(notesRes?.data)) {
            setSavedNotes((prev) => [...new Set([...prev, ...notesRes.data])]);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                await refreshRules();
            } catch (error) {
                console.error('Failed to load rules:', error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const filteredRules = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return rules;
        return rules.filter((rule) => {
            const name = String(rule.rule_name || '').toLowerCase();
            const note = String(rule.custom_condition_note || rule.condition_note || '').toLowerCase();
            return name.includes(q) || note.includes(q);
        });
    }, [rules, searchTerm]);

    const handleCreate = async (payload) => {
        setSaving(true);
        try {
            await createFetchRule(payload);
            await refreshRules();
            setIsAddModalOpen(false);
        } catch (error) {
            alert(error?.response?.data?.error || 'Failed to create rule');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id, payload) => {
        setSaving(true);
        try {
            await updateFetchRule(id, payload);
            await refreshRules();
            setEditingId(null);
        } catch (error) {
            alert(error?.response?.data?.error || 'Failed to update rule');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this rule?')) return;
        try {
            await deleteFetchRule(id);
            await refreshRules();
            if (editingId === id) setEditingId(null);
        } catch (error) {
            alert(error?.response?.data?.error || 'Failed to delete rule');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Rule Management</p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-black flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add New Rule
                </button>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search rules by name or condition note..."
                            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px]">
                        <thead>
                            <tr className="text-left border-b border-gray-100">
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider">S.N</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider">Rule Name</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider">Title Sequence</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider">Note</th>
                                <th className="py-3 px-2 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500">Loading rules...</td>
                                </tr>
                            ) : filteredRules.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500">No rules found.</td>
                                </tr>
                            ) : filteredRules.map((rule, idx) => (
                                <React.Fragment key={rule._id}>
                                    <tr className="border-b border-gray-50">
                                        <td className="py-3 px-2 text-sm font-bold text-gray-500">{idx + 1}</td>
                                        <td className="py-3 px-2 text-sm font-bold text-gray-900">{rule.rule_name}</td>
                                        <td className="py-3 px-2 text-sm text-gray-600">
                                            <span
                                                className="cursor-help"
                                                title={(rule.title_sequence || []).join(' | ') || '-'}
                                            >
                                                {(rule.title_sequence || []).slice(0, 4).join(' | ')}
                                                {(rule.title_sequence || []).length > 4 ? ' ...' : ''}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-sm text-gray-600">
                                            <span
                                                className="cursor-help"
                                                title={rule.description_prompt || '-'}
                                            >
                                                {(rule.description_prompt || '-').slice(0, 70)}
                                                {(rule.description_prompt || '').length > 70 ? '...' : ''}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-sm text-gray-600">
                                            {((rule.custom_condition_note || rule.condition_note || '-').slice(0, 60))}
                                            {((rule.custom_condition_note || rule.condition_note || '').length > 60) ? '...' : ''}
                                        </td>
                                        <td className="py-3 px-2">
                                            <div className="flex justify-end items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId((prev) => (prev === rule._id ? null : rule._id))}
                                                    className="h-8 px-3 rounded-lg border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(rule._id)}
                                                    className="h-8 px-3 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {editingId === rule._id && (
                                        <tr className="bg-gray-50/60">
                                            <td colSpan={6} className="p-4">
                                                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                                                    <RuleForm
                                                        initialRule={rule}
                                                        savedNotes={savedNotes}
                                                        submitLabel={saving ? 'Saving...' : 'Update Rule'}
                                                        onSubmit={(payload) => handleUpdate(rule._id, payload)}
                                                        onCancel={() => setEditingId(null)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[99999] bg-black/45 backdrop-blur-md p-4 md:p-8 flex items-start md:items-center justify-center overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white border border-indigo-100 rounded-3xl shadow-[0_30px_80px_-20px_rgba(79,70,229,0.45)] ring-1 ring-indigo-50">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-black text-gray-900">Add New Rule</h2>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <RuleForm
                                initialRule={getEmptyForm()}
                                savedNotes={savedNotes}
                                submitLabel={saving ? 'Saving...' : 'Create Rule'}
                                onSubmit={handleCreate}
                                onCancel={() => setIsAddModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
