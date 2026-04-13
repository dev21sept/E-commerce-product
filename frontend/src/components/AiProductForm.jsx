import React, { useState, useEffect, useRef } from 'react';
import { Package, Image as ImageIcon, Plus, X, Loader2, Sparkles, AlertCircle, ChevronDown, User, ExternalLink, Tag, Upload, Search, Check, TrendingUp, FileText, Save, Layers, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { searchCategories, analyzeProduct, getCategoryAspects } from '../services/api';
import { EBAY_CONDITIONS } from '../constants/ebayConditions';

const EBAY_CONDITION_NOTES = [
    "Pre-Owned In Excellent Condition.",
    "Pre-Owned In Great Condition.",
    "Pre-Owned In Good Condition.",
    "Pre-Owned In Good Condition. Has Some Stains, Please See Pictures.",
    "Pre-Owned In Good Condition. Has Some Flaws, Please See Pictures."
];

// --- SHARED SEARCHABLE DROPDOWN COMPONENT ---
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
                className="w-full h-10 px-4 bg-white/50 border border-indigo-50 rounded-xl flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-all font-bold text-sm text-indigo-900 shadow-sm"
            >
                <span className="truncate">{value || 'Select...'}</span>
                <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-indigo-50 rounded-2xl shadow-2xl z-[5000] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-indigo-50 bg-indigo-25/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-300" />
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder={placeholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all"
                                />
                            </div>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-100">
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
                                            className={`px-4 py-3 text-xs font-bold cursor-pointer transition-colors border-b border-indigo-25 last:border-0 hover:bg-indigo-600 hover:text-white ${value === label ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span>{label}</span>
                                                {opt.description && <span className={`text-[9px] ${value === label ? 'text-indigo-200' : 'text-gray-400'}`}>{opt.description}</span>}
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
    <SearchableDropdown 
        value={value} 
        onSelect={onChange} 
        placeholder="Search condition..."
        options={EBAY_CONDITIONS}
    />
);

const SearchableGender = ({ value, onChange }) => (
    <SearchableDropdown 
        value={value} 
        onSelect={onChange} 
        placeholder="Search gender..."
        options={['Men', 'Women', 'Unisex Kids', 'Unisex Adults', 'Girls', 'Boys']}
    />
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
                className="w-full h-10 px-4 bg-white/50 border border-indigo-50 rounded-xl flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-all font-bold text-sm text-indigo-900 shadow-sm"
            >
                <div className="flex flex-col truncate">
                    <span className="text-xs font-black truncate">{value?.name || 'Select Category...'}</span>
                    {value?.path && <span className="text-[9px] text-indigo-400 truncate tracking-tighter opacity-70">{value.path}</span>}
                </div>
                <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-indigo-50 rounded-2xl shadow-2xl z-[5000] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-indigo-50 bg-indigo-25/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-300" />
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder="Search eBay categories..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all"
                                />
                            </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-100 italic">
                            {results.length > 0 ? (
                                results.map((cat, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => {
                                            onChange(cat);
                                            setIsOpen(false);
                                        }}
                                        className="px-4 py-3 border-b border-indigo-25 last:border-0 hover:bg-indigo-600 hover:text-white cursor-pointer transition-all"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-black">{cat.name}</span>
                                            <span className="text-[9px] opacity-70">{cat.path}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-[10px] font-bold text-gray-400">
                                    {searchTerm.length < 3 ? 'Type 3+ chars to search...' : 'Searching...'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- PRODUCT GALLERY COMPONENT ---
const ProductGallery = ({ images = [], onRemove }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef(null);

    // KEYBOARD NAVIGATION
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') setActiveIndex(p => (p === 0 ? images.length - 1 : p - 1));
            if (e.key === 'ArrowRight') setActiveIndex(p => (p === images.length - 1 ? 0 : p + 1));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [images.length]);

    // SYNC SCROLL WHEN ACTIVE INDEX CHANGES
    useEffect(() => {
        if (scrollRef.current) {
            const activeThumbnail = scrollRef.current.children[activeIndex];
            if (activeThumbnail) {
                activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeIndex]);

    if (images.length === 0) return (
        <div className="aspect-square bg-slate-50 rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <ImageIcon className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-[10px] uppercase font-black tracking-widest">No Images</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Main Preview */}
            <div className="relative aspect-square rounded-[40px] overflow-hidden border border-slate-100 shadow-inner group bg-white">
                <img src={images[activeIndex]} className="w-full h-full object-contain p-4 transition-all duration-500 scale-100 group-hover:scale-105" alt="Main product" />
                <button 
                    type="button"
                    onClick={() => onRemove(activeIndex)}
                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-2xl text-rose-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
                
                {images.length > 1 && (
                    <>
                        <button 
                            type="button"
                            onClick={() => setActiveIndex(p => (p === 0 ? images.length - 1 : p - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg text-slate-800 opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveIndex(p => (p === images.length - 1 ? 0 : p + 1))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg text-slate-800 opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1 opacity-100 transition-all">
                            {images.map((_, i) => (
                                <div key={i} className={`h-1 rounded-full transition-all ${i === activeIndex ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-400/50'}`} />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Thumbnails Slider with Smooth Scroll */}
            <div className="relative group/slider">
                <div 
                    ref={scrollRef}
                    className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 px-1 cursor-pointer active:cursor-grabbing snap-x snap-mandatory pr-10"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveIndex(idx)}
                            className={`relative w-24 h-24 rounded-2xl overflow-hidden border-2 shrink-0 transition-all snap-center ${activeIndex === idx ? 'border-indigo-600 scale-90 shadow-md ring-4 ring-indigo-50' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-95'}`}
                        >
                            <img src={img} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- SEARCHABLE SELECT FOR ASPECTS ---
const SearchableSelect = ({ label, value, options = [], onChange, metrics }) => {
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

    const filteredOptions = (options || []).filter(opt => String(opt).toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="flex items-center justify-between py-5 border-b border-gray-100 group relative bg-white" ref={wrapperRef}>
            <div className="w-[35%] flex flex-col group">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-indigo-700 uppercase tracking-tight">
                        {label}
                    </span>
                    {metrics && <span className="text-[11px] text-indigo-400/60 font-medium whitespace-nowrap italic">{metrics}</span>}
                </div>
            </div>
            <div className="w-[63%] relative">
                <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent hover:border-indigo-400 flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'bg-white ring-2 ring-indigo-100 border-indigo-600 shadow-sm' : ''}`}>
                    <span className={`text-[13px] ${value ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>{value || 'Select or type...'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                </div>
                <AnimatePresence>
                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-2xl shadow-2xl z-[1000] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-3 bg-gray-50 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input autoFocus type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-600 shadow-inner" />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-200">
                                {filteredOptions.map((opt, i) => (
                                    <div key={i} onClick={() => { onChange(opt); setIsOpen(false); setSearchTerm(''); }} className="px-4 py-3 text-[13px] text-gray-700 hover:bg-indigo-600 hover:text-white cursor-pointer flex items-center justify-between font-medium">
                                        {opt}
                                        {String(value) === String(opt) && <Check className="w-4 h-4 text-current" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// --- MINIMALIST CONDITION NOTES COMPONENT ---
const ConditionNotesSection = ({ value = "", onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const wrapperRef = useRef(null);

    const ALL_NOTES = [...EBAY_CONDITION_NOTES, "Add Custom description..."];

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
            <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Condition Notes</label>
            
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
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[3000] overflow-hidden">
                        {ALL_NOTES.map((note, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleSelect(note)}
                                className={`px-4 py-3 text-xs font-bold hover:bg-indigo-600 hover:text-white cursor-pointer transition-all border-b border-gray-50 last:border-0 ${value === note ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'} ${note.includes('Custom') ? 'bg-amber-50 text-amber-600' : ''}`}
                            >
                                {note}
                            </div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Simple Custom Input - Only shows for custom note */}
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

const AiProductForm = ({ initialData, onSubmit, isFetching }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        categoryId: '',
        brand: '',
        condition_name: '',
        condition_notes: '',
        gender: 'Unisex',
        retail_price: '',
        selling_price: '',
        item_specifics: {},
        officialAspects: [],
        images: [],
        source: 'ai'
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                item_specifics: typeof initialData.item_specifics === 'string'
                    ? JSON.parse(initialData.item_specifics)
                    : initialData.item_specifics || {},
                officialAspects: initialData.officialAspects || prev.officialAspects || [],
                images: initialData.images || []
            }));
        }
    }, [initialData]);

    const handleItemSpecificsChange = (k, v) => setFormData(p => ({ ...p, item_specifics: { ...p.item_specifics, [k]: v } }));
    const handleChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };
    const removeImage = (i) => setFormData(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }));

    const handleCategoryChange = async (fullName, id) => {
        setFormData(prev => ({ ...prev, category: fullName, categoryId: id }));
        if (id) {
            try {
                const aspects = await getCategoryAspects(id);
                setFormData(prev => ({ ...prev, officialAspects: aspects || [] }));
            } catch (e) {
                console.error('Failed to fetch aspects:', e);
            }
        }
    };

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };

    return (
        <form onSubmit={handleSubmit} className="space-y-12 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-12">
                    <div className="space-y-8 bg-indigo-50/30 p-8 rounded-[40px] border border-indigo-100/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">AI Generated Content</span>
                        </div>
                        <textarea
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            rows="2"
                            className="w-full text-5xl font-black text-gray-900 border-none outline-none p-0 resize-none leading-tight tracking-tighter bg-transparent placeholder-indigo-200"
                            placeholder="AI Title..."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-8 border-t border-indigo-100">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Price ($)</label>
                                <div className="relative">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-indigo-300">$</span>
                                    <input type="number" name="selling_price" value={formData.selling_price} onChange={handleChange} className="text-2xl font-black text-indigo-600 bg-transparent border-none outline-none w-full pl-8" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Brand</label>
                                <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="text-lg font-bold text-indigo-900 bg-transparent border-b border-indigo-50 outline-none w-full py-2 hover:border-indigo-300 focus:border-indigo-600 transition-all placeholder:text-indigo-200" placeholder="Brand..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Gender</label>
                                <SearchableGender value={formData.gender} onChange={(val) => setFormData(p => ({ ...p, gender: val }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Category</label>
                                <SearchableCategory value={formData.category} onChange={handleCategoryChange} />
                            </div>
                        </div>

                        {/* DYNAMIC CONDITION NOTES SECTION */}
                        <AnimatePresence>
                            {formData.condition_name && !formData.condition_name.toLowerCase().includes('new') && (
                                <ConditionNotesSection 
                                    value={formData.condition_notes} 
                                    onChange={(val) => setFormData(p => ({ ...p, condition_notes: val }))} 
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="pt-12 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">AI Detected Specifics</h3>
                                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Vision Analysis Result</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-[40px] border border-indigo-50 p-8 shadow-sm">
                             {formData.officialAspects?.map((aspect, idx) => {
                                const aspectName = aspect.localizedAspectName;
                                // Find if we have a value for this aspect (case-insensitive key match)
                                const matchedKey = Object.keys(formData.item_specifics).find(k => k.toLowerCase() === aspectName.toLowerCase());
                                const value = matchedKey ? formData.item_specifics[matchedKey] : '';
                                
                                let statusLabel = aspect.usage; // RECOMMEND, OPTIONAL
                                if (aspect.required) statusLabel = 'REQUIRED';
                                if (value && matchedKey) statusLabel = 'AI ANALYZED';

                                return (
                                    <SearchableSelect 
                                        key={aspectName}
                                        label={aspectName}
                                        value={value}
                                        options={aspect.values || []}
                                        metrics={
                                            <span className={`${statusLabel === 'AI ANALYZED' ? 'text-indigo-500' : statusLabel === 'REQUIRED' ? 'text-rose-500' : 'text-gray-400'} font-bold uppercase tracking-widest text-[9px]`}>
                                                {statusLabel}
                                            </span>
                                        }
                                        onChange={(val) => handleItemSpecificsChange(aspectName, val)}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-12 border-t border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-8 tracking-tight flex items-center gap-3">
                             <ImageIcon className="w-6 h-6 text-indigo-500" /> Analyzed Images
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
                            {formData.images.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-[30px] overflow-hidden border border-indigo-50 group shadow-sm hover:shadow-lg transition-all">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 bg-white/90 p-2 rounded-xl text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"><X className="w-3 h-3"/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-12 border-t border-gray-100">
                        <div className="bg-gradient-to-br from-gray-900 to-indigo-950 rounded-[50px] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
                            <h3 className="text-xl font-black uppercase tracking-widest mb-10 flex items-center gap-3">
                                <Sparkles className="w-6 h-6 text-indigo-400" /> AI Description
                            </h3>
                            <div contentEditable={true} className="min-h-[400px] outline-none text-gray-300 text-lg leading-relaxed prose prose-invert max-w-none" 
                                onBlur={(e) => setFormData(p => ({ ...p, description: e.target.innerHTML }))} 
                                dangerouslySetInnerHTML={{ __html: formData.description }} 
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-10 sticky top-10">
                    <div className="bg-white rounded-[40px] border border-indigo-50 p-6 shadow-sm">
                         <div className="flex items-center gap-2 mb-6">
                            <ImageIcon className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest font-mono">AI Visual Evidence</span>
                        </div>
                        <ProductGallery images={formData.images} onRemove={removeImage} />
                    </div>
                    <div className="bg-white rounded-[40px] border border-indigo-50 p-8 shadow-sm space-y-4">
                        <button type="submit" disabled={isFetching} className="w-full py-6 bg-indigo-600 text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                            {isFetching ? <Loader2 className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5"/>} Save AI Listing
                        </button>
                        <button type="button" onClick={() => { window.postMessage({ type: "EbayAutoLister_SendData", payload: formData }, "*"); alert("AI DATA SYNCED!"); }} className="w-full py-6 bg-[#0064D2] text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-blue-700 transition-all">
                            <ExternalLink className="w-5 h-5" /> Push To eBay
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default AiProductForm;
