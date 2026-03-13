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

    const handleApiList = async (productId) => {
        try {
            const result = await listProduct(productId);
            alert(`Listing Request Sent! Response: ${result.message}`);
        } catch (error) {
            alert(`API Listing failed: ${error.message}. Make sure you've connected eBay on the Dashboard.`);
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
                                                <button onClick={() => handleApiList(product.id)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="List via eBay API">
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
        </div>
    );
};

export default ProductList;
