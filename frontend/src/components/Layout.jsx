import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { syncEbayData, getEbayConnectionStatus, getEbayAuthUrl, disconnectEbay } from '../services/api';
import { 
    LayoutDashboard, 
    ShoppingBag, 
    PlusCircle, 
    Search, 
    Bell, 
    User, 
    Menu, 
    X, 
    ChevronDown, 
    Sparkles, 
    Link as LinkIcon, 
    Zap, 
    LayoutList, 
    Layers, 
    Chrome, 
    Database, 
    Settings,
    HelpCircle,
    Package,
    LogOut
} from 'lucide-react';

const Layout = ({ children, onLogout, user }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [ebayStatus, setEbayStatus] = useState({ connected: false, sellerName: '' });
    const location = useLocation();

    // Automatically collapse sidebar on Tool pages (Fetch/List)
    useEffect(() => {
        const isToolPage = location.pathname.includes('/ebay-import') || 
                          location.pathname.includes('/ai-fetching') || 
                          location.pathname.includes('/list/');
        
        if (isToolPage) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
        }
    }, [location.pathname]);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const status = await getEbayConnectionStatus();
                setEbayStatus(status);
            } catch (err) {
                console.error('Failed to fetch eBay status');
            }
        };
        fetchStatus();
    }, []);

    const handleEbayDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect this eBay account? You will need to login again to list products.')) return;
        try {
            await disconnectEbay();
            setEbayStatus({ connected: false, sellerName: '', environment: 'PRODUCTION' });
        } catch (err) {
            console.error('Failed to disconnect eBay:', err);
        }
    };

    const navGroups = [
        {
            id: 'manage',
            title: 'MANAGE',
            items: [
                { name: 'Dashboard', path: '/', icon: LayoutDashboard },
                { name: 'Inventory', path: '/products', icon: Package },
            ]
        },
        {
            id: 'fetch',
            title: 'FETCH TOOLS',
            items: [
                { name: 'eBay Link', path: '/ebay-import', icon: LinkIcon },
                { name: 'AI Fetch', path: '/ai-fetching', icon: Sparkles },
            ]
        },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-all"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out
                ${isSidebarOpen ? 'w-64' : 'w-20'}
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static lg:inset-auto'}
            `}>
                {/* Logo Section */}
                <div className="h-20 flex items-center px-6 border-b border-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 flex-shrink-0">
                            <ShoppingBag className="text-white w-6 h-6" />
                        </div>
                        {isSidebarOpen && (
                            <span className="text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap overflow-hidden">
                                VA LISTER
                            </span>
                        )}
                    </div>
                </div>

                {/* eBay Connection Card */}
                {isSidebarOpen && (
                    <div className="mx-4 mt-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 animate-in fade-in duration-500">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <Database className="w-4 h-4 text-[#4F46E5]" />
                            </div>
                            <div className="overflow-hidden">
                                <div className="flex flex-col mb-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Account</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-black text-gray-900 leading-tight">
                                            {ebayStatus.connected ? (ebayStatus.sellerName || '') : 'DISCONNECTED'}
                                        </p>
                                    </div>
                                </div>
                                <p className={`text-[9px] flex items-center gap-1 font-black uppercase tracking-tight ${ebayStatus.connected ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${ebayStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                    {ebayStatus.connected ? 'Connectivity Active' : 'Login Required'}
                                </p>
                            </div>
                        </div>
                        
                        {ebayStatus.connected && (
                            <button 
                                onClick={handleEbayDisconnect}
                                className="w-full mt-3 py-1.5 border border-rose-100 bg-rose-50/30 text-rose-500 text-[9px] font-black rounded-lg uppercase tracking-widest hover:bg-rose-50 transition-colors"
                            >
                                Force Logout eBay
                            </button>
                        )}
                        <button 
                            onClick={async () => {
                                if (ebayStatus.connected) {
                                    try {
                                        alert('Sync started in background...');
                                        await syncEbayData();
                                        window.location.reload();
                                    } catch (err) {
                                        alert('Sync failed. Please check connection.');
                                    }
                                } else {
                                    try {
                                        const { url } = await getEbayAuthUrl('dashboard');
                                        if (url) window.location.href = url;
                                    } catch (err) {
                                        alert('Failed to connect. Check backend.');
                                    }
                                }
                            }}
                            className={`w-full py-1.5 text-[10px] font-bold rounded-lg border transition-all shadow-sm ${
                                ebayStatus.connected 
                                ? 'bg-white text-[#4F46E5] border-indigo-100 hover:bg-[#4F46E5] hover:text-white' 
                                : 'bg-[#4F46E5] text-white border-transparent hover:bg-[#4338CA]'
                            }`}
                        >
                            {ebayStatus.connected ? 'SYNC DATA NOW' : 'CONNECT EBAY'}
                        </button>


                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-6 mt-6 overflow-y-auto no-scrollbar">
                    {navGroups.map((group) => (
                        <div key={group.id} className="space-y-1">
                            {isSidebarOpen && (
                                <h3 className="px-4 text-[10px] font-bold text-gray-400 tracking-widest mb-2 animate-in slide-in-from-left-2">
                                    {group.title}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        title={!isSidebarOpen ? item.name : ''}
                                        className={({ isActive }) => `
                                            flex items-center px-4 py-3 rounded-xl transition-all duration-200 group
                                            ${isActive 
                                                ? 'bg-[#4F46E5] text-white shadow-md shadow-indigo-100' 
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                                            ${!isSidebarOpen ? 'justify-center px-0' : ''}
                                        `}
                                    >
                                        <item.icon className={`${isSidebarOpen ? 'mr-3' : ''} w-5 h-5 transition-transform group-hover:scale-110`} />
                                        {isSidebarOpen && <span className="font-medium text-sm">{item.name}</span>}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Profile Section & Logout */}
                <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-3">
                    <div className={`flex items-center gap-3 ${isSidebarOpen ? 'px-2 py-3 bg-gray-50 rounded-2xl' : 'justify-center'}`}>
                        <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-xl shadow-sm border border-white flex items-center justify-center flex-shrink-0 overflow-hidden text-white font-bold">
                            {user?.role === 'admin' ? 'A' : 'V'}
                        </div>
                        {isSidebarOpen && (
                            <div className="overflow-hidden">
                                <p className="text-xs font-black text-gray-900 leading-tight truncate uppercase tracking-tight">Admin Portal</p>
                                <p className="text-[9px] text-gray-500 font-bold truncate">{user?.email}</p>
                            </div>
                        )}
                    </div>
                    
                    {isSidebarOpen ? (
                        <button 
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-bold text-xs group"
                        >
                            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Sign Out Account
                        </button>
                    ) : (
                        <button 
                            onClick={onLogout}
                            title="Sign Out"
                            className="w-full flex justify-center py-3 text-rose-400 hover:text-rose-600 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden w-full relative">
                {/* Toggle Sidebar Button (Desktop) */}
                <button 
                    onClick={toggleSidebar}
                    className="hidden lg:flex absolute left-0 top-20 -ml-3 w-6 h-6 bg-white border border-gray-100 rounded-full shadow-sm items-center justify-center text-gray-400 hover:text-[#4F46E5] z-50 transition-all hover:scale-110"
                >
                    <Menu className={`w-3.5 h-3.5 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Top Navbar */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 lg:px-10 z-30 shrink-0">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsMobileOpen(true)}
                            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl lg:hidden"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        
                        <div className="relative w-48 md:w-64 lg:w-96 hidden sm:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full bg-gray-50/50 border border-transparent rounded-xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-[#4F46E5]/10 focus:border-[#4F46E5]/20 focus:bg-white transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-5">
                        <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all relative">
                            <Bell className="w-5.5 h-5.5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-8 w-[1px] bg-gray-100 mx-1"></div>
                        <div className="flex items-center gap-3 pl-1">
                            <div className="flex flex-col items-end hidden md:block">
                                <p className="text-sm font-bold text-gray-900 leading-tight">Admin</p>
                                <p className="text-[10px] text-indigo-500 font-bold tracking-tight">ONLINE</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] text-white flex items-center justify-center font-bold text-sm shadow-indigo-100 shadow-lg">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F9FAFB]/50">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;

