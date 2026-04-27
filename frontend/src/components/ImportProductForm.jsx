import React, { useState, useEffect, useRef } from 'react';
import { Package, Image as ImageIcon, Plus, X, Loader2, Sparkles, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, User, ExternalLink, Tag, Upload, Search, Check, TrendingUp, FileText, Save, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { searchCategories, getCategoryAspects } from '../services/api';
import { EBAY_CONDITIONS } from '../constants/ebayConditions';

// --- SHARED DROPDOWNS ---
const EBAY_CONDITION_NOTES = [
    "Pre-Owned In Excellent Condition.",
    "Pre-Owned In Great Condition.",
    "Pre-Owned In Good Condition.",
    "Pre-Owned In Good Condition. Has Some Stains, Please See Pictures.",
    "Pre-Owned In Good Condition. Has Some Flaws, Please See Pictures."
];

const ConditionNotesSection = ({ value = "", onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const wrapperRef = useRef(null);
    const ALL_NOTES = [...EBAY_CONDITION_NOTES, "Add Custom description..."];

    useEffect(() => {
        const isPredefined = EBAY_CONDITION_NOTES.includes(value);
        if (value && !isPredefined) setShowCustom(true);
        else if (isPredefined) setShowCustom(false);
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
            <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-4 py-3 bg-white border flex items-center justify-between cursor-pointer shadow-sm transition-all rounded-xl ${isOpen ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className={`text-xs font-bold truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>{showCustom ? "Custom Note Active" : (value || 'Select Note...')}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[3000] overflow-hidden">
                        {ALL_NOTES.map((note, idx) => (
                            <div key={idx} onClick={() => handleSelect(note)} className={`px-4 py-3 text-xs font-bold hover:bg-indigo-600 hover:text-white cursor-pointer transition-all border-b border-gray-50 last:border-0 ${value === note ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'} ${note.includes('Custom') ? 'bg-amber-50 text-amber-600' : ''}`}>
                                {note}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            {showCustom && (
                <div className="mt-2 animate-in slide-in-from-top-2">
                    <input autoFocus type="text" placeholder="Type custom note..." value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 bg-amber-50/20 border-2 border-amber-100 focus:border-amber-400 focus:bg-white rounded-xl text-xs font-bold transition-all outline-none" />
                </div>
            )}
        </div>
    );
};

// --- SEARCHABLE DROPDOWN ---
const SearchableDropdown = ({ value, onSelect, options = [], placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = options.filter(opt => 
        (typeof opt === 'string' ? opt : (opt.label || '')).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-4 py-3 bg-[#F8F9FA] rounded-[15px] border border-transparent hover:border-gray-200 transition-all flex items-center justify-between cursor-pointer ${isOpen ? 'bg-white ring-2 ring-indigo-50 border-indigo-500 shadow-sm' : ''}`}>
                <span className={`text-[13px] ${value ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'}`}>
                    {typeof value === 'object' ? value?.label : (value || placeholder)}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[4000] overflow-hidden">
                        <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                            <input autoFocus type="text" placeholder="Filter..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] outline-none focus:border-indigo-500 shadow-inner" />
                        </div>
                        <div className="max-h-60 overflow-y-auto py-1">
                            {filtered.length > 0 ? filtered.map((opt, i) => {
                                const label = typeof opt === 'string' ? opt : opt.label;
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => { onSelect(label); setIsOpen(false); }} 
                                        className={`px-4 py-3 cursor-pointer transition-all border-b border-slate-50 last:border-0 hover:bg-indigo-600 hover:text-white ${value === label ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold">{label}</span>
                                            {opt.description && <span className={`text-[10px] ${value === label ? 'text-indigo-200' : 'text-slate-400'}`}>{opt.description}</span>}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="p-4 text-center text-xs text-slate-400 italic">No results found</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SearchableCondition = ({ value, onChange }) => (
    <SearchableDropdown value={value} onSelect={(val) => onChange(val)} placeholder="Search condition..." options={EBAY_CONDITIONS} />
);

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
                            className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0 transition-all snap-center ${activeIndex === idx ? 'border-indigo-600 scale-90 shadow-md ring-4 ring-indigo-50' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-95'}`}
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
                    <span className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">
                        {label}
                    </span>
                    {metrics && <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap italic">{metrics}</span>}
                </div>
            </div>
            <div className="w-[63%] relative">
                <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-4 py-3 bg-[#F8F9FA] rounded-xl border border-transparent hover:border-gray-400 flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'bg-white ring-2 ring-blue-100 border-blue-600 shadow-sm' : ''}`}>
                    <span className={`text-[13px] ${value ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>{value || 'Select or type...'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </div>
                <AnimatePresence>
                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-2xl shadow-2xl z-[1000] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-3 bg-gray-50 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input autoFocus type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-600 shadow-inner" />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto py-1">
                                {filteredOptions.map((opt, i) => (
                                    <div key={i} onClick={() => { onChange(opt); setIsOpen(false); setSearchTerm(''); }} className="px-4 py-3 text-[13px] text-gray-700 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center justify-between font-medium">
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

const SearchableCategory = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length > 2) {
                setIsLoading(true);
                try {
                    const data = await searchCategories(searchTerm);
                    setSuggestions(data);
                } catch (e) {
                    console.error('Search failed:', e);
                } finally {
                    setIsLoading(false);
                }
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-6 py-5 bg-indigo-50/50 border border-indigo-100 rounded-[30px] flex items-center justify-between cursor-pointer hover:border-indigo-400 hover:bg-white transition-all ${isOpen ? 'ring-4 ring-indigo-50 border-indigo-500 bg-white' : ''}`}>
                <div className="flex-1 pr-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-2 font-mono">Marketplace Classification</span>
                    <span className="text-lg font-black text-indigo-900 leading-tight whitespace-normal break-words underline decoration-indigo-200 decoration-2 underline-offset-4">
                        {value || 'Select Official eBay Category...'}
                    </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center shadow-sm shrink-0">
                    <ChevronDown className={`w-6 h-6 text-indigo-500 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-200 rounded-[30px] shadow-2xl z-[2000] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="p-6 bg-gray-50 border-b border-gray-100">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Official eBay Category Search</h4>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input autoFocus type="text" placeholder="Type category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-600 shadow-sm" />
                                {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />}
                            </div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                            {suggestions.map((s, i) => (
                                <div key={i} onClick={() => { onChange(s.fullName, s.id); setIsOpen(false); }} className="px-6 py-5 border-b border-gray-50 hover:bg-blue-600 group cursor-pointer transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-500/20 flex items-center justify-center shrink-0"><Layers className="w-5 h-5 text-blue-600 group-hover:text-white" /></div>
                                        <div className="flex flex-col"><span className="text-[13px] font-bold text-gray-900 group-hover:text-white leading-tight">{s.fullName}</span><span className="text-[10px] font-black group-hover:text-blue-100 text-gray-400 uppercase tracking-widest mt-1">ID: {s.id}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ImportProductForm = ({ initialData, onSubmit, isFetching }) => {
    const [formData, setFormData] = useState({ title: '', description: '', category: '', categoryId: '', brand: '', condition_name: '', retail_price: '', selling_price: '', ebay_url: '', item_specifics: {}, officialAspects: [], images: [], variations: [] });
    const [aspectsLoading, setAspectsLoading] = useState(false);
    const descriptionRef = useRef(null);

    useEffect(() => { 
        if (initialData) { 
            setFormData(prev => ({ 
                ...prev, 
                ...initialData, 
                categoryId: initialData.categoryId || (typeof initialData.category === 'object' ? initialData.category.id : initialData.category_id) || '',
                item_specifics: typeof initialData.item_specifics === 'string' ? JSON.parse(initialData.item_specifics) : initialData.item_specifics || {}, 
                officialAspects: initialData.officialAspects || prev.officialAspects || [], 
                images: initialData.images || [], 
                variations: initialData.variations || [] 
            })); 
        }
    }, [initialData]);

    // FETCH ASPECTS IF MISSING IN EDIT MODE
    useEffect(() => {
        const fetchMissingAspects = async () => {
            const catId = formData.categoryId;
            if (catId && (!formData.officialAspects || formData.officialAspects.length === 0) && !aspectsLoading) {
                setAspectsLoading(true);
                try {
                    const aspects = await getCategoryAspects(catId);
                    setFormData(prev => ({ ...prev, officialAspects: aspects || [] }));
                } catch (e) {
                    console.error('Failed to fetch aspects in Edit mode:', e);
                } finally {
                    setAspectsLoading(false);
                }
            }
        };
        if (initialData) fetchMissingAspects();
    }, [formData.categoryId, initialData, aspectsLoading]);

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
    const handlePreSubmit = (e, isListing = false, isDraft = false) => {
        e.preventDefault();
        const finalDescription = descriptionRef.current ? descriptionRef.current.innerHTML : formData.description;
        onSubmit({ ...formData, description: finalDescription }, isListing, isDraft);
    };

    const removeVariationValue = (vIdx, valIdx) => {
        const newVars = [...formData.variations];
        newVars[vIdx].values = newVars[vIdx].values.filter((_, i) => i !== valIdx);
        setFormData(p => ({ ...p, variations: newVars }));
    };

    const addVariationValue = (vIdx) => {
        const val = prompt("Enter new value for " + formData.variations[vIdx].name);
        if (val) {
            const newVars = [...formData.variations];
            newVars[vIdx].values.push(val);
            setFormData(p => ({ ...p, variations: newVars }));
        }
    };

    return (
        <form onSubmit={(e) => handlePreSubmit(e, false, false)} className="space-y-12 pb-24">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-8 space-y-12">
                    <div className="space-y-8">
                        <textarea name="title" value={formData.title} onChange={handleChange} rows="2" className="w-full text-5xl font-black text-gray-900 border-none outline-none p-0 resize-none leading-tight tracking-tighter bg-transparent" placeholder="Enter Listing Title..." />
                        
                        <div className="pt-2">
                             <SearchableCategory value={formData.category} onChange={handleCategoryChange} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-gray-100">
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Price (₹)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-black text-slate-300">₹</span>
                                    <input type="number" name="selling_price" value={formData.selling_price} onChange={handleChange} className="text-4xl font-black text-emerald-600 bg-transparent border-none outline-none w-full" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block font-mono">Brand Name</label>
                                <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="text-2xl font-black text-slate-800 bg-transparent border-none outline-none w-full placeholder:text-slate-100 italic" placeholder="Brand..." />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block font-mono">Condition</label>
                                <SearchableCondition 
                                    value={formData.condition_name} 
                                    onChange={(selected) => {
                                        if (typeof selected === 'object') {
                                            setFormData(p => ({ ...p, condition_name: selected.label, condition_id: selected.id }));
                                        } else {
                                            setFormData(p => ({ ...p, condition_name: selected }));
                                        }
                                    }} 
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block font-mono">Inventory SKU</label>
                                <input 
                                    type="text" 
                                    name="sku" 
                                    value={formData.sku || ''} 
                                    onChange={handleChange} 
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 outline-none focus:ring-4 focus:ring-slate-100 transition-all font-mono" 
                                    placeholder="Enter SKU..." 
                                />
                            </div>
                        </div>

                        {/* Condition Notes - Hide if condition is New */}
                        <AnimatePresence>
                            {formData.condition_name && !formData.condition_name.toLowerCase().includes('new') && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-6">
                                     <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-3 block font-mono italic">Specific Condition Notes</label>
                                     <ConditionNotesSection value={formData.condition_notes} onChange={(val) => setFormData(p => ({ ...p, condition_notes: val }))} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="pt-12 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-10"><div><h3 className="text-2xl font-black text-gray-900 tracking-tight italic">eBay Item Specifics</h3><p className="text-xs text-gray-400 font-medium">Scraped directly from source listing & mapped to API.</p></div></div>
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
                                    <div className="py-12 text-center bg-gray-50/5 rounded-3xl">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-3" />
                                        <p className="text-gray-400 text-xs font-bold italic tracking-tight">Syncing Marketplace Aspects...</p>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center bg-red-50/20 rounded-3xl border border-dashed border-red-100">
                                        <p className="text-red-400 text-xs font-bold italic">No official aspects found or failed to load.</p>
                                    </div>
                                )
                            )}

                            {/* 2. Custom/Additional Specifics */}
                            {Object.entries(formData.item_specifics).map(([key, value]) => {
                                const lowerKey = key.toLowerCase();
                                const isOfficial = formData.officialAspects?.some(a => a.localizedAspectName.toLowerCase() === lowerKey);
                                
                                // BLACKLIST REDUNDANT FIELDS
                                const isBlacklisted = ['condition', 'policy', 'return policy', 'shipping', 'payment', 'seller notes'].some(b => lowerKey.includes(b));
                                
                                if (isOfficial || isBlacklisted) return null;
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
                    {formData.variations && formData.variations.length > 0 && (
                        <div className="pt-12 border-t border-gray-100">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Scraped Variations</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.variations.map((v, vIdx) => (
                                    <div key={vIdx} className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                                            <button type="button" onClick={() => addVariationValue(vIdx)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-3">{v.name}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {v.values.map((val, valIdx) => (
                                                <span key={valIdx} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-[11px] font-bold rounded-xl border border-orange-100 flex items-center gap-2 group/pill">
                                                    {val}
                                                    <button type="button" onClick={() => removeVariationValue(vIdx, valIdx)} className="hover:text-rose-500 opacity-0 group-hover/pill:opacity-100 transition-all">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            {v.values.length === 0 && <span className="text-[10px] text-gray-400 italic">No values defined</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="pt-12 border-t border-gray-100">
                        <div className="bg-gray-900 rounded-[50px] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden">
                            <h3 className="text-xl font-black uppercase tracking-widest mb-10 flex items-center gap-3">
                                <FileText className="w-6 h-6 text-indigo-400" /> Scraped Description
                            </h3>
                            <div 
                                ref={descriptionRef}
                                contentEditable={true} 
                                className="min-h-[400px] outline-none text-gray-300 text-lg leading-relaxed prose prose-invert max-w-none shadow-description" 
                                onBlur={(e) => setFormData(p => ({ ...p, description: e.target.innerHTML }))} 
                                dangerouslySetInnerHTML={{ __html: formData.description }} 
                            />
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-4 space-y-10 sticky top-10">
                    <div className="bg-white rounded-[40px] border border-gray-100 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Gallery</span>
                        </div>
                        <ProductGallery images={formData.images} onRemove={removeImage} />
                    </div>
                    
                    <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <button type="submit" disabled={isFetching} className="py-5 bg-slate-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all">
                                {isFetching ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Update
                            </button>
                            <button type="button" disabled={isFetching} onClick={(e) => handlePreSubmit(e, true, true)} className="py-5 bg-amber-500 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-lg shadow-amber-100">
                                <FileText className="w-4 h-4"/> Draft
                            </button>
                            <button type="button" disabled={isFetching} onClick={(e) => handlePreSubmit(e, true, false)} className="py-5 bg-indigo-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                                <Plus className="w-4 h-4"/> List API
                            </button>
                            <button 
                                type="button" 
                                onClick={() => { 
                                    console.log("%c [Frontend]  Pushing Data TO EXTENSION:", "color: #10B981; font-weight: bold;", formData);
                                    window.postMessage({ type: "EbayAutoLister_SendData", payload: formData }, "*"); 
                                    alert("DATA SYNCED TO EXTENSION!"); 
                                }} 
                                className="py-5 bg-blue-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                            >
                                <ExternalLink className="w-4 h-4" /> Push EXT
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
};
export default ImportProductForm;
