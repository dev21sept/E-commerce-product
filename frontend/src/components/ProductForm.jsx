import React, { useState, useEffect } from 'react';
import { Package, Image as ImageIcon, Plus, X, Loader2, Sparkles, AlertCircle, ChevronDown, User, ExternalLink, Tag } from 'lucide-react';

const ProductForm = ({ initialData, onSubmit, isFetching }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        brand: '',
        condition_name: '',
        retail_price: '',
        selling_price: '',
        discount_percentage: '',
        seller_name: '',
        seller_feedback: '',
        ebay_url: '',
        about_item: '',
        item_specifics: {},
        variations: [],
        images: []
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                item_specifics: typeof initialData.item_specifics === 'string'
                    ? JSON.parse(initialData.item_specifics)
                    : initialData.item_specifics || {},
                variations: initialData.variations || [],
                images: initialData.images || []
            });
        }
    }, [initialData]);

    const handleItemSpecificsChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            item_specifics: {
                ...prev.item_specifics,
                [key]: value
            }
        }));
    };

    const handleAddSpecific = () => {
        const keyName = prompt('Enter Item Specific Name (e.g. Material):');
        if (keyName && keyName.trim() !== '') {
            handleItemSpecificsChange(keyName, '');
        }
    };

    const handleRemoveSpecific = (key) => {
        setFormData(prev => {
            const newSpecs = { ...prev.item_specifics };
            delete newSpecs[key];
            return { ...prev, item_specifics: newSpecs };
        });
    };

    const handleVariationChange = (vIndex, listRawVal) => {
        setFormData(prev => {
            const newVariations = [...prev.variations];
            const valArray = listRawVal.split(',').map(s => s.trim()).filter(Boolean);
            newVariations[vIndex].values = valArray;
            return { ...prev, variations: newVariations };
        });
    };

    const handleAddVariation = () => {
        const name = prompt('Enter Attribute Name (e.g. Size, Color, Bundle):');
        if (name && name.trim()) {
            setFormData(prev => ({
                ...prev,
                variations: [...prev.variations, { name: name.trim(), values: [] }]
            }));
        }
    };

    const handleRemoveVariation = (vIndex) => {
        setFormData(prev => ({ ...prev, variations: prev.variations.filter((_, i) => i !== vIndex) }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const removeImage = (index) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Product Title */}
                    <div className="card p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Product Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Product Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    className="form-input"
                                    placeholder="Enter product title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* eBay URL */}
                            {formData.ebay_url && (
                                <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <ExternalLink className="w-4 h-4 text-blue-500 shrink-0" />
                                    <a href={formData.ebay_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                                        {formData.ebay_url}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Item description UI Section (Visual Editor) */}
                    <div className="card p-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                Product Description
                            </h3>
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-green-50 text-green-600 uppercase tracking-wider border border-green-100">
                                <Sparkles className="w-3 h-3" /> Visual Editor
                            </span>
                        </div>

                        <div
                            contentEditable={true}
                            className="form-input min-h-[300px] p-6 bg-white overflow-y-auto focus:ring-2 focus:ring-[#4F46E5]/20 focus:outline-none cursor-text prose prose-sm max-w-none"
                            onBlur={(e) => {
                                setFormData(prev => ({ ...prev, description: e.target.innerHTML }));
                            }}
                            dangerouslySetInnerHTML={{ __html: formData.description }}
                        />

                        <p className="mt-4 text-[11px] text-gray-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Click anywhere inside the box above to edit the text directly. Changes are saved when you click outside.
                        </p>
                    </div>




                    {/* Item Specifics */}
                    <div className="card p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Item Specifics</h3>
                            <button type="button" onClick={handleAddSpecific} className="text-[#4F46E5] text-sm font-bold flex items-center gap-1 hover:underline">
                                <Plus className="w-4 h-4" /> Add Specific
                            </button>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(formData.item_specifics).length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No specifics added</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(formData.item_specifics).map(([key, value]) => (
                                        <div key={key} className="flex flex-col p-3 bg-gray-50 rounded-lg group relative border border-gray-100">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{key}</span>
                                            <input
                                                type="text"
                                                className="bg-transparent border-b border-transparent focus:border-gray-300 focus:outline-none text-sm font-medium text-gray-700 w-full pt-1"
                                                value={value}
                                                onChange={(e) => handleItemSpecificsChange(key, e.target.value)}
                                            />
                                            <button type="button" onClick={() => handleRemoveSpecific(key)} className="absolute top-2 right-2 hidden group-hover:block text-red-500 bg-white p-1 rounded-full shadow-sm">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Media Gallery */}
                    <div className="card p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Product Images</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {formData.images.map((img, idx) => (
                                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                    {idx === 0 && (
                                        <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-md">Main</span>
                                    )}
                                </div>
                            ))}
                            {formData.images.length === 0 && (
                                <div className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-white col-span-2">
                                    <ImageIcon className="w-8 h-8 mb-2" />
                                    <span className="text-xs font-semibold">No images scraped</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">

                    {/* Condition */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Condition</h3>
                        <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                            <input
                                type="text"
                                name="condition_name"
                                className="bg-transparent w-full text-sm font-semibold text-green-800 focus:outline-none"
                                placeholder="e.g. New, Used, Refurbished"
                                value={formData.condition_name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Pricing</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Selling Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                                    <input
                                        type="text"
                                        name="selling_price"
                                        className="form-input pl-7 text-xl font-bold text-gray-900"
                                        placeholder="0.00"
                                        value={formData.selling_price}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">
                                    Original / Retail Price
                                    {formData.discount_percentage && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                            {formData.discount_percentage}
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                    <input
                                        type="text"
                                        name="retail_price"
                                        className="form-input pl-7 line-through text-gray-400"
                                        placeholder="0.00"
                                        value={formData.retail_price}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Organization */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Organization</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="form-label">Category</label>
                                <input
                                    type="text"
                                    name="category"
                                    className="form-input"
                                    placeholder="e.g. Electronics"
                                    value={formData.category}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="form-label">Brand</label>
                                <input
                                    type="text"
                                    name="brand"
                                    className="form-input"
                                    placeholder="e.g. Sony"
                                    value={formData.brand}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Variations */}
                    <div className="card p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Attributes</h3>
                            <button type="button" onClick={handleAddVariation} className="text-[#4F46E5] text-xs font-bold flex items-center gap-1 hover:underline">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>

                        {formData.variations.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No attributes (e.g., Size, Color)</p>
                        ) : (
                            <div className="space-y-4">
                                {formData.variations.map((variation, vIndex) => (
                                    <div key={vIndex} className="p-4 bg-gray-50 border border-gray-100 rounded-xl group relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">{variation.name}</label>

                                        {/* Dropdown preview */}
                                        <div className="relative">
                                            <select className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] cursor-pointer">
                                                {variation.values.map((val, i) => (
                                                    <option key={i} value={val}>{val}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>

                                        {/* All options as chips */}
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {variation.values.map((val, i) => (
                                                <span key={i} className="px-2 py-1 bg-white border border-gray-200 text-xs font-medium text-gray-600 rounded-md">
                                                    {val}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Edit field (comma separated) */}
                                        <input
                                            type="text"
                                            className="mt-2 w-full text-xs text-gray-400 bg-transparent border-b border-transparent focus:border-gray-300 focus:outline-none"
                                            value={variation.values.join(', ')}
                                            onChange={(e) => handleVariationChange(vIndex, e.target.value)}
                                            placeholder="Edit: Red, Blue, Green"
                                        />

                                        <button type="button" onClick={() => handleRemoveVariation(vIndex)} className="absolute top-3 right-3 text-red-500 hover:bg-red-50 p-1 rounded-md hidden group-hover:block transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Seller Info */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">About this Seller</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-[#4F46E5]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <input
                                        type="text"
                                        name="seller_name"
                                        className="bg-transparent w-full text-sm font-bold text-gray-900 focus:outline-none"
                                        placeholder="Seller name"
                                        value={formData.seller_name}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <textarea
                                name="seller_feedback"
                                className="w-full text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/20 min-h-[60px]"
                                placeholder="Seller feedback info..."
                                value={formData.seller_feedback}
                                onChange={handleChange}
                            ></textarea>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        type="submit"
                        className="w-full btn-primary py-4 text-lg font-bold shadow-xl shadow-[#4F46E5]/20 flex items-center justify-center gap-2"
                    >
                        {initialData ? 'Update Product' : 'Save Product'}
                    </button>
                </div>
            </div>

            {
                isFetching && (
                    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center transition-all animate-in fade-in">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center text-center max-w-sm">
                            <div className="w-16 h-16 bg-[#4F46E5]/10 rounded-full flex items-center justify-center mb-4 relative">
                                <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Fetching eBay Data</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Scraping the eBay page to extract all product details, images, attributes, and seller info...
                            </p>
                        </div>
                    </div>
                )
            }
        </form >
    );
};

export default ProductForm;
