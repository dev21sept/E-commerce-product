import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Upload, Loader2, X, Plus, ExternalLink, Trash2, GripVertical, FileText, Zap, Edit3, Search, ChevronDown, Check, Layers } from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { analyzeProduct } from '../services/api';
import { EBAY_CONDITIONS } from '../constants/ebayConditions';

// --- GENERIC SEARCHABLE DROPDOWN COMPONENT ---
const SearchableDropdown = ({ value, onSelect, options, placeholder = "Search...", toggleEvent }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    React.useEffect(() => {
        const handleToggle = () => setIsOpen(v => !v);
        window.addEventListener(toggleEvent, handleToggle);
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener(toggleEvent, handleToggle);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [toggleEvent]);

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    ref={wrapperRef} 
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-[3000] overflow-hidden"
                >
                    <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <input 
                            autoFocus type="text" placeholder={placeholder} value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent text-xs font-bold outline-none"
                        />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto py-1 scrollbar-thin">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => { onSelect(opt.label); setIsOpen(false); setSearchTerm(''); }}
                                    className={`px-4 py-2 hover:bg-[#4F46E5] group cursor-pointer flex flex-col transition-all ${value === opt.label ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold group-hover:text-white ${value === opt.label ? 'text-[#4F46E5]' : 'text-gray-900'}`}>{opt.label}</span>
                                        {value === opt.label && <Check className="w-3 h-3 text-[#4F46E5] group-hover:text-white" />}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-gray-400">No results found</div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const AiFetchSection = ({ onDataFetched, onAnalyzingStart }) => {
    // Media states
    const [imageUrls, setImageUrls] = useState(['']);
    const [localPreviews, setLocalPreviews] = useState([]);
    
    // Config states
    const [platform, setPlatform] = useState('ebay');
    const [condition, setCondition] = useState('New');
    const [gender, setGender] = useState('Unisex');
    const [titleOptions, setTitleOptions] = useState([
        'Brand', 'Product Type', 'Model / Series', 'Size', 'Color', 'Material', 'Style / Use Case', 'Key Features', 'Gender / Department'
    ]);
    const [titleStructure, setTitleStructure] = useState(['Brand', 'Product Type', 'Model / Series', 'Size', 'Color', 'Material', 'Style / Use Case', 'Key Features', 'Gender / Department']);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef(null);

    // Handlers
    const handleAddUrlField = () => setImageUrls([...imageUrls, '']);
    const handleUrlChange = (index, value) => {
        const newUrls = [...imageUrls];
        newUrls[index] = value;
        setImageUrls(newUrls);
    };
    const handleRemoveUrl = (index) => {
        const newUrls = imageUrls.filter((_, i) => i !== index);
        setImageUrls(newUrls.length ? newUrls : ['']);
    };
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1200; // Best balance for AI quality and speed

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress to 70% JPEG quality for ultimate speed
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setLocalPreviews(prev => [...prev, compressedDataUrl]);
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    };
    const handleRemoveLocal = (index) => setLocalPreviews(prev => prev.filter((_, i) => i !== index));
    const handleClearAll = () => { setImageUrls(['']); setLocalPreviews([]); setMessage({ type: '', text: '' }); };

    const handleAnalyze = async () => {
        const allImages = [...imageUrls.filter(u => u.trim() !== ''), ...localPreviews];
        if (allImages.length === 0) { setMessage({ type: 'error', text: 'Select images first.' }); return; }

        setIsAnalyzing(true);
        if (onAnalyzingStart) onAnalyzingStart();
        try {
            const result = await analyzeProduct({
                images: allImages,
                condition,
                gender,
                structure: titleStructure,
                platform
            });

            if (result.success) {
                onDataFetched({ ...result.data, images: allImages, source: 'ai' });
            } else {
                setMessage({ type: 'error', text: 'AI analysis failed.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Connection failed.' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleTitleOption = (opt) => {
        if (titleStructure.includes(opt)) setTitleStructure(titleStructure.filter(i => i !== opt));
        else setTitleStructure([...titleStructure, opt]);
    };

    return (
        <div className="card p-6 md:p-8 space-y-6 animate-in slide-in-from-top-4 duration-500 max-w-7xl mx-auto bg-white border border-gray-100 shadow-sm rounded-3xl">
            {/* COMPACT IMAGE SOURCE SECTION */}
            <div className="space-y-4">
                {/* 1. IMAGE URL BAR (TOP) */}
                <div className="flex gap-2">
                    {imageUrls.map((url, index) => (
                        <div key={index} className="flex-1 relative group">
                            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text" value={url} onChange={(e) => handleUrlChange(index, e.target.value)}
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

                {/* 2. SIDE-BY-SIDE UPLOAD & ANALYZE (BOTTOM ROW) */}
                <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                    {/* LEFT: UPLOAD BOX */}
                    <div 
                        onClick={() => fileInputRef.current.click()}
                        className="lg:w-1/3 flex-shrink-0 border-2 border-dashed border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition-all bg-gray-50/30 group"
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                        <Upload className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-[11px] font-black text-gray-900 uppercase">Click to Upload</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Or Drag Photos</p>
                    </div>

                    {/* RIGHT: PREVIEWS & BUTTON */}
                    <div className="flex-1 min-w-0">
                        <div className="flex gap-4 items-center overflow-x-auto min-h-[140px] bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 scrollbar-hide relative group/gallery">
                            {localPreviews.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                    <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No Photos Loaded</p>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    {localPreviews.map((src, idx) => (
                                        <div key={idx} className="relative group w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-md">
                                            <img src={src} className="w-full h-full object-cover" />
                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveLocal(idx); }} className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="absolute top-1 left-1 bg-black/40 text-[8px] text-white px-1.5 rounded-md font-black">{idx + 1}</div>
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
                                    onClick={handleAnalyze} disabled={isAnalyzing}
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
