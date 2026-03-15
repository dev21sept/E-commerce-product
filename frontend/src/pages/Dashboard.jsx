import React, { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, Package, Tag, ArrowUpRight, Link2 } from 'lucide-react';
import { getProducts, getEbayAuthUrl } from '../services/api';
import { Link, useLocation } from 'react-router-dom';

const Dashboard = () => {
    const location = useLocation();
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalValue: 0,
        brands: 0,
        categories: 0
    });
    const [authStatus, setAuthStatus] = useState(null);

    useEffect(() => {
        // Check for eBay auth status in URL
        const params = new URLSearchParams(location.search);
        if (params.get('ebay_auth') === 'success') {
            setAuthStatus('Successfully connected to eBay!');
            // Clear the param from URL
            window.history.replaceState({}, document.title, "/");
        }

        const fetchData = async () => {
            try {
                const products = await getProducts();
                const totalValue = products.reduce((sum, p) => sum + Number(p.selling_price || 0), 0);
                const brands = new Set(products.map(p => p.brand).filter(Boolean)).size;
                const categories = new Set(products.map(p => p.category).filter(Boolean)).size;

                setStats({
                    totalProducts: products.length,
                    totalValue,
                    brands,
                    categories
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            }
        };
        fetchData();
    }, [location]);

    const handleEbayConnect = async () => {
        try {
            const { url } = await getEbayAuthUrl();
            window.location.href = url;
        } catch (error) {
            alert('Failed to get eBay Auth URL. Is the backend running?');
        }
    };

    const cards = [
        { name: 'Total Products', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
        { name: 'Total Value', value: `$${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        { name: 'Brands', value: stats.brands, icon: Tag, color: 'text-purple-600', bg: 'bg-purple-50' },
        { name: 'Categories', value: stats.categories, icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {authStatus && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center justify-between">
                    <span>{authStatus}</span>
                    <button onClick={() => setAuthStatus(null)} className="text-green-700 font-bold">×</button>
                </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-gray-500 mt-1">Your eBay product inventory at a glance.</p>
                </div>
                <button 
                    onClick={handleEbayConnect}
                    className="flex items-center gap-2 bg-[#0053a0] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#004080] transition-all shadow-md active:scale-95"
                >
                    <Link2 className="w-4 h-4" />
                    Connect eBay Account
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => (
                    <div key={card.name} className="card p-6 flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">{card.name}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                            <card.icon className="w-6 h-6" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                        <Link to="/products" className="text-xs font-semibold text-[#4F46E5] hover:underline">View all</Link>
                    </div>
                    <div className="p-6 space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                    <Package className="w-5 h-5 text-gray-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Product imported from eBay</p>
                                    <p className="text-xs text-gray-500">Recently added</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card bg-[#4F46E5] text-white p-8 flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold mb-2">Import from eBay</h3>
                        <p className="text-white/80 text-sm max-w-xs leading-relaxed">
                            Paste an eBay URL to automatically import all product details — title, images, specifics, variations, seller info, and pricing.
                        </p>
                    </div>
                    <div className="relative z-10 mt-8">
                        <Link to="/products/add" className="btn-primary !bg-white !text-[#4F46E5] px-8 py-3">
                            Get Started
                            <ArrowUpRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                        </Link>
                    </div>

                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
