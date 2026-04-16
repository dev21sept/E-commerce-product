import React, { useState, useEffect, useRef } from 'react';
import { Package, Image as ImageIcon, Plus, X, Loader2, Sparkles, AlertCircle, ChevronDown, User, ExternalLink, Tag, Upload, Search, Check, TrendingUp, FileText, Save, Layers, Zap, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { searchCategories, analyzeProduct, getCategoryAspects } from '../services/api';
import { EBAY_CONDITIONS } from '../constants/ebayConditions';

const EBAY_CONDITION_NOTES = [
    "Pre-Owned In Excellent Condition.",
    "Pre-Owned In Great Condition.",
    "Pre-Owned In Good Condition.",
    "Pre-Owned In Good Condition. Has Some Stains, Please See Pictures.",
    "Pre-Owned In Good Condition. Has Some Flaws, Please See Pictures."
];

// --- UNIVERSAL SEARCHABLE DROPDOWN ---
const SearchableDropdown = ({ value, onSelect, options, placeholder = "Search..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        (typeof opt === 'string' ? opt : opt.label).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-10 px-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all font-bold text-sm text-gray-900 shadow-sm"
            >
                <span className="truncate">
                    {Array.isArray(value) ? value.join(', ') : (value || 'Select...')}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[5000] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder={placeholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-400 transition-all"
                                />
                            </div>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto scrollbar-thin">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, idx) => {
                                    const label = typeof opt === 'string' ? opt : opt.label;
                                    return (
                                        <div 
                                            key={idx}
                                            onClick={() => {
                                                onSelect(label);
                                                setIsOpen(false);
                                                setSearchTerm('');
                                            }}
                                            className={`px-4 py-3 text-xs font-bold cursor-pointer transition-colors border-b border-gray-25 last:border-0 hover:bg-blue-600 hover:text-white ${value === label ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span>{label}</span>
                                                {opt.description && <span className={`text-[9px] ${value === label ? 'text-blue-200' : 'text-gray-400'}`}>{opt.description}</span>}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="px-4 py-6 text-center text-[10px] font-bold text-gray-400 italic">No matches found</div>
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SearchableCondition = ({ value, onChange }) => (
    <SearchableDropdown value={value} onSelect={onChange} placeholder="Search condition..." options={EBAY_CONDITIONS} />
);

const SearchableGender = ({ value, onChange }) => (
    <SearchableDropdown value={value} onSelect={onChange} placeholder="Search gender..." options={['Men', 'Women', 'Unisex Kids', 'Unisex Adults', 'Girls', 'Boys']} />
);

const SearchableCategory = ({ value, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (searchTerm.length > 2) {
                const cats = await searchCategories(searchTerm);
                setResults(cats || []);
            }
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full min-h-[44px] h-auto py-2.5 px-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all font-bold text-[13px] text-gray-900 shadow-sm"
            >
                <div className="flex flex-col pr-4">
                    <span className="leading-tight">{typeof value === 'object' ? (value?.fullName || value?.name) : (value || 'Select Marketplace Category...')}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[5000] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder="Search categories (e.g. Shoes)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold outline-none focus:border-blue-400 transition-all"
                                />
                            </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                            {results.length > 0 ? (
                                results.map((cat, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => {
                                            onChange(cat.fullName, cat.id);
                                            setIsOpen(false);
                                        }}
                                        className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-blue-600 hover:text-white cursor-pointer transition-all"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[12px] font-bold leading-tight">{cat.fullName}</span>
                                            <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">ID: {cat.id}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-5 py-10 text-center text-xs font-bold text-gray-400">
                                    {searchTerm.length < 3 ? 'Type 3+ characters to search...' : 'Searching...'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ProductGallery = ({ images = [], onRemove }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    if (images.length === 0) return <div className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100" />;
    return (
        <div className="space-y-4">
            <div className="relative aspect-square rounded-[35px] overflow-hidden border border-gray-100 shadow-sm group bg-white">
                <img src={images[activeIndex]} className="w-full h-full object-contain p-4" alt="Main" />
                <button type="button" onClick={() => onRemove(activeIndex)} className="absolute top-4 right-4 p-2.5 bg-white/90 rounded-2xl text-rose-500 opacity-0 group-hover:opacity-100 transition-all shadow-md"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {images.map((img, idx) => (
                    <button key={idx} type="button" onClick={() => setActiveIndex(idx)} className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0 transition-all ${activeIndex === idx ? 'border-blue-600 ring-4 ring-blue-50' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                        <img src={img} className="w-full h-full object-cover" />
                    </button>
                ))}
            </div>
        </div>
    );
};

const SearchableSelect = ({ label, value, options = [], onChange, metrics }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const filteredOptions = (options || []).filter(opt => String(opt).toLowerCase().includes(searchTerm.toLowerCase()));
    return (
        <div className="flex items-center justify-between py-5 border-b border-gray-50 group relative bg-white" ref={wrapperRef}>
            <div className="w-[35%] flex flex-col group">
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-black text-gray-700 uppercase tracking-tight">{label}</span>
                    {metrics}
                </div>
            </div>
            <div className="w-[63%] relative">
                <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent hover:border-blue-200 flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'bg-white ring-4 ring-blue-50 border-blue-600 shadow-sm' : ''}`}>
                    <span className={`text-xs ${value ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                        {Array.isArray(value) ? value.join(', ') : (value || 'Type or Select...')}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 bg-gray-50 border-b border-gray-100">
                            <input autoFocus type="text" placeholder="Search values..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => (
                                <div key={i} onClick={() => { onChange(opt); setIsOpen(false); }} className={`px-4 py-3 text-xs font-bold transition-all cursor-pointer border-b border-gray-25 last:border-0 hover:bg-blue-600 hover:text-white ${String(value) === String(opt) ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}>
                                    {Array.isArray(opt) ? opt.join(', ') : opt}
                                </div>
                            )) : <div onClick={() => { onChange(searchTerm); setIsOpen(false); }} className="px-4 py-4 text-xs font-bold text-blue-600 hover:bg-blue-50 cursor-pointer italic">Use custom: "{searchTerm}"</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MINIMALIST CONDITION NOTES COMPONENT ---
const ConditionNotesSection = ({ value = "", onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    // Auto-detect if current value is "custom" (not in predefined list but not empty)
    const isPredefined = EBAY_CONDITION_NOTES.includes(value);
    const [showCustom, setShowCustom] = useState(value && !isPredefined);
    
    const wrapperRef = useRef(null);
    const ALL_NOTES = [...EBAY_CONDITION_NOTES, "Add Custom description..."];

    useEffect(() => {
        // Sync showCustom if value changes from outside (e.g. initialization)
        if (value && !EBAY_CONDITION_NOTES.includes(value)) {
            setShowCustom(true);
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (note) => {
        if (note === "Add Custom description...") {
            setShowCustom(true);
            onChange("");
        } else {
            setShowCustom(false);
            onChange(note);
        }
        setIsOpen(false);
    };

    return (
        <div className="space-y-2 relative" ref={wrapperRef}>
            
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 bg-white border flex items-center justify-between cursor-pointer transition-all rounded-xl ${isOpen ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
                <span className={`text-xs font-bold truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                    {showCustom ? "Custom Note Active" : (value || 'Select Note...')}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
                    >
                        {ALL_NOTES.map((note, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleSelect(note)}
                                className={`px-4 py-4 text-xs font-bold hover:bg-slate-900 hover:text-white cursor-pointer transition-all border-b border-gray-50 last:border-0 ${value === note ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'} ${note.includes('Custom') ? 'bg-amber-50 text-amber-700' : ''}`}
                            >
                                {note}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {showCustom && (
                <div className="mt-2 animate-in slide-in-from-top-2">
                    <input 
                        autoFocus
                        type="text"
                        placeholder="Type custom note..."
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-4 py-3 bg-amber-50/20 border-2 border-amber-100 focus:border-amber-400 focus:bg-white rounded-xl text-xs font-bold transition-all outline-none"
                    />
                </div>
            )}
        </div>
    );
};

// --- UNIVERSAL PRODUCT FORM ---
const ProductForm = ({ initialData, onSubmit, isFetching }) => {
    const [formData, setFormData] = useState({
        title: '',
        brand: '',
        condition_name: '',
        condition_notes: '',
        gender: '',
        category: '',
        categoryId: '',
        retail_price: '',
        selling_price: '',
        discount_percentage: '',
        sku: '',
        item_specifics: {},
        images: [],
        variations: [],
        description: '',
        officialAspects: [],
        source: 'universal'
    });

    const [aspectsLoading, setAspectsLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => {
                // Determine category display string
                let categoryDisplay = initialData.category;
                if (typeof initialData.category === 'object' && initialData.category !== null) {
                    categoryDisplay = initialData.category.fullName || initialData.category.name || '';
                }

                return {
                    ...prev,
                    ...initialData,
                    category: categoryDisplay || '',
                    categoryId: initialData.categoryId || (typeof initialData.category === 'object' ? initialData.category.id : initialData.category_id) || '',
                    retail_price: initialData.retail_price || '',
                    selling_price: initialData.selling_price || '',
                    discount_percentage: initialData.discount_percentage || '',
                    sku: initialData.sku || '',
                    item_specifics: typeof initialData.item_specifics === 'string'
                        ? JSON.parse(initialData.item_specifics)
                        : initialData.item_specifics || {},
                    officialAspects: initialData.officialAspects || prev.officialAspects || [],
                    images: initialData.images || [],
                    variations: initialData.variations || []
                };
            });
        }
    }, [initialData]);

    // FETCH ASPECTS IF MISSING IN EDIT MODE
    useEffect(() => {
        const fetchMissingAspects = async () => {
            const catId = formData.categoryId || (typeof initialData?.category === 'object' ? initialData.category.id : initialData?.category_id);
            if (catId && (!formData.officialAspects || formData.officialAspects.length === 0) && !aspectsLoading) {
                setAspectsLoading(true);
                try {
                    const aspects = await getCategoryAspects(catId);
                    setFormData(prev => ({ ...prev, officialAspects: aspects || [], categoryId: catId }));
                } catch (e) {
                    console.error('Failed to fetch aspects in Edit mode:', e);
                } finally {
                    setAspectsLoading(false);
                }
            }
        };
        if (initialData) fetchMissingAspects();
    }, [formData.categoryId, initialData, aspectsLoading]);

    const handleChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };
    const handleItemSpecificsChange = (k, v) => setFormData(p => ({ ...p, item_specifics: { ...p.item_specifics, [k]: v } }));
    const removeImage = (i) => setFormData(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }));

    const handleCategoryChange = async (fullName, id) => {
        setFormData(prev => ({ ...prev, category: fullName, categoryId: id }));
        if (id) {
            try {
                const aspects = await getCategoryAspects(id);
                setFormData(prev => ({ ...prev, officialAspects: aspects || [] }));
            } catch (e) { console.error('Aspect fetch failed:', e); }
        }
    };

    const handleFileUpload = (e) => {
        Array.from(e.target.files).forEach(f => {
            const r = new FileReader();
            r.onloadend = () => setFormData(p => ({ ...p, images: [...p.images, r.result] }));
            r.readAsDataURL(f);
        });
    };

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };

    return (
        <form onSubmit={handleSubmit} className="space-y-12 pb-24">
            {initialData?.source === 'scraped' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full w-fit text-[10px] font-black uppercase tracking-widest border border-blue-100">
                    <Sparkles className="w-3 h-3" /> Scraped Data
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-12">
                     <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">1</span>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Basic Information</h2>
                    </div>

                    {/* Main Title & Price */}
                    <div className="space-y-8">
                        <textarea
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            rows="2"
                            className="w-full text-5xl font-black text-slate-900 border-none outline-none p-0 resize-none leading-tight tracking-tighter bg-transparent"
                            placeholder="Enter Listing Title..."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pt-8 border-t border-gray-100">
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Price ($)</label>
                                <input type="number" name="selling_price" value={formData.selling_price} onChange={handleChange} className="text-3xl font-black text-blue-600 bg-transparent border-none outline-none w-full" />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block font-mono">Brand</label>
                                <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="text-lg font-bold text-gray-700 bg-transparent border-b border-gray-50 outline-none w-full py-1" placeholder="Brand..." />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block font-mono">Custom SKU</label>
                                <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="text-lg font-bold text-gray-700 bg-transparent border-b border-gray-50 outline-none w-full py-1" placeholder="SKU (Optional)..." />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block font-mono">Gender</label>
                                <SearchableGender value={formData.gender} onChange={(val) => setFormData(p => ({ ...p, gender: val }))} />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block font-mono">Condition</label>
                                <SearchableCondition value={formData.condition_name} onChange={(val) => setFormData(p => ({ ...p, condition_name: val }))} />
                            </div>
                        </div>

                        {/* Category Row */}
                        <div className="pt-6">
                             <label className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-3 block font-bold">eBay Taxonomy Category</label>
                             <SearchableCategory value={formData.category} onChange={handleCategoryChange} />
                        </div>

                        {/* Condition Notes - Hide if condition starts with "New" */}
                        <AnimatePresence>
                            {formData.condition_name && !formData.condition_name.toLowerCase().startsWith('new') && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                                     <div className="pt-6">
                                        <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-3 block font-mono">Condition Notes</label>
                                        <ConditionNotesSection value={formData.condition_notes} onChange={(val) => setFormData(p => ({ ...p, condition_notes: val }))} />
                                     </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Aspects Section */}
                    <div className="pt-12 border-t border-gray-100">
                         <div className="flex items-center gap-3 mb-8">
                            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">2</span>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Marketplace Specifics</h2>
                        </div>
                        <div className="flex items-center justify-between mb-8">
                             <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">Required Specifics</h3><p className="text-xs text-slate-400 font-medium">Synced with eBay Marketplace taxonomy.</p></div>
                             <button type="button" onClick={() => { const k = prompt('Field Name:'); if(k) handleItemSpecificsChange(k, ''); }} className="px-5 py-2 bg-slate-50 text-slate-500 rounded-full text-xs font-black border border-slate-100">Add Custom Field</button>
                        </div>
                        <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm divide-y divide-gray-50">
                            {/* 1. Official eBay Aspects */}
                            {formData.officialAspects && formData.officialAspects.length > 0 ? formData.officialAspects.map((aspect) => {
                                const matchedKey = Object.keys(formData.item_specifics).find(k => k.toLowerCase() === aspect.localizedAspectName.toLowerCase());
                                const value = matchedKey ? formData.item_specifics[matchedKey] : '';
                                return (
                                    <SearchableSelect 
                                        key={aspect.localizedAspectName} 
                                        label={aspect.localizedAspectName} 
                                        value={value} 
                                        options={aspect.values || []} 
                                        metrics={<span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{aspect.usage}</span>}
                                        onChange={(val) => handleItemSpecificsChange(aspect.localizedAspectName, val)} 
                                    />
                                );
                            }) : (
                                aspectsLoading ? (
                                    <div className="py-12 text-center bg-gray-50/30 rounded-3xl">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-3" />
                                        <p className="text-gray-400 text-xs font-bold italic tracking-tight">Syncing Marketplace Aspects...</p>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center bg-red-50/20 rounded-3xl border border-dashed border-red-100">
                                        <p className="text-red-400 text-xs font-bold italic">No official aspects found or failed to load. (Category: {formData.categoryId})</p>
                                    </div>
                                )
                            )}

                            {/* 2. Custom/Additional Specifics (Those not in official aspects) */}
                            {Object.entries(formData.item_specifics).map(([key, value]) => {
                                // Skip if it's already rendered as an official aspect
                                const isOfficial = formData.officialAspects?.some(a => a.localizedAspectName.toLowerCase() === key.toLowerCase());
                                if (isOfficial) return null;

                                return (
                                    <SearchableSelect 
                                        key={key} 
                                        label={key} 
                                        value={value} 
                                        options={[]} 
                                        metrics={<span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">CUSTOM</span>}
                                        onChange={(val) => handleItemSpecificsChange(key, val)} 
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Variations */}
                    {formData.variations?.length > 0 && (
                        <div className="pt-12 border-t border-gray-100">
                            <div className="flex items-center gap-3 mb-8">
                                <Layers className="w-5 h-5 text-orange-500" /><h3 className="text-xl font-black text-slate-900">Product Variations</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.variations.map((v, i) => (
                                    <div key={i} className="bg-orange-50/30 p-6 rounded-[30px] border border-orange-100/50">
                                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3 block">{v.name}</label>
                                        <div className="flex flex-wrap gap-2">{v.values.map((val, idx) => <span key={idx} className="px-3 py-1 bg-white text-orange-700 text-[11px] font-bold rounded-xl border border-orange-100 shadow-sm">{val}</span>)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="pt-12 border-t border-gray-100">
                        <div className="bg-slate-900 rounded-[50px] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center gap-3 mb-10"><FileText className="w-6 h-6 text-blue-400" /><h3 className="text-xl font-black uppercase tracking-widest">Description Engine</h3></div>
                            <div contentEditable={true} className="min-h-[400px] outline-none text-slate-300 text-lg leading-relaxed prose prose-invert max-w-none" onBlur={(e) => setFormData(p => ({ ...p, description: e.target.innerHTML }))} dangerouslySetInnerHTML={{ __html: formData.description }} />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-10">
                    <div className="sticky top-10 space-y-10">
                        {/* Media Display */}
                        <div className="bg-white rounded-[40px] border border-gray-100 p-6 shadow-sm">
                             <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-400" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Media Assets</span></div>
                                <label className="cursor-pointer text-[10px] font-bold text-blue-600 px-3 py-1 bg-blue-50 rounded-full hover:bg-blue-100 transition-all"><Plus className="w-3 h-3 inline mr-1" /> Add<input type="file" multiple className="hidden" onChange={handleFileUpload} /></label>
                             </div>
                             <ProductGallery images={formData.images} onRemove={removeImage} />
                        </div>

                        {/* Action Buttons - Compact Grid */}
                        <div className="bg-white rounded-[40px] border border-gray-100 p-6 shadow-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <button type="submit" disabled={isFetching} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                                    {isFetching ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} {initialData?.id ? 'Update' : 'Save'}
                                </button>
                                <button type="button" onClick={() => { window.postMessage({ type: "EbayAutoLister_SendData", payload: formData }, "*"); alert("DATA SYNCED!"); }} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                                    <ExternalLink className="w-4 h-4" /> Push (Ext)
                                </button>
                                <button type="button" disabled={isFetching} onClick={() => onSubmit(formData, true)} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
                                    <Zap className="w-4 h-4" /> List (API)
                                </button>
                                <button type="button" disabled={isFetching} onClick={() => onSubmit(formData, true, true)} className="py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-all">
                                    <FileText className="w-4 h-4" /> Draft
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default ProductForm;
