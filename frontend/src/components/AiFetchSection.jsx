import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Image as ImageIcon, Upload, Loader2, Plus, ExternalLink, Trash2, ChevronDown, Search, Check } from 'lucide-react';
import { analyzeProduct, getFetchRules } from '../services/api';
import { EBAY_CONDITIONS } from '../constants/ebayConditions';

const SearchableDropdown = ({ value, onSelect, options = [], placeholder = 'Select...', disabled = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt) => {
        const label = String(opt?.label || '').toLowerCase();
        const desc = String(opt?.description || '').toLowerCase();
        const q = searchTerm.toLowerCase();
        return label.includes(q) || desc.includes(q);
    });

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full h-10 px-3 bg-white border border-gray-200 rounded-xl text-left flex items-center justify-between text-xs font-bold text-gray-800 disabled:opacity-60"
            >
                <span className="truncate">{value || placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && !disabled && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[5000] overflow-hidden">
                    <div className="p-2.5 bg-gray-50 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                autoFocus
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                        {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
                            <button
                                key={opt.id || opt.label}
                                type="button"
                                onClick={() => {
                                    onSelect(opt);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                                className="w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-indigo-600 hover:text-white transition-colors"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold">{opt.label}</span>
                                    {value === opt.label && <Check className="w-3.5 h-3.5" />}
                                </div>
                                {opt.description && (
                                    <p className="text-[10px] opacity-70 mt-0.5 line-clamp-1">{opt.description}</p>
                                )}
                            </button>
                        )) : (
                            <div className="p-3 text-[11px] text-gray-400 text-center">No results</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const AiFetchSection = ({ onDataFetched, onAnalyzingStart }) => {
    const [imageUrls, setImageUrls] = useState(['']);
    const [localPreviews, setLocalPreviews] = useState([]);
    const [platform] = useState('ebay');
    const [selectedCondition, setSelectedCondition] = useState(EBAY_CONDITIONS[0]);
    const [gender] = useState('Unisex');
    const [rules, setRules] = useState([]);
    const [selectedRuleId, setSelectedRuleId] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingRules, setLoadingRules] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loadRules = async () => {
            try {
                const response = await getFetchRules();
                const loadedRules = response?.data || [];
                setRules(loadedRules);
                if (loadedRules.length > 0) {
                    setSelectedRuleId(loadedRules[0]._id);
                }
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to load rules. Please check Settings page.' });
            } finally {
                setLoadingRules(false);
            }
        };
        loadRules();
    }, []);

    const selectedRule = useMemo(
        () => rules.find((rule) => rule._id === selectedRuleId) || null,
        [rules, selectedRuleId]
    );
    const ruleOptions = useMemo(
        () => rules.map((rule) => ({ id: rule._id, label: rule.rule_name, description: 'Saved AI fetch rule' })),
        [rules]
    );

    const handleAddUrlField = () => setImageUrls((prev) => [...prev, '']);

    const handleUrlChange = (index, value) => {
        setImageUrls((prev) => {
            const copy = [...prev];
            copy[index] = value;
            return copy;
        });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 1200;

                    if (width > height && width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    } else if (height > width && height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setLocalPreviews((prev) => [...prev, compressedDataUrl]);
                };
                img.src = String(reader.result || '');
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveLocal = (index) => setLocalPreviews((prev) => prev.filter((_, i) => i !== index));

    const handleClearAll = () => {
        setImageUrls(['']);
        setLocalPreviews([]);
        setMessage({ type: '', text: '' });
    };

    const handleAnalyze = async () => {
        const allImages = [...imageUrls.filter((u) => u.trim() !== ''), ...localPreviews];
        if (allImages.length === 0) {
            setMessage({ type: 'error', text: 'Select images first.' });
            return;
        }
        if (!selectedRule) {
            setMessage({ type: 'error', text: 'Select a rule before starting analysis.' });
            return;
        }

        setIsAnalyzing(true);
        if (onAnalyzingStart) onAnalyzingStart();
        try {
            const result = await analyzeProduct({
                images: allImages,
                condition: selectedCondition?.label || 'New',
                gender,
                platform,
                selectedRule
            });

            if (result.success) {
                onDataFetched({
                    ...result.data,
                    images: allImages,
                    source: 'ai',
                    condition_name: selectedCondition?.label || '',
                    condition_id: selectedCondition?.id || ''
                });
            } else {
                setMessage({ type: 'error', text: 'AI analysis failed.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Connection failed.' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="card p-6 md:p-8 space-y-6 max-w-7xl mx-auto bg-white border border-gray-100 shadow-sm rounded-3xl">
            <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.2em]">AI Rule Setup</h3>
                    <span className="text-[10px] text-indigo-600 font-bold">{loadingRules ? 'Loading...' : `${rules.length} rules`}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Rule</label>
                        <SearchableDropdown
                            value={selectedRule?.rule_name || ''}
                            onSelect={(opt) => setSelectedRuleId(opt.id)}
                            options={ruleOptions}
                            placeholder={rules.length ? 'Choose rule' : 'No rules found in Settings'}
                            disabled={loadingRules || rules.length === 0}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Product Condition</label>
                        <SearchableDropdown
                            value={selectedCondition?.label || ''}
                            onSelect={(opt) => setSelectedCondition(opt)}
                            options={EBAY_CONDITIONS}
                            placeholder="Select condition"
                        />
                    </div>
                </div>

                {selectedRule && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        <span className="px-2.5 py-1 bg-white border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-700">
                            Sequence: {(selectedRule.title_sequence || []).slice(0, 3).join(' | ')}
                            {(selectedRule.title_sequence || []).length > 3 ? ' ...' : ''}
                        </span>
                        <span className="px-2.5 py-1 bg-white border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-700">
                            Note: {(selectedRule.custom_condition_note || selectedRule.condition_note || '-').slice(0, 40)}
                            {((selectedRule.custom_condition_note || selectedRule.condition_note || '').length > 40) ? '...' : ''}
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex gap-2">
                    {imageUrls.map((url, index) => (
                        <div key={index} className="flex-1 relative group">
                            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => handleUrlChange(index, e.target.value)}
                                placeholder="Paste Image Link Here..."
                                className="w-full h-10 pl-9 pr-4 bg-gray-50 border border-gray-100 focus:border-indigo-600 rounded-xl text-xs font-bold outline-none transition-all"
                            />
                        </div>
                    ))}
                    <button onClick={handleAddUrlField} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                        <Plus className="w-5 h-5" />
                    </button>
                    {localPreviews.length > 0 && (
                        <button onClick={handleClearAll} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="lg:w-1/3 flex-shrink-0 border-2 border-dashed border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all bg-gray-50/30 group"
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                        <Upload className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-[11px] font-black text-gray-900 uppercase">Click to Upload</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Or Drag Photos</p>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex gap-4 items-center overflow-x-auto min-h-[140px] bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                            {localPreviews.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                    <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No Photos Loaded</p>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    {localPreviews.map((src, idx) => (
                                        <div key={`${src.slice(0, 40)}-${idx}`} className="relative group w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-md">
                                            <img src={src} alt={`upload-${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveLocal(idx);
                                                }}
                                                className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {localPreviews.length > 0 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{localPreviews.length} images added</span>
                                    <button onClick={handleClearAll} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Clear All</button>
                                </div>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className={`px-12 h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl active:scale-95 ${
                                        isAnalyzing ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-black'
                                    }`}
                                >
                                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-indigo-400" />}
                                    {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border ${
                    message.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                }`}>
                    <Sparkles className="w-4 h-4" /> {message.text}
                </div>
            )}
        </div>
    );
};

export default AiFetchSection;
