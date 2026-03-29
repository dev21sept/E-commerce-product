import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Link as LinkIcon, AlertCircle, Cpu } from 'lucide-react';
import ProductForm from '../components/ProductForm';
import AiFetchSection from '../components/AiFetchSection';
import { fetchEbayProduct, createProduct, scrapeEbayDescription } from '../services/api';

const AddProduct = () => {
    const navigate = useNavigate();
    const [ebayUrl, setEbayUrl] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState('');
    const [scrapedData, setScrapedData] = useState(null);
    const [fetchMethod, setFetchMethod] = useState('ebay'); // 'ebay' or 'ai'

    const handleFetchEbayData = async (url) => {
        try {
            const data = await scrapeEbayDescription(url);
            setScrapedData(prev => ({ ...prev, ...data }));
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const handleFetchEbay = async () => {
        if (!ebayUrl) return setError('Please paste an eBay product URL');
        if (!ebayUrl.includes('ebay.com')) return setError('Invalid eBay URL');

        setError('');
        setIsFetching(true);
        try {
            const data = await fetchEbayProduct(ebayUrl);

            // Clean up price (remove symbols, convert to number)
            const cleanPrice = parseFloat(data.price?.replace(/[^0-9.]/g, '') || 0);
            const cleanRetailPrice = data.retailPrice ? parseFloat(data.retailPrice.replace(/[^0-9.]/g, '') || 0) : '';

            setScrapedData({
                title: data.title || '',
                description: data.description || '',
                category: data.category || '',
                brand: data.brand || '',
                condition_name: data.condition || '',
                selling_price: cleanPrice,
                retail_price: cleanRetailPrice || '',
                discount_percentage: data.discountPercentage || '',
                images: data.images || [],
                item_specifics: data.item_specifics || {},
                variations: data.variations || [],
                seller_name: data.sellerName || '',
                seller_feedback: data.sellerFeedback || '',
                about_item: data.aboutItem || '',
                ebay_url: data.ebayUrl || ebayUrl
            });
        } catch (err) {
            const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Failed to fetch product data. Please check the URL and try again.';
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsFetching(false);
        }
    };

    const handleAiDataFetched = (data) => {
        setScrapedData(data);
    };

    const handleSaveProduct = async (formData) => {
        try {
            const productWithSource = {
                ...formData,
                source: fetchMethod === 'ai' ? 'ai' : 'ebay'
            };
            
            const response = await createProduct(productWithSource);
            
            if (response.duplicate) {
                const shouldOverwrite = window.confirm('This product (or one with identical images) already exists! Overwrite existing record?');
                if (shouldOverwrite) {
                    await createProduct({ ...productWithSource, overwrite: true });
                    navigate('/products');
                }
                return;
            }

            navigate('/products');
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save product: ' + (err.response?.data?.details || err.message));
        }
    };

    const handleMethodSwitch = (method) => {
        setFetchMethod(method);
        setScrapedData(null); // Clear previous data when switching methods
        setError('');
        setEbayUrl('');
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom duration-500 max-w-7xl mx-auto md:px-4 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Add Product</h1>
                    <p className="text-gray-400 mt-1 font-medium italic text-sm">Select import method to automate details.</p>
                </div>
            </div>

            {/* Fetch Method Selector */}
            <div className="flex p-1 bg-gray-100 rounded-2xl w-full sm:w-fit">
                <button
                    onClick={() => handleMethodSwitch('ebay')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all transition-duration-300 ${
                        fetchMethod === 'ebay' 
                            ? 'bg-white text-[#4F46E5] shadow-sm ring-1 ring-black/5' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <LinkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    eBay Link
                </button>
                <button
                    onClick={() => handleMethodSwitch('ai')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all transition-duration-300 ${
                        fetchMethod === 'ai' 
                            ? 'bg-white text-[#4F46E5] shadow-sm ring-1 ring-black/5' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    AI Fetch
                </button>
            </div>

            {/* eBay Import Tool - Conditional */}
            {fetchMethod === 'ebay' && (
                <div className="card border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-4 md:p-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                className="form-input pl-12 py-4 bg-white shadow-sm"
                                placeholder="Paste eBay Product URL here..."
                                value={ebayUrl}
                                onChange={(e) => setEbayUrl(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleFetchEbay}
                            disabled={isFetching}
                            className="btn-primary shrink-0 justify-center h-[54px]"
                        >
                            {isFetching ? 'Fetching...' : (
                                <>
                                    <Sparkles className="w-5 h-5 shrink-0" />
                                    Import from eBay
                                </>
                            )}
                        </button>
                    </div>
                    {error && (
                        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                        <span className="w-1.5 h-1.5 bg-[#4F46E5] rounded-full"></span>
                        Example: https://www.ebay.com/itm/354838957999
                    </div>
                </div>
            )}

            {/* AI Fetching Section - Conditional */}
            {fetchMethod === 'ai' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <AiFetchSection onDataFetched={handleAiDataFetched} />
                </div>
            )}

            <ProductForm
                initialData={scrapedData}
                onSubmit={handleSaveProduct}
                isFetching={isFetching}
            />
        </div>
    );
};

export default AddProduct;
