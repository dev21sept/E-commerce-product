import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, PlusCircle, Search, Bell, User, Menu, X, ChevronDown, Sparkles, Link as LinkIcon } from 'lucide-react';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

    const sidebarLinks = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Products List', path: '/products', icon: ShoppingBag },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-all"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0 lg:static lg:inset-auto
            `}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
                            <ShoppingBag className="text-white w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 tracking-tight">VA Help Listing</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-4">
                    {sidebarLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <link.icon className="w-5 h-5 mr-3" />
                            {link.name}
                        </NavLink>
                    ))}

                    {/* Add Product Dropdown */}
                    <div>
                        <button
                            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                            className={`w-full sidebar-link ${isAddMenuOpen ? 'text-[#4F46E5] bg-indigo-50/50' : ''}`}
                        >
                            <div className="flex items-center flex-1">
                                <PlusCircle className="w-5 h-5 mr-3" />
                                <span>Add Product</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isAddMenuOpen && (
                            <div className="ml-9 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                <NavLink
                                    to="/ebay-import"
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                                            isActive ? 'text-[#4F46E5] bg-indigo-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    <LinkIcon className="w-4 h-4 mr-2" />
                                    eBay Link
                                </NavLink>
                                <NavLink
                                    to="/ai-fetching"
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                                            isActive ? 'text-[#4F46E5] bg-indigo-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                        }`
                                    }
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    AI Fetch
                                </NavLink>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-2 py-3 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold text-gray-900 leading-tight truncate">Admin User</p>
                            <p className="text-[10px] text-gray-500 truncate">Master Account</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden w-full">
                {/* Top Navbar */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 z-30 shrink-0">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={toggleSidebar}
                            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg lg:hidden"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        
                        <div className="relative w-48 md:w-64 lg:w-96 hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-[#4F46E5]/20 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-4">
                        <button className="sm:hidden p-2 text-gray-400 hover:text-gray-600">
                            <Search className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-6 w-[1px] bg-gray-100"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                JD
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
