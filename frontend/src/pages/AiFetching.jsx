import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Upload, Loader2, Save, ExternalLink, Trash2, Edit3, DollarSign, CheckCircle2, X, Plus } from 'lucide-react';
import axios from 'axios';

const AiFetching = () => {
    // Media States
    const [imageUrls, setImageUrls] = useState(['']); // Array of URL strings
    const [localPreviews, setLocalPreviews] = useState([]); // Array of base64 strings
    
    const [condition, setCondition] = useState('New');
    const [gender, setGender] = useState('Male');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
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
                    // Resize to max 1200px to avoid 16MB MongoDB limit and save bandwidth
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
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG
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
        setMessage({ type: 'info', text: 'Fetching product data from eBay...' });

        try {
            const response = await axios.post('http://localhost:5000/api/fetch-ebay-product', { url });
            const data = response.data;

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
        setAiResult(null);
        setMessage({ type: '', text: '' });
    };

    // --- Core Logic ---
    const handleAnalyze = async () => {
        const allImages = [
            ...imageUrls.filter(url => url.trim() !== ''),
            ...localPreviews
        ];

        if (allImages.length === 0) {
            setMessage({ type: 'error', text: 'Please provide at least one image URL or upload a file.' });
            return;
        }

        setIsAnalyzing(true);
        setMessage({ type: '', text: '' });
        setAiResult(null);

        try {
            const response = await axios.post('http://localhost:5000/api/ai/analyze-product', {
                images: allImages,
                condition,
                gender
            });

            if (response.data.success) {
                setAiResult(response.data.data);
                setMessage({ type: 'success', text: `AI analysis complete using ${allImages.length} images!` });
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

    const handleSave = async () => {
        if (!aiResult) return;
        setIsSaving(true);
        
        try {
            const allImages = [
                ...imageUrls.filter(url => url.trim() !== ''),
                ...localPreviews
            ];

            const dataToSave = {
                ...aiResult,
                images: allImages,
                condition_name: condition,
                gender: gender,
                selling_price: aiResult.selling_price
            };

            const response = await axios.post('http://localhost:5000/api/ai/save-listing', dataToSave);
            
            if (response.data.duplicate) {
                const shouldOverwrite = window.confirm('Product with these images already exists! Update existing listing instead?');
                if (shouldOverwrite) {
                    await axios.post('http://localhost:5000/api/ai/save-listing', { ...dataToSave, overwrite: true });
                    setMessage({ type: 'success', text: 'Existing listing updated successfully!' });
                } else {
                    setMessage({ type: 'error', text: 'Save cancelled: Duplicate found.' });
                }
                return;
            }

            if (response.data.success) {
                setMessage({ type: 'success', text: 'Listing saved to MongoDB successfully!' });
            }
        } catch (error) {
            console.error('Save error:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save listing.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleListOnEbay = () => {
        if (!aiResult) return;
        
        const allImages = [
            ...imageUrls.filter(url => url.trim() !== ''),
            ...localPreviews
        ];

        const productData = {
            ...aiResult,
            images: allImages,
            condition_name: condition,
            gender: gender,
            selling_price: aiResult.selling_price
        };

        window.postMessage({ 
            type: "EbayAutoLister_SendData", 
            payload: productData 
        }, "*");
        
        setMessage({ type: 'success', text: 'Data sent to eBay Extension!' });
    };

    const handleEditField = (field, value) => {
        setAiResult(prev => ({ ...prev, [field]: value }));
    };

    const handleEditSpecific = (key, value) => {
        setAiResult(prev => ({
            ...prev,
            item_specifics: { ...prev.item_specifics, [key]: value }
        }));
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                        AI Listing Generator
                    </h1>
                    <p className="text-gray-500 mt-2">Generate professional eBay listings using AI vision technology.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Input */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-indigo-500" />
                            Product Media
                        </h3>
                        
                        <div className="space-y-4">
                            {/* URL Inputs */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Image URLs</label>
                                {imageUrls.map((url, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={url}
                                            onChange={(e) => handleUrlChange(index, e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                        />
                                        {imageUrls.length > 1 && (
                                            <button onClick={() => handleRemoveUrl(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <div className="flex gap-4 mb-1">
                                    <button 
                                        onClick={handleAddUrlField}
                                        className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700"
                                    >
                                        <Plus className="w-3 h-3" /> Add URL
                                    </button>
                                    <button 
                                        onClick={handleFetchEbayData}
                                        className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:text-emerald-700"
                                    >
                                        <ExternalLink className="w-3 h-3" /> Import from URL
                                    </button>
                                    <button 
                                        onClick={handleClearAll}
                                        className="text-xs font-bold text-rose-600 flex items-center gap-1 hover:text-rose-700 ml-auto"
                                    >
                                        <Trash2 className="w-3 h-3" /> Clear All
                                    </button>
                                </div>
                            </div>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-400">Or Upload Files</span>
                                </div>
                            </div>

                            {/* Local Upload */}
                            <div 
                                onClick={() => fileInputRef.current.click()}
                                className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-gray-50 transition-all"
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                />
                                <div className="space-y-2">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                                        <Upload className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <p className="text-sm text-gray-600 font-medium">Click to upload from computer</p>
                                    <p className="text-xs text-gray-400">Supports multiple files</p>
                                </div>
                            </div>

                            {/* Gallery Preview */}
                            {localPreviews.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                    {localPreviews.map((src, idx) => (
                                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                                            <img src={src} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRemoveLocal(idx); }}
                                                className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-semibold mb-4">Core Attributes</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                                <select 
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                                <select 
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Unisex</option>
                                    <option>Other</option>
                                    <option>Prefer not to say</option>
                                </select>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className={`w-full mt-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                                isAnalyzing 
                                    ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:scale-95'
                            }`}
                        >
                            {isAnalyzing ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Product...</>
                            ) : (
                                <><Sparkles className="w-5 h-5" /> Generate AI Listing</>
                            )}
                        </button>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-4 ${
                            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                            <span className="text-sm font-medium">{message.text}</span>
                        </div>
                    )}
                </div>

                {/* Right Panel: Result */}
                <div className="lg:col-span-7">
                    {!aiResult && !isAnalyzing && (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl h-full flex flex-col items-center justify-center p-12 text-center text-gray-400">
                            <Sparkles className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg font-medium">Comprehensive Results</p>
                            <p className="text-sm px-12 mt-2">Upload tags, front, and back views for the best details.</p>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="bg-white rounded-3xl p-12 h-full flex flex-col items-center justify-center text-center">
                            <div className="relative">
                                <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mt-8">Analyzing All Angles...</h2>
                            <p className="text-gray-500 mt-3 max-w-sm">Reading tags and detecting every detail using Multi-Vision GPT-4o...</p>
                        </div>
                    )}

                    {aiResult && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="bg-white rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
                                        Multi-Image Analysis Result
                                    </span>
                                </div>

                                <div className="p-8 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-tighter">Detected Category:</span>
                                            <input 
                                                value={aiResult.category}
                                                onChange={(e) => handleEditField('category', e.target.value)}
                                                className="text-sm font-bold text-indigo-600 bg-transparent border-none outline-none w-full"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Product Title:</span>
                                                <span className={`text-[10px] font-bold ${aiResult.title.length > 80 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {aiResult.title.length}/80
                                                </span>
                                            </div>
                                            <textarea
                                                value={aiResult.title}
                                                onChange={(e) => handleEditField('title', e.target.value)}
                                                className="w-full text-2xl font-black text-gray-900 leading-tight border-none focus:ring-0 p-0 hover:bg-gray-50 rounded-xl transition-colors resize-none"
                                                rows="2"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 py-6 border-y border-gray-50">
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" /> Resale Market Value:
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-3xl font-black text-emerald-600">$</span>
                                                <input 
                                                    type="number"
                                                    value={aiResult.selling_price}
                                                    onChange={(e) => handleEditField('selling_price', e.target.value)}
                                                    className="text-3xl font-black text-emerald-600 bg-transparent border-none outline-none w-32 p-0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Condition:</span>
                                            <div className="text-lg font-bold text-indigo-900">{condition}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Premium Listing Description</span>
                                            <span className="text-[10px] text-gray-400 font-medium">Ready for eBay</span>
                                        </div>
                                        <textarea
                                            value={aiResult.description}
                                            onChange={(e) => handleEditField('description', e.target.value)}
                                            className="w-full text-sm font-medium text-gray-700 leading-relaxed bg-gray-50/80 p-6 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all h-[450px] shadow-inner"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <span className="text-sm font-bold text-gray-900">Extracted Item Specifics</span>
                                        <div className="grid grid-cols-2 gap-4">
                                            {Object.entries(aiResult.item_specifics).map(([key, value]) => (
                                                <div key={key} className="flex flex-col p-3 bg-gray-50 rounded-xl">
                                                    <span className="text-[10px] text-gray-400 font-bold">{key}</span>
                                                    <input 
                                                        value={value}
                                                        onChange={(e) => handleEditSpecific(key, e.target.value)}
                                                        className="text-sm font-semibold text-indigo-900 bg-transparent border-none outline-none p-0"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 disabled:bg-gray-400"
                                        >
                                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            Save to MongoDB
                                        </button>
                                        <button 
                                            onClick={handleListOnEbay}
                                            className="px-6 bg-indigo-50 text-indigo-600 font-bold rounded-2xl flex items-center justify-center border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiFetching;
