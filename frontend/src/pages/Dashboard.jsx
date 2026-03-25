import React, { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, Package, Tag, ArrowUpRight, Link2, Sparkles, Plus, ExternalLink, Clock } from 'lucide-react';
import { getProducts, getEbayAuthUrl } from '../services/api';
import { Link, useLocation } from 'react-router-dom';

const Dashboard = () => {
    const location = useLocation();
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalValue: 0,
        aiCount: 0,
        ebayCount: 0
    });
    const [recentProducts, setRecentProducts] = useState([]);
    const [authStatus, setAuthStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('ebay_auth') === 'success') {
            setAuthStatus('Successfully connected to eBay!');
            window.history.replaceState({}, document.title, "/");
        }

        const fetchData = async () => {
            try {
                const products = await getProducts();
                const totalValue = products.reduce((sum, p) => sum + Number(p.selling_price || 0), 0);
                const aiCount = products.filter(p => p.source === 'ai').length;
                const ebayCount = products.filter(p => p.source === 'ebay').length;

                setStats({
                    totalProducts: products.length,
                    totalValue,
                    aiCount,
                    ebayCount
                });
                
                setRecentProducts(products.slice(0, 4));
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [location]);

    const handleEbayConnect = () => {
        window.open('https://signin.ebay.com/signin/', '_blank');
    };

    const statCards = [
        { name: 'Total Inventory', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12% from last month' },
        { name: 'Total Portfolio Value', value: `$${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Average price: $' + (stats.totalProducts > 0 ? (stats.totalValue / stats.totalProducts).toFixed(2) : 0) },
        { name: 'AI Gen Listings', value: stats.aiCount, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50', trend: ((stats.aiCount / stats.totalProducts || 0) * 100).toFixed(0) + '% of total' },
        { name: 'eBay Imports', value: stats.ebayCount, icon: Link2, color: 'text-orange-600', bg: 'bg-orange-50', trend: ((stats.ebayCount / stats.totalProducts || 0) * 100).toFixed(0) + '% of total' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
            {/* Top Bar with Welcome */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Welcome Back, Admin <span className="text-2xl animate-bounce">👋</span>
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium italic">VA Help Listing - Real-time inventory insights.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleEbayConnect}
                        className="flex items-center gap-2 bg-white text-[#0053a0] border border-[#0053a0]/20 px-6 py-2.5 rounded-2xl font-bold text-sm hover:bg-[#0053a0]/5 transition-all active:scale-95 shadow-sm"
                    >
                        <Link2 className="w-4 h-4" />
                        Sync eBay
                    </button>
                    <Link 
                        to="/products/add" 
                        className="flex items-center gap-2 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:translate-y-[-2px] transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Create New Listing
                    </Link>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card) => (
                    <div key={card.name} className="group relative bg-white rounded-3xl p-6 border border-gray-100 hover:border-[#4F46E5]/20 hover:shadow-xl hover:shadow-[#4F46E5]/5 transition-all duration-300">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-500`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{card.trend}</span>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1">{card.value}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.name}</p>
                        
                        <div className="absolute bottom-0 left-6 right-6 h-1 rounded-t-full bg-transparent group-hover:bg-[#4F46E5]/10 transition-all"></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Products Table/List */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Recently Added Products</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Your latest inventory updates.</p>
                        </div>
                        <Link to="/products" className="text-xs font-bold text-[#4F46E5] bg-[#4F46E5]/5 px-4 py-2 rounded-xl hover:bg-[#4F46E5]/10 transition-all">View All Products</Link>
                    </div>
                    
                    <div className="relative">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4F46E5]"></div>
                            </div>
                        ) : recentProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400 italic">
                                <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
                                <p>No products yet. Start by adding one!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {recentProducts.map((product) => (
                                    <div key={product.id} className="p-4 hover:bg-gray-50/80 transition-all flex items-center gap-4 group">
                                        <div className="w-16 h-16 rounded-2xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100 group-hover:scale-105 transition-transform">
                                            {product.images?.[0] ? (
                                                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Package className="w-6 h-6 text-gray-200" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-bold text-gray-900 truncate">{product.title}</p>
                                                {product.source === 'ai' ? (
                                                    <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <Link2 className="w-3 h-3 text-blue-500 shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400">
                                                <span className="uppercase">{product.brand || 'No Brand'}</span>
                                                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                                <span className="text-gray-900">${product.selling_price}</span>
                                                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'Today'}
                                                </div>
                                            </div>
                                        </div>
                                        <Link 
                                            to={`/products/edit/${product.id}`}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:border-[#4F46E5] hover:text-[#4F46E5]"
                                        >
                                            <ArrowUpRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side Column */}
                <div className="space-y-8">
                    {/* Feature Highlight Card */}
                    <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-[#4F46E5]/30">
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-2xl font-black mb-3 leading-tight">Supercharge with AI Analysis</h3>
                                <p className="text-white/80 text-sm leading-relaxed mb-8">
                                    Let our AI handle the boring stuff. Upload images and get high-converting eBay listings in seconds.
                                </p>
                            </div>
                            <Link to="/products/add" className="w-full bg-white text-[#4F46E5] font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-lg active:scale-[0.98]">
                                Try AI Fetching
                                <ArrowUpRight className="w-4 h-4" />
                            </Link>
                        </div>
                        
                        {/* Decorative blobs */}
                        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    </div>

                    {/* System Status / Health */}
                    <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Connection Health</h4>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-sm font-bold text-gray-700">Database</span>
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">Online</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-sm font-bold text-gray-700">eBay API</span>
                                </div>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase">Active</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                    <span className="text-sm font-bold text-gray-700">OpenAI Vision</span>
                                </div>
                                <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full uppercase">Stable</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
