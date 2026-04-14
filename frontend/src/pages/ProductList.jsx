import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Edit, ShoppingBag, Package, User, ExternalLink, Link2, Eye, CheckCircle2, Sparkles } from 'lucide-react';
import { getProducts, deleteProduct, getEbayAuthUrl } from '../services/api';
import { Link, useLocation } from 'react-router-dom';

const ProductList = () => {
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'ai', 'ebay'
    const [authStatus, setAuthStatus] = useState(null);

    useEffect(() => {
        // Check for eBay auth status in URL
        const params = new URLSearchParams(location.search);
        if (params.get('ebay_auth') === 'success') {
            setAuthStatus('Successfully connected to eBay!');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        loadProducts();
    }, [location]);

    const handleEbayConnect = async () => {
        try {
            setAuthStatus("Connecting to eBay...");
            const { url } = await getEbayAuthUrl('products');
            window.location.href = url;
        } catch (error) {
            console.error('Failed to get eBay Auth URL:', error);
            setAuthStatus("Error: Could not connect to eBay. Check server console.");
        }
    };

    const loadProducts = async () => {
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteProduct(id);
                setProducts(products.filter(p => p.id !== id));
            } catch (error) {
                alert('Failed to delete product');
            }
        }
    };

    const [previewProduct, setPreviewProduct] = useState(null);

    const handlePreviewListing = (product) => {
        setPreviewProduct(product);
    };

    const handleSendToEbay = (product) => {
        setAuthStatus("Sending data to eBay Extension...");
        window.postMessage({ type: 'EbayAutoLister_SendData', payload: product }, '*');
        setTimeout(() => setAuthStatus(null), 3000);
    };

    const handleSendToPoshmark = (product) => {
        window.postMessage({ type: 'PoshmarkAutoLister_SendData', payload: product }, '*');
        alert('Listing data sent to Poshmark Extension! 🚀 Opening Poshmark...');
    };

    const handleSendToVinted = (product) => {
        window.postMessage({ type: 'VintedAutoLister_SendData', payload: product }, '*');
        alert('Listing data sent to Vinted Extension! 🚀 Opening Vinted...');
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesSource = sourceFilter === 'all' || 
            (sourceFilter === 'ai' && p.source === 'ai') || 
            (sourceFilter === 'ebay' && (p.source === 'ebay' || p.source === 'scraper'));
            
        return matchesSearch && matchesSource;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {authStatus && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">{authStatus}</span>
                    </div>
                    <button onClick={() => setAuthStatus(null)} className="text-green-700 font-bold">×</button>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-500 mt-1">Manage your eBay product inventory.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleEbayConnect}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#0053a0] text-white px-4 md:px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#004080] transition-all shadow-md active:scale-95"
                    >
                        <Link2 className="w-4 h-4" />
                        Connect eBay
                    </button>
                    <Link to="/products/add" className="flex-1 sm:flex-none btn-primary justify-center">
                        <Plus className="w-5 h-5" />
                        Add Product
                    </Link>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title, brand, or category..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#4F46E5]/10 focus:border-[#4F46E5]/40 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {/* Source Filter Buttons */}
                    <div className="flex p-1 bg-gray-100 rounded-xl w-full md:w-fit overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setSourceFilter('all')}
                            className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                sourceFilter === 'all' 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setSourceFilter('ebay')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                sourceFilter === 'ebay' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Link2 className="w-3.5 h-3.5" />
                            eBay
                        </button>
                        <button
                            onClick={() => setSourceFilter('ai')}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                sourceFilter === 'ai' 
                                    ? 'bg-white text-emerald-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            AI
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Added</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Source</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condition</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4" colSpan="6">
                                            <div className="h-12 bg-gray-50 rounded-lg"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                <ShoppingBag className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 font-medium italic">No products found for this source</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50/50 transition-all group border-b border-gray-50 last:border-none">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                                                    {product.images?.[0] ? (
                                                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="w-6 h-6 text-gray-200" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-[#4F46E5] transition-colors">{product.title}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{product.brand || 'No Brand'}</span>
                                                        <span className="text-[10px] font-medium text-gray-400">{product.category || 'General'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-semibold text-gray-600">
                                                {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
                                            </div>
                                            <div className="text-[10px] text-gray-400">
                                                {product.created_at ? new Date(product.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.source === 'ai' ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                                    <Sparkles className="w-3 h-3" /> AI Fetch
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-100">
                                                    <Link2 className="w-3 h-3" /> {product.source === 'scraper' ? 'Scraped Link' : 'eBay Import'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                                {product.condition_name?.substring(0, 20) || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-900">${product.selling_price}</span>
                                                {product.retail_price > 0 && (
                                                    <span className="text-[10px] text-gray-400 line-through">${product.retail_price}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2.5">
                                                <button 
                                                    onClick={() => handlePreviewListing(product)} 
                                                    className="w-9 h-9 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-100 shadow-sm" 
                                                    title="Preview & List to Marketplaces"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </button>
                                                <Link 
                                                    to={`/products/edit/${product.id}`} 
                                                    className="w-9 h-9 flex items-center justify-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-100 shadow-sm" 
                                                    title="Edit Product"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button 
                                                    onClick={() => handleDelete(product.id)} 
                                                    className="w-9 h-9 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-100 shadow-sm" 
                                                    title="Delete Product"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredProducts.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                        <p className="text-xs text-gray-500">Showing {filteredProducts.length} of {products.length} products</p>
                    </div>
                )}
            </div>
            {/* Preview Modal */}
            {previewProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-gray-900">Preview eBay Listing</h2>
                                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Check details before publishing to eBay</p>
                            </div>
                            <button onClick={() => setPreviewProduct(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors font-bold">&times;</button>
                        </div>

                        <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                                <div className="w-full sm:w-32 aspect-square sm:h-32 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100 shrink-0">
                                    {previewProduct.images?.[0] ? (
                                        <img src={previewProduct.images[0]} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-10 h-10 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-base md:text-lg font-bold text-gray-900 leading-tight">{previewProduct.title}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md uppercase tracking-wider">{previewProduct.brand || 'No Brand'}</span>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md uppercase tracking-wider">{previewProduct.category || 'General'}</span>
                                    </div>
                                    <div className="text-xl md:text-2xl font-black text-gray-900">${previewProduct.selling_price}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Edit className="w-4 h-4 text-indigo-600" />
                                    Description Preview
                                </h4>
                                <div
                                    className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 overflow-y-auto max-h-60 leading-relaxed border border-gray-100 preview-description"
                                    dangerouslySetInnerHTML={{ __html: previewProduct.description || 'No description available.' }}
                                />
                            </div>


                            {/* Item Specifics vs Business Policies Logic */}
                            {(() => {
                                const specifics = typeof previewProduct.item_specifics === 'string'
                                    ? JSON.parse(previewProduct.item_specifics)
                                    : (previewProduct.item_specifics || {});

                                const policyKeys = ['shipping', 'returns', 'delivery', 'import fees', 'payment', 'handling', 'postage'];

                                const itemAspects = {};
                                const businessPolicies = {};

                                Object.entries(specifics).forEach(([key, value]) => {
                                    const lowerKey = key.toLowerCase();
                                    if (policyKeys.some(pk => lowerKey.includes(pk))) {
                                        businessPolicies[key] = value;
                                    } else {
                                        itemAspects[key] = value;
                                    }
                                });

                                return (
                                    <>
                                        {/* Pure Item Specifics */}
                                        {Object.keys(itemAspects).length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                    <Filter className="w-4 h-4 text-indigo-600" />
                                                    Item Specifics (Aspects)
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {Object.entries(itemAspects).map(([key, value]) => (
                                                        <div key={key} className="flex justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-[11px] gap-4">
                                                            <span className="text-gray-500 font-medium capitalize shrink-0">{key}:</span>
                                                            <span className="text-gray-900 font-bold text-right truncate">{Array.isArray(value) ? value.join(', ') : value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Business Policies Section */}
                                        {Object.keys(businessPolicies).length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                    <ShoppingBag className="w-4 h-4 text-green-600" />
                                                    Business Policies (Shipping & Returns)
                                                </h4>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {Object.entries(businessPolicies).map(([key, value]) => (
                                                        <div key={key} className="p-3 bg-green-50/30 rounded-xl border border-green-100/50 text-[11px] flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1"></div>
                                                            <p><span className="text-green-700 font-bold capitalize">{key}:</span> <span className="text-gray-600">{value}</span></p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Enhanced variations display */}
                            {(() => {
                                const displayVariations = previewProduct.variationsFormatted || [];
                                if (displayVariations.length === 0 && previewProduct.variations?.length > 0) {
                                    // Fallback: Group manual variations if not already formatted
                                    const vMap = {};
                                    previewProduct.variations.forEach(v => {
                                        if (!vMap[v.name]) vMap[v.name] = [];
                                        vMap[v.name].push(v.value);
                                    });
                                    Object.keys(vMap).forEach(name => displayVariations.push({ name, values: vMap[name] }));
                                }

                                if (displayVariations.length === 0) return null;

                                return (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <Package className="w-4 h-4 text-indigo-600" />
                                            Available Variations (Attributes)
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {displayVariations.map((v, i) => (
                                                <div key={i} className="bg-orange-50 border border-orange-100 p-3 rounded-2xl flex-1 min-w-[140px]">
                                                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mb-1">{v.name}</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {v.values.map((val, j) => (
                                                            <span key={j} className="px-2 py-0.5 bg-white border border-orange-200 text-orange-800 text-[10px] font-bold rounded-md">
                                                                {val}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-gray-400 italic mt-1">* Note: These will be listed as a multi-variation group on eBay.</p>
                                    </div>
                                );
                            })()}

                            {(!previewProduct.variations || previewProduct.variations.length === 0) && (
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                                    <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-700">Single Product</p>
                                        <p className="text-[10px] text-gray-500 leading-relaxed">
                                            This product does not have variations. It will be listed as a single item.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 md:p-6 bg-gray-50/50 border-t border-gray-100 space-y-4">
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-1">Select Marketplace to List</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {(!previewProduct.target_platform || previewProduct.target_platform === 'ebay') && (
                                        <button
                                            onClick={() => {
                                                handleSendToEbay(previewProduct);
                                                setPreviewProduct(null);
                                            }}
                                            className="px-4 py-3 rounded-xl bg-[#0053a0] font-bold text-white hover:bg-[#004080] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 text-xs"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open in eBay Extension
                                        </button>
                                    )}
                                    {(!previewProduct.target_platform || previewProduct.target_platform === 'ebay') && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setAuthStatus("Listing directly on eBay API...");
                                                    const res = await listProduct(previewProduct.id);
                                                    setAuthStatus(`✅ ${res.message} ID: ${res.listingId}`);
                                                    setPreviewProduct(null);
                                                } catch (err) {
                                                    alert('Listing failed: ' + (err.response?.data?.details || err.message));
                                                    setAuthStatus(null);
                                                }
                                            }}
                                            className="px-4 py-3 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 text-xs"
                                        >
                                            <Zap className="w-4 h-4" />
                                            List Directly via eBay API (Instant)
                                        </button>
                                    )}
                                    {(!previewProduct.target_platform || previewProduct.target_platform === 'ebay') && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setAuthStatus("Saving as Draft on eBay API...");
                                                    const res = await listProduct(previewProduct.id, true);
                                                    setAuthStatus(`✅ ${res.message}`);
                                                    setPreviewProduct(null);
                                                } catch (err) {
                                                    alert('Draft failed: ' + (err.response?.data?.details || err.message));
                                                    setAuthStatus(null);
                                                }
                                            }}
                                            className="px-4 py-3 rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600 transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 text-xs"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Save as Draft (No Fees)
                                        </button>
                                    )}
                                    {(!previewProduct.target_platform || previewProduct.target_platform === 'poshmark') && (
                                        <button
                                            onClick={() => {
                                                handleSendToPoshmark(previewProduct);
                                                setPreviewProduct(null);
                                            }}
                                            className="px-4 py-3 rounded-xl bg-[#8D182E] font-bold text-white hover:bg-[#6A1222] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 text-xs"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open in Poshmark Extension
                                        </button>
                                    )}
                                    {(!previewProduct.target_platform || previewProduct.target_platform === 'vinted') && (
                                        <button
                                            onClick={() => {
                                                handleSendToVinted(previewProduct);
                                                setPreviewProduct(null);
                                            }}
                                            className="px-4 py-3 rounded-xl bg-[#09B1BA] font-bold text-white hover:bg-[#078E95] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 text-xs"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Open in Vinted Extension
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <button
                                onClick={() => setPreviewProduct(null)}
                                className="w-full py-3 rounded-xl bg-white border border-gray-200 font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95 text-xs"
                            >
                                Not Now - Back to List
                            </button>
                        </div>
                        <div className="px-6 pb-4 bg-gray-50/50 text-center">
                            <p className="text-[10px] text-gray-400">
                                This will open eBay in a new tab and auto-fill all information shown above.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductList;
