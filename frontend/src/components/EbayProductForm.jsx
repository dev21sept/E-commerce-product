import React, { useState, useEffect, useRef } from 'react';
import { Package, Image as ImageIcon, Plus, X, Loader2, Sparkles, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, User, ExternalLink, Tag, Upload, Search, Check, TrendingUp, FileText, Save, Layers, Zap, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { searchCategories, getCategoryAspects } from '../services/api';

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
            <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-4 py-3 bg-white border flex items-center justify-between cursor-pointer transition-all rounded-xl ${isOpen ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className={`text-xs font-bold truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>{showCustom ? "Custom Note Active" : (value || 'Select Note...')}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[3000] overflow-hidden">
                        {ALL_NOTES.map((note, idx) => (
                            <div key={idx} onClick={() => handleSelect(note)} className={`px-4 py-3 text-xs font-bold hover:bg-indigo-600 hover:text-white cursor-pointer transition-all border-b border-gray-50 last:border-0 ${value === note ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'} ${note.includes('Custom') ? 'bg-amber-50 text-amber-600' : ''}`}>
                                {note}
                            </div>
                        ))}
                    </div>
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

// --- PRODUCT GALLERY ---
const ProductGallery = ({ images = [], onRemove }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    if (images.length === 0) return <div className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100" />;
    return (
        <div className="space-y-4">
            <div className="relative aspect-square rounded-[35px] overflow-hidden border border-indigo-50 shadow-inner group bg-white">
                <img src={images[activeIndex]} className="w-full h-full object-contain p-4" alt="Main" />
                <button onClick={() => onRemove(activeIndex)} className="absolute top-4 right-4 p-2 bg-white/90 rounded-xl text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {images.map((img, idx) => (
                    <button key={idx} onClick={() => setActiveIndex(idx)} className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 ${activeIndex === idx ? 'border-indigo-600' : 'border-transparent opacity-60'}`}>
                        <img src={img} className="w-full h-full object-cover" />
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- SEARCHABLE SELECTS ---
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
        <div className="flex items-center justify-between py-4 border-b border-gray-50 group relative" ref={wrapperRef}>
            <div className="w-[35%] flex flex-col group">
                <div className="flex flex-col pr-4">
                    <span className="text-[10px] font-black whitespace-normal leading-tight">
                        {typeof value === 'object' ? (value?.fullName || value?.name || 'Select Category...') : (label || 'Select...')}
                    </span>
                </div>
                {metrics}
            </div>
            <div className="w-[63%] relative">
                <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-transparent hover:border-indigo-200 flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'bg-white ring-4 ring-indigo-50 border-indigo-600 shadow-sm' : ''}`}>
                    <span className={`text-xs ${value ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>{value || 'Type or Select...'}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[1000] overflow-hidden">
                        <div className="p-2 bg-gray-50"><input autoFocus type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-600" /></div>
                        <div className="max-h-60 overflow-y-auto">
                            {filteredOptions.length > 0 ? filteredOptions.map((opt, i) => (
                                <div key={i} onClick={() => { onChange(opt); setIsOpen(false); }} className="px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-indigo-600 hover:text-white cursor-pointer flex items-center justify-between">{opt}{String(value) === String(opt) && <Check className="w-3.5 h-3.5" />}</div>
                            )) : <div onClick={() => { onChange(searchTerm); setIsOpen(false); }} className="px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer italic">Use custom: "{searchTerm}"</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SearchableCondition = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const conditions = ["New", "New with tags", "New without tags", "Used - Like New", "Used - Very Good", "Used - Good", "Used - Fair"];
    return (
        <div className="relative" ref={wrapperRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="text-sm font-bold text-indigo-900 border-b border-indigo-50 py-2 cursor-pointer">{value || 'Select Condition...'}</div>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-xl z-[1000] overflow-hidden">
                    {conditions.map(c => <div key={c} onClick={() => { onChange(c); setIsOpen(false); }} className="px-4 py-2.5 text-xs font-bold hover:bg-indigo-600 hover:text-white cursor-pointer">{c}</div>)}
                </div>
            )}
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
        const timer = setTimeout(async () => {
            if (searchTerm.length > 2) {
                setIsLoading(true);
                try { const data = await searchCategories(searchTerm); setSuggestions(data); } catch (e) { console.error(e); } finally { setIsLoading(false); }
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    return (
        <div className="relative" ref={wrapperRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="text-sm font-bold text-indigo-900 border-b border-indigo-50 py-2 cursor-pointer truncate max-w-[200px]">{value || 'Select Category...'}</div>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 shadow-2xl rounded-2xl z-[1000] overflow-hidden">
                    <div className="p-3 bg-gray-50"><input autoFocus type="text" placeholder="Search eBay categories..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none border-indigo-200" /></div>
                    <div className="max-h-80 overflow-y-auto">
                        {suggestions.map((s, i) => (
                            <div key={i} onClick={() => { onChange(s.fullName, s.id); setIsOpen(false); }} className="px-5 py-3 border-b border-gray-50 hover:bg-indigo-600 group cursor-pointer transition-all">
                                <div className="flex flex-col"><span className="text-[11px] font-bold text-gray-900 group-hover:text-white leading-tight">{s.fullName}</span><span className="text-[9px] font-black group-hover:text-indigo-100 text-gray-400 uppercase tracking-widest mt-1">ID: {s.id}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- EBAY PRODUCT FORM COMPONENT (STANDALONE) ---
const EbayProductForm = ({ initialData, onSubmit, isFetching }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        categoryId: '',
        brand: '',
        condition_name: '',
        condition_notes: '',
        retail_price: '',
        selling_price: '',
        item_specifics: {},
        officialAspects: [],
        images: [],
        variations: [],
        sku: '',
        source: 'scraper'
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
                images: initialData.images || [],
                variations: initialData.variations || []
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
            } catch (e) { console.error(e); }
        }
    };

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };

    return (
        <form onSubmit={handleSubmit} className="space-y-12 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-12">
                    <div className="space-y-8 bg-emerald-50/20 p-8 rounded-[40px] border border-emerald-100/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Imported Marketplace Content</span>
                        </div>
                        <textarea
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            rows="2"
                            className="w-full text-5xl font-black text-gray-900 border-none outline-none p-0 resize-none leading-tight tracking-tighter bg-transparent placeholder-emerald-200"
                            placeholder="Imported Title..."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-emerald-100">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Price ($)</label>
                                <div className="relative">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-300">$</span>
                                    <input type="number" name="selling_price" value={formData.selling_price} onChange={handleChange} className="text-2xl font-black text-emerald-600 bg-transparent border-none outline-none w-full pl-8" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Brand</label>
                                <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="text-lg font-bold text-emerald-900 bg-transparent border-b border-emerald-50 outline-none w-full py-2 hover:border-emerald-300 focus:border-emerald-600 transition-all placeholder:text-emerald-200" placeholder="Brand..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Custom SKU</label>
                                <input type="text" name="sku" value={formData.sku || ''} onChange={handleChange} className="text-lg font-bold text-emerald-900 bg-transparent border-b border-emerald-50 outline-none w-full py-2 hover:border-emerald-300 focus:border-emerald-600 transition-all placeholder:text-emerald-200" placeholder="SKU (Optional)..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Condition</label>
                                <SearchableCondition value={formData.condition_name} onChange={(val) => setFormData(p => ({ ...p, condition_name: val }))} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Category</label>
                                <SearchableCategory value={formData.category} onChange={handleCategoryChange} />
                            </div>
                        </div>

                        <AnimatePresence>
                            {(formData.condition_notes || (formData.condition_name && !formData.condition_name.toLowerCase().includes('new'))) && (
                                <ConditionNotesSection 
                                    value={formData.condition_notes} 
                                    onChange={(val) => setFormData(p => ({ ...p, condition_notes: val }))} 
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="pt-12 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">eBay Item Specifics</h3>
                                <p className="text-xs text-gray-400 font-medium">Scraped directly from source listing & mapped to API.</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
                             {formData.officialAspects?.map((aspect, idx) => {
                                const aspectName = aspect.localizedAspectName;
                                const matchedKey = Object.keys(formData.item_specifics).find(k => k.toLowerCase() === aspectName.toLowerCase());
                                const value = matchedKey ? formData.item_specifics[matchedKey] : '';
                                let statusLabel = aspect.usage; if (aspect.required) statusLabel = 'REQUIRED'; if (value && matchedKey) statusLabel = 'IMPORTED';
                                return (
                                    <SearchableSelect 
                                        key={aspectName} label={aspectName} value={value} options={aspect.values || []}
                                        metrics={<span className={`${statusLabel === 'IMPORTED' ? 'text-emerald-500' : 'text-gray-400'} font-bold uppercase tracking-widest text-[9px]`}>{statusLabel}</span>}
                                        onChange={(val) => handleItemSpecificsChange(aspectName, val)}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* SCRAPED VARIATIONS */}
                    {formData.variations && formData.variations.length > 0 && (
                        <div className="pt-12 border-t border-gray-100">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Scraped Variations (Color / Size)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.variations.map((v, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-[30px] border border-orange-100 shadow-sm border-l-4 border-l-orange-500">
                                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-3">{v.name}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {v.values.map((val, vidx) => (
                                                <span key={vidx} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-[11px] font-bold rounded-xl border border-orange-100 italic">
                                                    {val}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-12 border-t border-gray-100">
                        <div className="bg-slate-900 rounded-[50px] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden group">
                            <h3 className="text-xl font-black uppercase tracking-widest mb-10 flex items-center gap-3"><FileText className="w-6 h-6 text-emerald-400" /> Imported Description</h3>
                            <div contentEditable={true} className="min-h-[400px] outline-none text-gray-300 text-lg leading-relaxed prose prose-invert max-w-none" onBlur={(e) => setFormData(p => ({ ...p, description: e.target.innerHTML }))} dangerouslySetInnerHTML={{ __html: formData.description }} />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-10 sticky top-10">
                    <div className="bg-white rounded-[40px] border border-emerald-50 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6"><ImageIcon className="w-4 h-4 text-emerald-400" /><span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">Source Media Gallery</span></div>
                        <ProductGallery images={formData.images} onRemove={removeImage} />
                    </div>
                    <div className="bg-white rounded-[40px] border border-emerald-50 p-8 shadow-sm space-y-4">
                        <button type="submit" disabled={isFetching} className="w-full py-6 bg-emerald-600 text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200">
                            {isFetching ? <Loader2 className="w-5 h-5 animate-spin"/> : <Zap className="w-5 h-5"/>} {initialData?.id ? 'Update Record' : 'Save Imported Product'}
                        </button>
                        <button type="button" onClick={() => { window.postMessage({ type: "EbayAutoLister_SendData", payload: formData }, "*"); alert("DATA SYNCED!"); }} className="w-full py-6 bg-blue-600 text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-blue-700 transition-all">
                            <ExternalLink className="w-5 h-5" /> Push To eBay (Ext)
                        </button>
                         <button type="button" disabled={isFetching} onClick={() => onSubmit(formData, true)} className="w-full py-6 bg-emerald-600 text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200">
                            <Zap className="w-5 h-5" /> List Instantly (Direct API)
                        </button>
                        <button type="button" disabled={isFetching} onClick={() => onSubmit(formData, true, true)} className="w-full py-6 bg-orange-500 text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-orange-600 transition-all shadow-xl shadow-orange-100">
                            <FileText className="w-5 h-5" /> Save as eBay Draft
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default EbayProductForm;
