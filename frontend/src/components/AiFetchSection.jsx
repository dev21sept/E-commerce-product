import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Upload, Loader2, X, Plus, ExternalLink, Trash2, GripVertical, FileText, Zap, Edit3 } from 'lucide-react';
import { Reorder, AnimatePresence } from 'framer-motion';
import { analyzeProduct, fetchEbayProduct } from '../services/api';

const AiFetchSection = ({ onDataFetched }) => {
    // ... media states ...
    const [imageUrls, setImageUrls] = useState(['']); // Array of URL strings
    const [localPreviews, setLocalPreviews] = useState([]); // Array of base64 strings
    
    // ... states ...
    const [condition, setCondition] = useState('New');
    const [gender, setGender] = useState('Male');
    const [titleStructure, setTitleStructure] = useState([]);
    const [descriptionStyle, setDescriptionStyle] = useState('AI Generated');
    const [customTemplates, setCustomTemplates] = useState({
        'AI Generated': `Description - Generate a high-conversion eBay listing with a professional layout, product overview, key features, specifications, and shipping details.`,
        'Template 1': `{Title}\n\nPre-Owned In Great Condition.\n\nPlease refer to the photos for measurements.\n\nBrand: {Brand}\nSize: {Size}\nColor: {Color}\n\nSold as pictured. Thanks for looking!\nSKU: {SKU}`,
        'Template 2': `Details:-\nBrand: {Brand}\nSize: {Size}\nColor: {Color}\nStyle: {Style}\n\nKeywords: {20 Keywords}\n\nMeasurements:\nPit to pit: {Val}\nLength: {Val}\nSleeve: {Val}\n\nCondition: Pre Owned in great condition. No holes or stains.`,
        'Template 3': `ITEM CONDITION: {Condition}\n\nMeasurements:\nPit to Pit: {Val}\nLength: {Val}\n\nBrand: {Brand}\nDepartment: {Dept}\nSize: {Size}\nProduct Type: {Type}\nMaterial: {Material}\n\nExpert Analysis: {Write about quality}\n\nThank You For Shopping!`
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const titleOptions = [
        'Brand', 
        'Product Type', 
        'Gender / Department', 
        'Size', 
        'Color', 
        'Model / Series', 
        'Key Features', 
        'Material', 
        'Style / Use Case'
    ];

    const templateMeta = {
        'AI Generated': 'Smart & Creative AI Copy',
        'Template 1': 'Minimal & Clean Layout',
        'Template 2': 'Detailed with Measurements',
        'Template 3': 'Comprehensive Full Specs'
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

    const handleFetchEbayData = async () => {
        const url = imageUrls[0];
        if (!url || !url.includes('ebay.com')) {
            setMessage({ type: 'error', text: 'Please paste a valid eBay URL in the first image slot.' });
            return;
        }

        setIsAnalyzing(true);
        setMessage({ type: 'info', text: 'Fetching images from eBay...' });

        try {
            const data = await fetchEbayProduct(url);

            if (data.images && data.images.length > 0) {
                setImageUrls(data.images);
            }
            if (data.condition) setCondition(data.condition);
            
            setMessage({ type: 'success', text: `Successfully imported ${data.images?.length || 0} images!` });
        } catch (error) {
            console.error('Fetch error:', error);
            setMessage({ type: 'error', text: 'Failed to fetch eBay data.' });
        } finally {
            setIsAnalyzing(false);
        }
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

        if (titleStructure.length < 3) {
            setMessage({ type: 'error', text: 'Please select at least 3 fields for Title Priority before analyzing.' });
            return;
        }

        setIsAnalyzing(true);
        setMessage({ type: 'info', text: 'AI is analyzing images...' });

        try {
            const result = await analyzeProduct({
                images: allImages,
                condition,
                gender,
                titleStructure,
                descriptionStyle,
                customTemplateText: customTemplates[descriptionStyle]
            });

            if (result.success) {
                const aiResult = result.data;
                const formattedData = {
                    ...aiResult,
                    images: allImages,
                    condition_name: condition,
                    gender: gender,
                    selling_price: parseFloat(aiResult.selling_price || 0),
                    ebay_url: '' // Ensure we don't show the ebay link section for AI fetches
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
        <div className="card p-8 space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#4F46E5]/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">AI Vision Fetching</h3>
                    <p className="text-xs text-gray-500 font-medium">Scan images and detect details automatically</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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
                                            placeholder="Paste Image URL or eBay URL..."
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
                            <div className="flex flex-wrap gap-4 pt-1">
                                <button onClick={handleAddUrlField} className="text-xs font-bold text-[#4F46E5] flex items-center gap-1.5 hover:underline">
                                    <Plus className="w-3.5 h-3.5" /> Add URL
                                </button>
                                <button onClick={handleFetchEbayData} className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 hover:underline">
                                    <ImageIcon className="w-3.5 h-3.5" /> Get Images from eBay Link
                                </button>
                                <button onClick={handleClearAll} className="text-xs font-bold text-rose-600 flex items-center gap-1.5 ml-auto hover:underline">
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
                                <div className="grid grid-cols-4 gap-3 mt-4">
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

                    {/* MOVED: Description Style Selection */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <label className="form-label text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" /> 2. Choose Description Template
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.keys(templateMeta).map(style => (
                                <button
                                    key={style}
                                    onClick={() => setDescriptionStyle(style)}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-center ${
                                        descriptionStyle === style
                                            ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-md'
                                            : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {style === 'AI Generated' ? <Zap className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                        <span className="text-[11px] font-bold">{style}</span>
                                    </div>
                                    <span className={`text-[9px] font-medium block ${descriptionStyle === style ? 'text-gray-300' : 'text-gray-400'}`}>
                                        {templateMeta[style]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <label className="form-label uppercase tracking-widest text-[11px] font-bold text-gray-400 mb-3 block">2. Analyze & Populate</label>
                    <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label text-xs">Product Condition</label>
                                <select 
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value)}
                                    className="form-input text-sm"
                                >
                                    <optgroup label="General">
                                        <option>New</option>
                                        <option>New other (see details)</option>
                                        <option>Open box</option>
                                        <option>Used - Good</option>
                                        <option>Used - Very Good</option>
                                        <option>Used - Like New</option>
                                        <option>For parts or not working</option>
                                    </optgroup>
                                    <optgroup label="Clothing, Shoes & Accessories">
                                        <option>New with tags</option>
                                        <option>New without tags</option>
                                        <option>New with imperfections</option>
                                        <option>Pre-owned: Excellent</option>
                                        <option>Pre-owned: Good</option>
                                        <option>Pre-owned: Fair</option>
                                    </optgroup>
                                    <optgroup label="Electronics, Home & Industrial">
                                        <option>Certified - Refurbished</option>
                                        <option>Excellent - Refurbished</option>
                                        <option>Very Good - Refurbished</option>
                                        <option>Good - Refurbished</option>
                                        <option>Seller refurbished</option>
                                        <option>Remanufactured</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="form-label text-xs">Target Gender</label>
                                <select 
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="form-input text-sm"
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Unisex</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>

                        
                        {/* Title Priority Selection (Draggable) */}
                        <div className="space-y-4 pt-2">
                            <label className="form-label text-[11px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                                <span>1. Build Title Format <span className="text-[10px] font-normal lowercase">(Click to add, Drag to reorder)</span></span>
                                {titleStructure.length > 0 && <button onClick={() => setTitleStructure([])} className="text-rose-500 hover:text-rose-600">Clear</button>}
                            </label>
                            
                            <div className="flex flex-wrap gap-2">
                                {titleOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => toggleTitleOption(opt)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${
                                            titleStructure.includes(opt)
                                                ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Sequence Reorderer */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Selected Order:</p>
                                {titleStructure.length === 0 ? (
                                    <div className="py-2 text-center text-xs text-gray-400 italic">No fields selected yet.</div>
                                ) : (
                                    <Reorder.Group axis="y" values={titleStructure} onReorder={setTitleStructure} className="space-y-2">
                                        {titleStructure.map((item, idx) => (
                                            <Reorder.Item key={item} value={item} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-200 transition-colors">
                                                <GripVertical className="w-4 h-4 text-gray-300" />
                                                <span className="text-xs font-bold text-gray-700">{idx + 1}. {item}</span>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                )}
                            </div>
                        </div>

                        {/* Template Editor Box */}
                        <div className="space-y-4 pt-2">
                            <label className="form-label text-[11px] font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    <Edit3 className="w-3.5 h-3.5" /> 3. Edit AI Layout Instructions
                                </span>
                                <span className="text-[10px] text-indigo-400 font-normal normal-case">Modify text below to change how AI writes</span>
                            </label>
                            <div className="relative group">
                                <textarea
                                    value={customTemplates[descriptionStyle]}
                                    onChange={(e) => setCustomTemplates({...customTemplates, [descriptionStyle]: e.target.value})}
                                    className="w-full bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 font-mono text-[10px] text-indigo-900 leading-relaxed min-h-[160px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all outline-none resize-none scrollbar-thin scrollbar-thumb-indigo-100"
                                    placeholder="Enter custom instructions for the AI here..."
                                />
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-indigo-600 text-white text-[9px] px-2 py-1 rounded-md font-bold shadow-sm flex items-center gap-1">
                                        <Zap className="w-2.5 h-2.5" /> AI TEMPLATE EDITOR
                                    </div>
                                </div>
                            </div>
                            
                            {/* Legend / Helper for user */}
                            <div className="flex gap-4 px-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Fixed Label (Head)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
                                    <span className="text-[9px] font-bold text-indigo-500 uppercase italic">Dynamic data: {"{Value}"}</span>
                                </div>
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
