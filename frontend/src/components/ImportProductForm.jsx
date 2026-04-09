import React, { useState, useEffect, useRef } from 'react';
import { Package, Image as ImageIcon, Plus, X, Loader2, Sparkles, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, User, ExternalLink, Tag, Upload, Search, Check, TrendingUp, FileText, Save, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { searchCategories, getCategoryAspects } from '../services/api';

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
            <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-all ${isOpen ? 'ring-2 ring-indigo-200' : ''}`}>
                <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Marketplace Category</span>
                    <span className="text-sm font-bold text-indigo-900 leading-tight">{value || 'Select Official eBay Category...'}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-indigo-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
    useEffect(() => { if (initialData) { setFormData(prev => ({ ...prev, ...initialData, item_specifics: typeof initialData.item_specifics === 'string' ? JSON.parse(initialData.item_specifics) : initialData.item_specifics || {}, officialAspects: initialData.officialAspects || prev.officialAspects || [], images: initialData.images || [], variations: initialData.variations || [] })); }}, [initialData]);
    const handleItemSpecificsChange = (k, v) => setFormData(p => ({ ...p, item_specifics: { ...p.item_specifics, [k]: v } }));
    const handleChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };
    const removeImage = (i) => setFormData(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }));
    const handleCategoryChange = async (fullName, id) => { setFormData(prev => ({ ...prev, category: fullName, categoryId: id })); if (id) { try { const aspects = await getCategoryAspects(id); setFormData(prev => ({ ...prev, officialAspects: aspects || [] })); } catch (e) { console.error('Failed to fetch aspects:', e); }}};
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    return (
        <form onSubmit={handleSubmit} className="space-y-12 pb-24">
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-8 space-y-12">
                    <div className="space-y-8"><textarea name="title" value={formData.title} onChange={handleChange} rows="2" className="w-full text-5xl font-black text-gray-900 border-none outline-none p-0 resize-none leading-tight tracking-tighter bg-transparent" placeholder="Enter Listing Title..." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-gray-100">
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Imported Price ($)</label>
                                <input type="number" name="selling_price" value={formData.selling_price} onChange={handleChange} className="text-4xl font-black text-emerald-600 bg-transparent border-none outline-none w-full" />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Brand</label>
                                <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="text-2xl font-black text-slate-800 bg-transparent border-none outline-none w-full placeholder:text-slate-200" placeholder="Brand Name..." />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Category</label>
                                <SearchableCategory value={formData.category} onChange={handleCategoryChange} />
                            </div>
                        </div>
                    </div>
                    <div className="pt-12 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-10"><div><h3 className="text-2xl font-black text-gray-900 tracking-tight italic">eBay Item Specifics</h3><p className="text-xs text-gray-400 font-medium">Scraped directly from source listing & mapped to API.</p></div></div>
                        <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm">
                            {formData.officialAspects?.filter(aspect => { const matchedKey = Object.keys(formData.item_specifics).find(k => k.toLowerCase() === aspect.localizedAspectName.toLowerCase()); return matchedKey && formData.item_specifics[matchedKey]; }).map((aspect, idx) => { const matchedKey = Object.keys(formData.item_specifics).find(k => k.toLowerCase() === aspect.localizedAspectName.toLowerCase()); return ( <SearchableSelect key={aspect.localizedAspectName} label={aspect.localizedAspectName} value={formData.item_specifics[matchedKey]} options={aspect.values || []} metrics={<span className="text-emerald-500 font-bold uppercase tracking-widest text-[9px]">Filled by Seller</span>} onChange={(val) => handleItemSpecificsChange(aspect.localizedAspectName, val)} /> ); })}
                            {formData.officialAspects?.filter(aspect => !Object.keys(formData.item_specifics).some(k => k.toLowerCase() === aspect.localizedAspectName.toLowerCase())).map((aspect, idx) => ( <SearchableSelect key={aspect.localizedAspectName} label={aspect.localizedAspectName} value={formData.item_specifics[aspect.localizedAspectName]} options={aspect.values || []} metrics={<span className="text-gray-400 font-bold uppercase tracking-widest text-[9px]">Not filled by Seller</span>} onChange={(val) => handleItemSpecificsChange(aspect.localizedAspectName, val)} /> ))}
                        </div>
                    </div>
                    {formData.variations && formData.variations.length > 0 && (
                        <div className="pt-12 border-t border-gray-100"><h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Scraped Variations</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{formData.variations.map((v, idx) => ( <div key={idx} className="bg-white p-6 rounded-[30px] border border-gray-100 shadow-sm"><label className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-3">{v.name}</label><div className="flex flex-wrap gap-2">{v.values.map((val, vidx) => ( <span key={vidx} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-[11px] font-bold rounded-xl border border-orange-100">{val}</span> ))}</div></div> ))}</div></div>
                    )}
                    <div className="pt-12 border-t border-gray-100"><div className="bg-gray-900 rounded-[50px] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden"><h3 className="text-xl font-black uppercase tracking-widest mb-10 flex items-center gap-3"><FileText className="w-6 h-6 text-indigo-400" /> Scraped Description</h3><div contentEditable={true} className="min-h-[400px] outline-none text-gray-300 text-lg leading-relaxed prose prose-invert max-w-none shadow-description" onBlur={(e) => setFormData(p => ({ ...p, description: e.target.innerHTML }))} dangerouslySetInnerHTML={{ __html: formData.description }} /></div></div>
                </div>
                <div className="lg:col-span-4 space-y-10 sticky top-10">
                    <div className="bg-white rounded-[40px] border border-gray-100 p-6 shadow-sm"><div className="flex items-center gap-2 mb-6"><ImageIcon className="w-4 h-4 text-slate-400" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Gallery</span></div><ProductGallery images={formData.images} onRemove={removeImage} /></div>
                    <div className="bg-white rounded-[40px] border border-gray-100 p-8 shadow-sm space-y-4"><button type="submit" disabled={isFetching} className="w-full py-6 bg-slate-900 text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-indigo-600 transition-all">{isFetching ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} Update Inventory</button><button type="button" onClick={() => { window.postMessage({ type: "EbayAutoLister_SendData", payload: formData }, "*"); alert("DATA SYNCED!"); }} className="w-full py-6 bg-[#0064D2] text-white rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"><ExternalLink className="w-5 h-5" /> Push To eBay</button></div>
                </div>
            </div>
        </form>
    );
};
export default ImportProductForm;
