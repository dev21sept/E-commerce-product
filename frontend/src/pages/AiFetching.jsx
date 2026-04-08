import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, Upload, Loader2, Save, ExternalLink, Trash2, Edit3, DollarSign, CheckCircle2, X, Plus, GripVertical, FileText, Zap, Package, Tag, Layers, ChevronDown, Check, Search, TrendingUp } from 'lucide-react';
import { Reorder, AnimatePresence } from 'framer-motion';
import { fetchEbayProduct, analyzeProduct, saveAiListing } from '../services/api';

// --- SEARCHABLE SELECT (THE EBAY CLONE) ---
const EbaySearchableSelect = ({ label, value, options, onChange, required, metrics }) => {
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

    const filteredOptions = options.filter(opt => String(opt).toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="flex items-center justify-between py-5 border-b border-gray-100 group relative bg-white" ref={wrapperRef}>
            <div className="w-[40%] flex flex-col group">
                <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-bold ${required ? 'text-gray-900 border-b-2 border-dotted border-gray-300' : 'text-gray-600'}`}>
                        {label}
                    </span>
                    {metrics && <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">{metrics}</span>}
                </div>
            </div>

            <div className="w-[58%] relative">
                <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-4 py-3 bg-[#F8F9FA] rounded-md border border-transparent hover:border-gray-400 flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'bg-white ring-2 ring-blue-100 border-blue-600 shadow-sm' : ''}`}
                >
                    <span className={`text-[13px] ${value ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                        {value || 'Select...'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-2xl z-[1000] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-2 bg-gray-50 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        autoFocus
                                        type="text"
                                        placeholder="Search or enter your own"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => { if(e.key==='Enter' && searchTerm) { onChange(searchTerm); setIsOpen(false); } }}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded text-sm outline-none focus:border-blue-600 shadow-inner"
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto overflow-x-hidden py-1">
                                {options.length > 0 ? (
                                    filteredOptions.map((opt, i) => (
                                        <div key={i} onClick={() => { onChange(opt); setIsOpen(false); setSearchTerm(''); }} className="px-4 py-2.5 text-[13px] text-gray-700 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center justify-between font-medium">
                                            {opt}
                                            {String(value) === String(opt) && <Check className="w-4 h-4 text-current" />}
                                        </div>
                                    ))
                                ) : !searchTerm && (
                                    <div className="px-4 py-8 text-center text-xs text-gray-400 italic font-medium">No official suggested values found for this field.</div>
                                )}
                                {searchTerm && !filteredOptions.includes(searchTerm) && (
                                    <div onClick={() => { onChange(searchTerm); setIsOpen(false); }} className="px-4 py-3 bg-blue-50 text-blue-700 text-[13px] font-bold cursor-pointer hover:bg-blue-100 italic">
                                        Use "{searchTerm}" as custom value
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const AiFetching = () => {
    const [imageUrls, setImageUrls] = useState(['']); 
    const [localPreviews, setLocalPreviews] = useState([]); 
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSaving, setIsSaving] = useState(false);
    
    // UI Mockup for Metrics as seen in eBay SS
    const getMetric = (idx) => {
        if (idx === 0) return "~3.8K searches";
        if (idx === 1) return "~3.2K searches";
        if (idx < 5) return "Trending";
        return null;
    };

    const handleAnalyze = async () => {
        const allImages = [...imageUrls.filter(u => u.trim() !== ''), ...localPreviews];
        if (allImages.length === 0) return setMessage({ type: 'error', text: 'No images provided.' });
        setIsAnalyzing(true); setAiResult(null);
        try {
            const result = await analyzeProduct({ images: allImages, platform: 'ebay', structure: ['Brand', 'Size', 'Color'] });
            if (result.success) {
                setAiResult(result.data);
                setMessage({ type: 'success', text: 'Listing Analyzed with eBay Taxonomy!' });
            }
        } catch (e) { setMessage({ type: 'error', text: 'Analysis failed.' }); }
        finally { setIsAnalyzing(false); }
    };

    const handleEditField = (f, v) => setAiResult(prev => ({ ...prev, [f]: v }));
    const handleEditSpecific = (k, v) => setAiResult(prev => ({
        ...prev, item_specifics: { ...prev.item_specifics, [k]: v }
    }));

    const handleListOnPlatform = () => {
        if (!aiResult) return;
        const targetPlatform = aiResult.target_platform || 'ebay';
        window.postMessage({ 
            type: "EbayAutoLister_SendData", 
            payload: { ...aiResult, images: [...imageUrls.filter(u => u.trim() !== ''), ...localPreviews] } 
        }, "*");
        setMessage({ type: 'success', text: `Data sent to ${targetPlatform.toUpperCase()} Extension!` });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveAiListing(aiResult);
            setMessage({ type: 'success', text: 'Saved to Products!' });
        } catch (e) { setMessage({ type: 'error', text: 'Save failed.' }); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="max-w-[1240px] mx-auto py-16 px-8 bg-white min-h-screen border-x border-gray-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 mb-16 border-b border-gray-100 pb-12">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-[#0064D2] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100"><Sparkles className="w-8 h-8 text-white" /></div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tighter">eBay Listing Studio</h1>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1">Official Taxonomy API • Searchable Hub</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleAnalyze} disabled={isAnalyzing} className="px-10 py-3.5 bg-[#0064D2] text-white rounded-full font-black text-sm hover:shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-3">
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>} Analyze Product
                    </button>
                    <button onClick={() => window.location.reload()} className="px-8 py-3.5 bg-gray-50 text-gray-400 font-bold text-sm rounded-full border border-gray-100">Clear</button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-16">
                {/* Images */}
                <div className="col-span-4 space-y-10">
                    <div className="space-y-6">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 italic"><ImageIcon className="w-4 h-4"/> Visual Sources</label>
                        <div className="space-y-4">
                            {imageUrls.map((u, i) => (
                                <input key={i} type="text" value={u} onChange={(e) => { const n = [...imageUrls]; n[i] = e.target.value; setImageUrls(n); }} placeholder="Paste image link here..." className="w-full px-5 py-4 bg-[#F9F9F9] border border-transparent rounded-2xl text-[13px] outline-none focus:bg-white focus:border-blue-600 transition-all font-medium text-gray-700" />
                            ))}
                            <button onClick={() => setImageUrls([...imageUrls, ''])} className="text-[10px] font-black text-blue-600 uppercase tracking-widest">+ Add URL</button>
                        </div>
                    </div>
                </div>

                {/* Form area */}
                <div className="col-span-8">
                    {!aiResult && !isAnalyzing ? (
                        <div className="h-full border border-dashed border-gray-200 rounded-[60px] flex flex-col items-center justify-center p-24 text-center">
                            <Package className="w-16 h-16 text-gray-100 mb-6" />
                            <h2 className="text-xl font-black text-gray-300 uppercase tracking-[0.3em]">Editor Locked</h2>
                        </div>
                    ) : isAnalyzing ? (
                        <div className="h-full flex flex-col items-center justify-center p-24 text-center bg-white rounded-[60px] border border-gray-50 shadow-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-blue-50/10 animate-pulse" />
                            <div className="w-20 h-20 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin mb-10" />
                            <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] italic">Accessing eBay Data...</p>
                        </div>
                    ) : (
                        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-10 duration-700">
                            {/* Basics */}
                            <div className="space-y-8">
                                <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-blue-600"/> <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Global Taxonomy Details</span></div>
                                <textarea value={aiResult.title} onChange={(e) => handleEditField('title', e.target.value)} className="w-full text-5xl font-black text-gray-900 border-none outline-none p-0 resize-none leading-tight tracking-tighter" rows="2" />
                                
                                <div className="flex items-center justify-between pt-10 border-t border-gray-50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Proposed Value</span>
                                        <div className="flex items-baseline"><span className="text-4xl font-black text-emerald-600">$</span><input type="number" value={aiResult.selling_price} onChange={(e) => handleEditField('selling_price', e.target.value)} className="text-4xl font-black text-emerald-600 bg-transparent border-none outline-none w-40" /></div>
                                    </div>
                                    <div className="px-6 py-2 bg-blue-50 text-blue-600 rounded-full text-[13px] font-black italic border border-blue-100 shadow-sm">{aiResult.category}</div>
                                </div>
                            </div>

                            {/* ITEM SPECIFICS - THE SEARCHABLE LIST */}
                            <div className="pt-12 border-t border-gray-100">
                                <div className="flex items-center justify-between mb-12">
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Official Item Specifics</h3>
                                    <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100"><span className="text-[10px] font-black text-emerald-600">30+ FIELDS SYNCED</span></div>
                                </div>
                                <div className="space-y-0 relative">
                                    {aiResult.officialAspects?.map((aspect, idx) => (
                                        <EbaySearchableSelect 
                                            key={aspect.localizedAspectName}
                                            label={aspect.localizedAspectName}
                                            required={aspect.required}
                                            value={aiResult.item_specifics[aspect.localizedAspectName]}
                                            options={aspect.values || []}
                                            metrics={getMetric(idx)}
                                            onChange={(val) => handleEditSpecific(aspect.localizedAspectName, val)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-16 sticky bottom-10 z-[200]">
                                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-6 bg-gray-900 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-4">
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} Save Listing
                                </button>
                                <button onClick={handleListOnPlatform} className="flex-1 py-6 bg-blue-600 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-4">
                                    <ExternalLink className="w-5 h-5" /> Transfer to Extension
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification */}
            <AnimatePresence>
                {message.text && (
                    <div className={`fixed top-10 left-1/2 -translate-x-1/2 px-10 py-5 rounded-full shadow-2xl flex items-center gap-4 font-black text-xs z-[3000] border ${message.type==='success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        {message.text.toUpperCase()} <button onClick={() => setMessage({type:'', text:''})} className="ml-4 hover:opacity-100 opacity-60"><X className="w-4 h-4"/></button>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AiFetching;
