import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import EbayImport from './pages/EbayImport';
import EditProduct from './pages/EditProduct';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AiFetching from './pages/AiFetching';
import AdminLogin from './pages/AdminLogin';

import { ToastProvider } from './components/Toast';

// Placeholder ...
const ExtensionPage = () => <div className="p-8"><h1 className="text-2xl font-bold">Extension Listing Tool</h1><p className="text-gray-500 mt-2">Manage your eBay listings via Chrome Extension.</p></div>;
const SingleListingPage = () => <div className="p-8"><h1 className="text-2xl font-bold">Single API Listing</h1><p className="text-gray-500 mt-2">Create high-speed listings using direct eBay APIs.</p></div>;
const BulkListingPage = () => <div className="p-8"><h1 className="text-2xl font-bold">Bulk / Multiple API Lister</h1><p className="text-gray-500 mt-2">Upload multiple products simultaneously.</p></div>;

function App() {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('va_admin_session');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('va_admin_session', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('va_admin_session');
        window.location.href = '/'; // Simple hard redirect to clear state
    };

    if (!user) {
        return (
            <ToastProvider>
                <AdminLogin onLogin={handleLogin} />
            </ToastProvider>
        );
    }

    return (
        <ToastProvider>
            <Router>
                <Layout onLogout={handleLogout} user={user}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/products" element={<ProductList />} />
                        <Route path="/ebay-import" element={<EbayImport />} />
                        <Route path="/products/edit/:id" element={<EditProduct />} />
                        <Route path="/ai-fetching" element={<AiFetching />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/list/extension" element={<ExtensionPage />} />
                        <Route path="/list/single" element={<SingleListingPage />} />
                        <Route path="/list/bulk" element={<BulkListingPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </Router>
        </ToastProvider>
    );
}

export default App;

