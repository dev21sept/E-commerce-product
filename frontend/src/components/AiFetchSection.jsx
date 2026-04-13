import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Upload, Loader2, X, Plus, ExternalLink, Trash2, GripVertical, FileText, Zap, Edit3, Search, ChevronDown, Check, Layers } from 'lucide-react';
import { Reorder, AnimatePresence } from 'framer-motion';
import { analyzeProduct, fetchEbayProduct } from '../services/api';
import { EBAY_CONDITIONS } from '../constants/ebayConditions';

const EBAY_CONDITION_NOTES = [
    "Pre-Owned In Excellent Condition.",
    "Pre-Owned In Great Condition.",
    "Pre-Owned In Good Condition.",
    "Pre-Owned In Good Condition. Has Some Stains, Please See Pictures.",
    "Pre-Owned In Good Condition. Has Some Flaws, Please See Pictures."
];

// --- GENERIC SEARCHABLE DROPDOWN COMPONENT ---
const SearchableDropdown = ({ value, onSelect, options, label, placeholder = "Search...", toggleEvent }) => {
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
                <div ref={wrapperRef} className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-[3000] overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <input 
                            autoFocus
                            type="text"
                            placeholder={placeholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent text-xs font-bold outline-none"
                        />
                    </div>
                    <div className="max-h-[280px] overflow-y-auto py-1 scrollbar-thin">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => { onSelect(opt.label); setIsOpen(false); setSearchTerm(''); }}
                                    className={`px-4 py-2.5 hover:bg-[#4F46E5] group cursor-pointer flex flex-col transition-all ${value === opt.label ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold group-hover:text-white ${value === opt.label ? 'text-[#4F46E5]' : 'text-gray-900'}`}>{opt.label}</span>
                                        {value === opt.label && <Check className="w-3 h-3 text-[#4F46E5] group-hover:text-white" />}
                                    </div>
                                    {opt.description && <span className={`text-[9px] group-hover:text-indigo-100 italic ${value === opt.label ? 'text-indigo-400' : 'text-gray-400'}`}>{opt.description}</span>}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-gray-400">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

// --- MINIMALIST CONDITION NOTES COMPONENT ---
const ConditionNotesSection = ({ value = "", onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const wrapperRef = useRef(null);

    const ALL_NOTES = [...EBAY_CONDITION_NOTES, "Add Custom description..."];

    React.useEffect(() => {
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
        <div className="space-y-1 relative" ref={wrapperRef}>
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Condition Notes</label>
            
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-2 bg-white border flex items-center justify-between cursor-pointer transition-all rounded-xl ${isOpen ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-100 hover:border-gray-300'}`}
            >
                <span className={`text-[10px] font-bold truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                    {showCustom ? "Custom Note Active" : (value || 'Select Note...')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[3000] overflow-hidden">
                        {ALL_NOTES.map((note, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleSelect(note)}
                                className={`px-4 py-2.5 text-[10px] font-black hover:bg-indigo-600 hover:text-white cursor-pointer transition-all border-b border-gray-50 last:border-0 ${value === note ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'} ${note.includes('Custom') ? 'bg-amber-50 text-amber-700' : ''}`}
                            >
                                {note}
                            </div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {showCustom && (
                <div className="mt-1 animate-in slide-in-from-top-1">
                    <input 
                        autoFocus
                        type="text"
                        placeholder="Type custom note..."
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 bg-amber-50/20 border border-amber-100 focus:border-amber-400 rounded-lg text-[10px] font-bold outline-none"
                    />
                </div>
            )}
        </div>
    );
};

const AiFetchSection = ({ onDataFetched, onAnalyzingStart }) => {
    // ... media states ...
    const [imageUrls, setImageUrls] = useState(['']); // Array of URL strings
    const [localPreviews, setLocalPreviews] = useState([]); // Array of base64 strings
    
    // ... states ...
    const [condition, setCondition] = useState('New');
    const [conditionNotes, setConditionNotes] = useState('');
    const [gender, setGender] = useState('Unisex');
    const [titleOptions, setTitleOptions] = useState([
        'Brand', 'Product Type', 'Gender / Department', 'Size', 'Color', 
        'Model / Series', 'Key Features', 'Material', 'Style / Use Case'
    ]);
    const [titleStructure, setTitleStructure] = useState([]);
    const [showFieldCreator, setShowFieldCreator] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [descriptionStyle, setDescriptionStyle] = useState('AI Generated');
    const [platform, setPlatform] = useState('ebay'); // 'ebay', 'poshmark', 'vinted'
    
    // Auto-reset condition when platform changes
    React.useEffect(() => {
        if (platform === 'poshmark') setCondition('New with tags (NWT)');
        else if (platform === 'vinted') setCondition('Very good');
        else setCondition('New');
    }, [platform]);

    const [customTemplates, setCustomTemplates] = useState({
        'AI Generated': `Description - Generate a high-conversion eBay listing with a professional layout, product overview, key features, specifications, and shipping details.`,
        'Template 1': `{Title}\n\nPre-Owned In Great Condition.\n\nPlease refer to the photos for measurements.\n\nBrand: {Brand}\nSize: {Size}\nColor: {Color}\n\nSold as pictured. Thanks for looking!\nSKU: {SKU}`,
        'Template 2': `Details:-\nBrand: {Brand}\nSize: {Size}\nColor: {Color}\nStyle: {Style}\n\nKeywords: {20 Keywords}\n\nMeasurements:\nPit to pit: {Val}\nLength: {Val}\nSleeve: {Val}\n\nCondition: Pre Owned in great condition. No holes or stains.`,
        'Template 3': `ITEM CONDITION: {Condition}\n\nMeasurements:\nPit to Pit: {Val}\nLength: {Val}\n\nBrand: {Brand}\nDepartment: {Dept}\nSize: {Size}\nProduct Type: {Type}\nMaterial: {Material}\n\nExpert Analysis: {Write about quality}\n\nThank You For Shopping!`
    });
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateContent, setNewTemplateContent] = useState('');

    const handleSaveTemplate = () => {
        if (newTemplateName && newTemplateContent) {
            setCustomTemplates(prev => ({ ...prev, [newTemplateName]: newTemplateContent }));
            setDescriptionStyle(newTemplateName);
            setIsCreatingTemplate(false);
            setNewTemplateName('');
            setNewTemplateContent('');
        }
    };

    const handleDeleteTemplate = (e, name) => {
        e.stopPropagation();
        if (['AI Generated', 'Template 1', 'Template 2', 'Template 3'].includes(name)) return;
        const newTemplates = { ...customTemplates };
        delete newTemplates[name];
        setCustomTemplates(newTemplates);
        if (descriptionStyle === name) setDescriptionStyle('AI Generated');
    };
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const templateMeta = {
        'AI Generated': 'Smart & Creative AI Copy',
        'Template 1': 'Minimal & Clean Layout',
        'Template 2': 'Detailed with Measurements',
        'Template 3': 'Comprehensive Full Specs'
    };

    const handleCreateField = () => {
        if (newFieldName.trim()) {
            setTitleOptions([...titleOptions, newFieldName.trim()]);
            setTitleStructure([...titleStructure, newFieldName.trim()]);
            setNewFieldName('');
            setShowFieldCreator(false);
        }
    };

    const toggleTitleOption = (opt) => {
        if (titleStructure.includes(opt)) {
            setTitleStructure(titleStructure.filter(i => i !== opt));
        } else {
            setTitleStructure([...titleStructure, opt]);
        }
    };
    
    const fileInputRef = useRef(null);

    // --- Media Handlers ---
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
                    const maxDim = 1200;
                    
                    if (width > height) {
                        if (width > maxDim) {
                            height *= maxDim / width;
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width *= maxDim / height;
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    setLocalPreviews(prev => [...prev, compressedBase64]);
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveLocal = (index) => {
        setLocalPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleClearAll = () => {
        setImageUrls(['']);
        setLocalPreviews([]);
        setMessage({ type: '', text: '' });
    };

    const handleAnalyze = async () => {
        const allImages = [
            ...imageUrls.filter(url => url.trim() !== ''),
            ...localPreviews
        ];

        if (allImages.length === 0) {
            setMessage({ type: 'error', text: 'Please provide at least one image URL or upload a file.' });
            return;
        }

        if (titleStructure.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least 1 field for Title Priority before analyzing.' });
            return;
        }

        setIsAnalyzing(true);
        if (typeof onAnalyzingStart === 'function') onAnalyzingStart();
        setMessage({ type: 'info', text: 'AI is analyzing images...' });

        try {
            const result = await analyzeProduct({
                images: allImages,
                condition,
                conditionNotes,
                gender,
                structure: titleStructure,
                descriptionStyle,
                customTemplateText: customTemplates[descriptionStyle],
                platform
            });

            if (result.success) {
                const aiResult = result.data;
                const formattedData = {
                    ...aiResult,
                    images: allImages,
                    condition_name: aiResult.condition_name || condition,
                    condition_notes: aiResult.condition_notes || conditionNotes,
                    gender: gender,
                    selling_price: parseFloat(aiResult.selling_price || 0),
                    ebay_url: '',
                    source: 'ai'
                };
                onDataFetched(formattedData);
                setMessage({ type: 'success', text: 'AI analysis complete! Form populated.' });
            } else {
                setMessage({ type: 'error', text: 'AI analysis failed.' });
            }
        } catch (error) {
            console.error('Analysis error:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to analyze images.' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="card p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#4F46E5]/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">AI Vision Fetching</h3>
                    <p className="text-xs text-gray-500 font-medium">Scan images and detect details for {platform === 'ebay' ? 'eBay' : platform === 'poshmark' ? 'Poshmark' : 'Vinted'}</p>
                </div>
            </div>

            {/* Platform Selection */}
            <div className="bg-[#4F46E5]/5 p-2 rounded-2xl border border-[#4F46E5]/10 flex flex-wrap gap-2">
                {[
                    { id: 'ebay', label: 'eBay', colors: 'from-[#0064D2] to-[#004B9B]' },
                    { id: 'poshmark', label: 'Poshmark', colors: 'from-[#8D182E] to-[#6A1222]' },
                    { id: 'vinted', label: 'Vinted', colors: 'from-[#09B1BA] to-[#078E95]' }
                ].map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            platform === p.id 
                                ? 'bg-[#4F46E5] text-white shadow-md' 
                                : 'bg-white text-gray-500 border border-gray-100 hover:border-indigo-200'
                        }`}
                    >
                        {platform === p.id && <Sparkles className="w-3.5 h-3.5" />}
                        {p.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                <div className="space-y-6">
                    <div>
                        <label className="form-label uppercase tracking-widest text-[11px] font-bold text-gray-400 mb-3 block">1. Product Media Sources</label>
                        <div className="space-y-3">
                            {imageUrls.map((url, index) => (
                                <div key={index} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="text"
                                            value={url}
                                            onChange={(e) => handleUrlChange(index, e.target.value)}
                                            placeholder="Paste Image URL..."
                                            className="form-input pl-9 text-sm"
                                        />
                                    </div>
                                    {imageUrls.length > 1 && (
                                        <button onClick={() => handleRemoveUrl(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                                <button onClick={handleAddUrlField} className="text-[11px] font-bold text-[#4F46E5] flex items-center gap-1.5 hover:underline">
                                    <Plus className="w-3.5 h-3.5" /> Add URL
                                </button>
                                <button onClick={handleClearAll} className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5 sm:ml-auto hover:underline">
                                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                                </button>
                            </div>

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                                <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400">
                                    <span className="bg-white px-3">or drag & drop files</span>
                                </div>
                            </div>

                            <div 
                                onClick={() => fileInputRef.current.click()}
                                className="border-2 border-dashed border-gray-100 rounded-xl p-8 text-center cursor-pointer hover:border-[#4F46E5] hover:bg-gray-50/50 transition-all group"
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                                <div className="space-y-2">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto group-hover:bg-[#4F46E5]/10 group-hover:text-[#4F46E5] transition-colors">
                                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-[#4F46E5]" />
                                    </div>
                                    <p className="text-sm text-gray-600 font-bold">Upload product photos</p>
                                    <p className="text-xs text-gray-400">Supports JPG, PNG (Max 1200px)</p>
                                </div>
                            </div>

                            {localPreviews.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                                    {localPreviews.map((src, idx) => (
                                        <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                                            <img src={src} alt="" className="w-full h-full object-cover" />
                                            <button onClick={() => handleRemoveLocal(idx)} className="absolute top-1 right-1 p-1 bg-white/90 rounded-lg text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PREMIUM DESCRIPTION ARCHITECT SECTION */}
                    <div className="space-y-6 pt-6 bg-white/50 rounded-[40px] border border-gray-100 p-8 shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg ring-4 ring-indigo-50">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-tight">Description Architect</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Define how AI writes your copy</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.keys(customTemplates).map((name) => (
                                <div 
                                    key={name}
                                    onClick={() => setDescriptionStyle(name)}
                                    className={`p-5 rounded-3xl border-2 cursor-pointer transition-all relative overflow-hidden group/card ${
                                        descriptionStyle === name 
                                            ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 -translate-y-1' 
                                            : 'bg-white border-gray-50 hover:border-indigo-400 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-xs font-black tracking-tight ${descriptionStyle === name ? 'text-white' : 'text-gray-900'}`}>{name}</span>
                                            <span className={`text-[9px] uppercase tracking-widest font-black ${descriptionStyle === name ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                {templateMeta[name] || 'Custom User Layout'}
                                            </span>
                                        </div>
                                        {descriptionStyle === name ? (
                                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                                <Check className="w-3.5 h-3.5 text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                <Zap className="w-3 h-3 text-indigo-400" />
                                            </div>
                                        )}
                                    </div>

                                    {!['AI Generated', 'Template 1', 'Template 2', 'Template 3'].includes(name) && (
                                        <button 
                                            onClick={(e) => handleDeleteTemplate(e, name)}
                                            className="absolute bottom-3 right-3 p-1.5 bg-rose-500/20 text-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover/card:opacity-100 z-20"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                    
                                    <div className={`absolute -right-2 -bottom-2 w-16 h-16 rounded-full blur-2xl opacity-20 ${descriptionStyle === name ? 'bg-indigo-300' : 'bg-transparent group-hover/card:bg-indigo-200'}`}></div>
                                </div>
                            ))}

                            {/* Add Custom Description Template Card */}
                            {!isCreatingTemplate ? (
                                <div 
                                    onClick={() => setIsCreatingTemplate(true)}
                                    className="p-5 rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-600 hover:bg-indigo-50 transition-all text-indigo-500 min-h-[85px]"
                                >
                                    <Plus className="w-5 h-5 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Create New Layout</span>
                                </div>
                            ) : (
                                <div className="p-6 rounded-3xl border-2 border-indigo-600 bg-white shadow-2xl sm:col-span-2 animate-in zoom-in-95 duration-300 relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Architect New Layout</h4>
                                        <button onClick={() => setIsCreatingTemplate(false)} className="text-gray-400 hover:text-rose-500 p-1"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Layout Title</label>
                                            <input 
                                                autoFocus
                                                type="text" 
                                                placeholder="e.g. Vintage Special" 
                                                value={newTemplateName}
                                                onChange={(e) => setNewTemplateName(e.target.value)}
                                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-600 transition-all text-gray-900"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Instructions for AI</label>
                                            <textarea 
                                                placeholder="Write specific rules for how AI should structure the description..." 
                                                value={newTemplateContent}
                                                onChange={(e) => setNewTemplateContent(e.target.value)}
                                                className="w-full h-24 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-600 transition-all text-gray-900 resize-none"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSaveTemplate}
                                            className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                                        >
                                            Generate & Save Architect
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Live Layout Instruction Editor */}
                        <div className="space-y-4 pt-6 mt-2 border-t border-gray-100 animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-indigo-400" />
                                <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-tight">Refine Prompt Logic</h4>
                                <span className="ml-auto text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 uppercase tracking-widest">Active: {descriptionStyle}</span>
                            </div>
                            <div className="relative group">
                                <textarea 
                                    className="w-full h-40 bg-indigo-50/30 p-6 rounded-[35px] border-2 border-transparent focus:border-indigo-400 focus:bg-white text-xs font-bold text-indigo-900 leading-relaxed transition-all outline-none shadow-inner resize-none scrollbar-thin scrollbar-thumb-indigo-200"
                                    value={customTemplates[descriptionStyle]}
                                    onChange={(e) => setCustomTemplates({ ...customTemplates, [descriptionStyle]: e.target.value })}
                                />
                                <div className="absolute top-4 right-4 group-hover:opacity-100 opacity-0 transition-opacity">
                                    <div className="flex gap-2">
                                        <div className="bg-white/80 backdrop-blur-sm border border-indigo-100 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
                                             <Sparkles className="w-3 h-3 text-indigo-600" />
                                             <span className="text-[9px] font-black text-indigo-600 uppercase">Live AI Prompt</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                                <p className="text-[10px] text-amber-700 italic font-medium leading-relaxed">
                                    <b>Architect Tool:</b> The text above acts as the AI's "Brain". Changing it will directly affect the structure, keywords, and tone of the generated listing.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <label className="form-label uppercase tracking-widest text-[11px] font-bold text-gray-400 mb-3 block">3. Analyze & Populate</label>
                    <div className="bg-gray-50/50 p-4 md:p-6 rounded-2xl border border-gray-100 space-y-5">
                        <div className="space-y-1">
                            <label className="form-label text-[11px] font-bold text-gray-400 uppercase tracking-wider">1. Basic Info</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label text-xs">Product Condition</label>
                                <div className="relative">
                                    <div 
                                        onClick={() => window.dispatchEvent(new CustomEvent('toggle-condition-picker'))}
                                        className="form-input text-sm flex items-center justify-between cursor-pointer bg-white"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={condition ? 'text-gray-900 font-black' : 'text-gray-400'}>
                                                {condition || 'Select Condition...'}
                                            </span>
                                            {condition && condition !== 'New' && <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] font-black uppercase rounded-md border border-indigo-200 animate-pulse">Scraped</span>}
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </div>

                                    {/* Built-in Searchable Dropdown for Condition */}
                                    <SearchableDropdown 
                                        value={condition} 
                                        onSelect={(val) => setCondition(val)} 
                                        toggleEvent="toggle-condition-picker"
                                        placeholder="Search condition..."
                                        options={
                                            platform === 'ebay' ? EBAY_CONDITIONS :
                                            platform === 'poshmark' ? [
                                                { label: 'NWT (New with tags)', description: 'Brand new with tags' },
                                                { label: 'NWOT (New without tags)', description: 'Brand new, no tags' },
                                                { label: 'Like New', description: 'Excellent used condition' },
                                                { label: 'Good', description: 'Gently used' },
                                                { label: 'Fair', description: 'Visible wear' }
                                            ] : [
                                                { label: 'New with tags', description: 'Brand new with tags' },
                                                { label: 'New without tags', description: 'Brand new, no tags' },
                                                { label: 'Very good', description: 'Excellent used condition' },
                                                { label: 'Good', description: 'Gently used' },
                                                { label: 'Satisfactory', description: 'Visible wear' }
                                            ]
                                        }
                                    />
                                </div>
                            </div>
                             <div>
                                <label className="form-label text-xs">Target Gender</label>
                                <div className="relative">
                                    <div 
                                        onClick={() => window.dispatchEvent(new CustomEvent('toggle-gender-picker'))}
                                        className="form-input text-sm flex items-center justify-between cursor-pointer bg-white"
                                    >
                                        <span className={gender ? 'text-gray-900 font-bold' : 'text-gray-400'}>
                                            {gender || 'Select Gender...'}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    </div>

                                    <SearchableDropdown 
                                        value={gender}
                                        onSelect={(val) => setGender(val)}
                                        toggleEvent="toggle-gender-picker"
                                        placeholder="Search gender..."
                                        options={[
                                            { label: 'Men', description: 'Adult male' },
                                            { label: 'Women', description: 'Adult female' },
                                            { label: 'Unisex', description: 'Fits all' },
                                            { label: 'Boys', description: 'Kids male' },
                                            { label: 'Girls', description: 'Kids female' },
                                            { label: 'Baby', description: 'Infants' },
                                            { label: 'Other', description: 'Specialized' }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* DYNAMIC CONDITION NOTES */}
                        <AnimatePresence>
                            {(conditionNotes || (condition && !condition.toLowerCase().includes('new'))) && (
                                <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between">
                                         <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Condition Notes</label>
                                         {conditionNotes && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Successfully Scraped</span>}
                                    </div>
                                    <ConditionNotesSection 
                                        value={conditionNotes} 
                                        onChange={(val) => setConditionNotes(val)}
                                    />
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                        
                        {/* PREMIUM TITLE ARCHITECT SECTION */}
                        <div className="space-y-6 pt-6 bg-white/50 rounded-[40px] border border-gray-100 p-8 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg ring-4 ring-indigo-50">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-tight">Title Architect</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Define structure & priority</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {titleStructure.length > 0 && (
                                        <button 
                                            onClick={() => setTitleStructure([])} 
                                            className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
                                        >
                                            Reset Sequence
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2.5">
                                {titleOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => toggleTitleOption(opt)}
                                        className={`px-5 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 border-2 ${
                                            titleStructure.includes(opt)
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 -translate-y-0.5'
                                                : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'
                                        }`}
                                    >
                                        {titleStructure.includes(opt) && <Check className="w-3.5 h-3.5" />}
                                        {opt}
                                    </button>
                                ))}

                                {/* INLINE ADD MORE BUTTON/INPUT */}
                                {showFieldCreator ? (
                                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                                        <input 
                                            autoFocus
                                            type="text"
                                            placeholder="Enter field name..."
                                            value={newFieldName}
                                            onChange={(e) => setNewFieldName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateField()}
                                            className="px-4 py-2.5 bg-indigo-50 border-2 border-indigo-400 rounded-2xl text-[11px] font-bold outline-none w-[150px] shadow-inner"
                                        />
                                        <button onClick={handleCreateField} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md active:scale-95">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setShowFieldCreator(false)} className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-rose-50 hover:text-rose-500 active:scale-95">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowFieldCreator(true)}
                                        className="px-5 py-3 rounded-2xl text-[11px] font-black border-2 border-dashed border-indigo-200 text-indigo-400 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add More Field
                                    </button>
                                )}
                            </div>
                            
                            {/* Sequence Reorderer - Premium Path Logic */}
                            <div className="relative mt-8 p-8 bg-gray-50/80 rounded-[35px] border border-gray-100 overflow-hidden group">
                                <div className="absolute left-12 top-0 bottom-0 w-[2px] bg-gradient-to-b from-indigo-100 via-indigo-600 to-indigo-100 opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 block">Order of the listing title</label>
                                
                                {titleStructure.length === 0 ? (
                                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                                        <div className="w-12 h-12 rounded-[18px] bg-gray-100 flex items-center justify-center text-gray-300 animate-pulse">
                                            <Layers className="w-6 h-6" />
                                        </div>
                                        <p className="text-xs font-bold text-gray-400 italic">Select fields above to design your product title</p>
                                    </div>
                                ) : (
                                    <Reorder.Group axis="y" values={titleStructure} onReorder={setTitleStructure} className="space-y-4 relative z-10">
                                        {titleStructure.map((item, idx) => (
                                            <Reorder.Item 
                                                key={item} 
                                                value={item} 
                                                className={`group/item flex items-center gap-6 bg-white p-4 pr-6 rounded-[22px] border-2 shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                                                    idx === 0 
                                                        ? 'border-indigo-600 ring-8 ring-indigo-50' 
                                                        : 'border-transparent hover:border-indigo-200'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center text-[10px] font-black shrink-0 transition-transform group-hover/item:scale-110 ${
                                                    idx === 0 ? 'bg-indigo-600 text-white rotate-12' : 'bg-gray-100 text-gray-400 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                                <GripVertical className="w-4 h-4 text-gray-300 group-hover/item:text-indigo-300" />
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-black tracking-tight ${idx === 0 ? 'text-indigo-900' : 'text-gray-700 font-bold'}`}>{item}</span>
                                                    {idx === 0 && <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Starting Keyword</span>}
                                                </div>
                                                <div className="ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                     <button onClick={(e) => { e.stopPropagation(); toggleTitleOption(item); }} className="p-2 hover:bg-rose-50 text-gray-300 hover:text-rose-500 rounded-lg transition-all">
                                                         <Trash2 className="w-3.5 h-3.5" />
                                                     </button>
                                                </div>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                )}
                            </div>
                        </div>

                        
                        <button 
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 ${
                                isAnalyzing 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#4F46E5] text-white hover:bg-indigo-700 border-none'
                            }`}
                        >
                            {isAnalyzing ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Deep AI Analysis...</>
                            ) : (
                                <><Sparkles className="w-5 h-5 text-indigo-400" /> Run AI Processing</>
                            )}
                        </button>

                        {message.text && (
                            <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 border animate-in slide-in-from-top-2 ${
                                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                message.type === 'info' ? 'bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/10' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                                {message.type === 'success' && <Sparkles className="w-4 h-4" />}
                                {message.text}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-[11px] text-amber-700 leading-relaxed italic">
                            <b>Pro Tip:</b> For best results, include images showing any labels/tags, front view, and back view. AI will automatically extract title, description, category, and market price.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiFetchSection;
