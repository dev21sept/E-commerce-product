import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, PlusCircle, Search, Bell, User, Sparkles } from 'lucide-react';

const Layout = ({ children }) => {
    const sidebarLinks = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Products List', path: '/products', icon: ShoppingBag },
        { name: 'Add Product', path: '/products/add', icon: PlusCircle },
    ];

    return (
        <div className="flex h-screen bg-[#F9FAFB]">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
                            <ShoppingBag className="text-white w-5 h-5" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 tracking-tight">VA Help Listing</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {sidebarLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <link.icon className="w-5 h-5 mr-3" />
                            {link.name}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-2 py-3 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-900 leading-tight">Admin User</p>
                            <p className="text-[10px] text-gray-500">Master Account</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Navbar */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 z-10">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-[#4F46E5]/20 focus:bg-white transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all">
                            <Bell className="w-5 h-5" />
                        </button>
                        <div className="h-8 w-[1px] bg-gray-100"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center font-bold text-xs">
                                JD
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
