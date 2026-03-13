import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Edit, ShoppingBag, Package, User, ExternalLink, Briefcase, Link2, CheckCircle2 } from 'lucide-react';
import { getProducts, deleteProduct, listProduct, getEbayAuthUrl } from '../services/api';
import { Link, useLocation } from 'react-router-dom';

const ProductList = () => {
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
            const { url } = await getEbayAuthUrl('products'); // Tell eBay we are coming from products page
            window.location.href = url;
        } catch (error) {
            alert('Failed to get eBay Auth URL. Check backend.');
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
    const [listingLoading, setListingLoading] = useState(false);

    const handlePreviewListing = (product) => {
        setPreviewProduct(product);
    };

    const handleConfirmList = async () => {
        if (!previewProduct) return;
        
        setListingLoading(true);
        try {
            const result = await listProduct(previewProduct.id);
            alert(`SUCCESS: ${result.message}\nListing ID: ${result.listingId}`);
            setPreviewProduct(null);
        } catch (error) {
            const errorDetail = error.response?.data?.details || error.message;
            alert(`Listing failed: ${errorDetail}`);
        } finally {
            setListingLoading(false);
        }
    };

    const handleSendToEbay = (product) => {
        // Broadcast event for the Chrome Extension to pick up
        window.postMessage({ type: 'EbayAutoLister_SendData', payload: product }, '*');
        alert('Data sent to eBay Auto Lister. If you have the Chrome Extension installed, a new tab will open shortly.');
    };

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleEbayConnect}
                        className="flex items-center gap-2 bg-[#0053a0] text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-[#004080] transition-all shadow-md active:scale-95"
                    >
                        <Link2 className="w-3.5 h-3.5" />
                        Connect eBay
                    </button>
                    <Link to="/products/add" className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Product
                    </Link>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title, brand, or category..."
                            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#4F46E5]/10 focus:border-[#4F46E5] outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Condition</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4" colSpan="5">
                                            <div className="h-12 bg-gray-50 rounded-lg"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                <ShoppingBag className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 font-medium">No products found</p>
                                            <Link to="/products/add" className="text-[#4F46E5] text-sm mt-1 hover:underline">Add your first product</Link>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                                                    {product.images?.[0] ? (
                                                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package className="w-6 h-6 text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{product.title}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{product.brand || 'No brand'} · {product.category || 'Uncategorized'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-100">
                                                {product.condition_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <span className="font-bold text-gray-900">${product.selling_price}</span>
                                                {product.retail_price && Number(product.retail_price) > Number(product.selling_price) && (
                                                    <span className="text-gray-400 ml-2 line-through text-xs">${product.retail_price}</span>
                                                )}
                                                {product.discount_percentage && (
                                                    <span className="ml-1 text-red-600 text-xs font-bold">{product.discount_percentage}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-sm text-gray-600 truncate max-w-[120px]">{product.seller_name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handlePreviewListing(product)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Preview & List via eBay API">
                                                    <Briefcase className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleSendToEbay(product)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Fill via Extension">
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                                <Link to={`/products/edit/${product.id}`} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
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
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Preview eBay Listing</h2>
                                <p className="text-xs text-gray-500 mt-1">Check details before publishing to eBay</p>
                            </div>
                            <button onClick={() => setPreviewProduct(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">&times;</button>
                        </div>
                        
                        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                            <div className="flex gap-6">
                                <div className="w-32 h-32 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100 shrink-0">
                                    {previewProduct.images?.[0] ? (
                                        <img src={previewProduct.images[0]} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-10 h-10 text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{previewProduct.title}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md uppercase tracking-wider">{previewProduct.brand || 'No Brand'}</span>
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md uppercase tracking-wider">{previewProduct.category || 'General'}</span>
                                    </div>
                                    <div className="text-2xl font-black text-gray-900">${previewProduct.selling_price}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Edit className="w-4 h-4 text-indigo-600" />
                                    Description Preview
                                </h4>
                                <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 line-clamp-6 leading-relaxed border border-gray-100">
                                    {previewProduct.description || 'No description available.'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100">
                                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mb-1">eBay Marketplace</p>
                                    <p className="text-sm font-bold text-gray-900">eBay US (ebay.com)</p>
                                </div>
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-1">Shipping Location</p>
                                    <p className="text-sm font-bold text-gray-900">San Jose, CA (Default)</p>
                                </div>
                            </div>

                            {/* Item Specifics */}
                            {previewProduct.item_specifics && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-indigo-600" />
                                        Item Specifics (Aspects)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(
                                            typeof previewProduct.item_specifics === 'string' 
                                            ? JSON.parse(previewProduct.item_specifics) 
                                            : previewProduct.item_specifics
                                        ).map(([key, value]) => (
                                            <div key={key} className="flex justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-[11px]">
                                                <span className="text-gray-500 font-medium">{key}:</span>
                                                <span className="text-gray-900 font-bold">{Array.isArray(value) ? value.join(', ') : value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Variations Note replaced with actual Variations */}
                            {previewProduct.variations && previewProduct.variations.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-indigo-600" />
                                        Available Variations (Attributes)
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {previewProduct.variations.map((v, i) => (
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
                            )}

                            {!previewProduct.variations || previewProduct.variations.length === 0 && (
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

                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button 
                                onClick={() => setPreviewProduct(null)}
                                className="flex-1 px-6 py-3 rounded-2xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-100 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmList}
                                disabled={listingLoading}
                                className={`flex-1 px-6 py-3 rounded-2xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 ${listingLoading ? 'bg-gray-400' : 'bg-[#4F46E5] hover:bg-[#4338CA]'}`}
                            >
                                {listingLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Listing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Confirm & List on eBay
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductList;
