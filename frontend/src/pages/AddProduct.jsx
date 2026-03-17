import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Link as LinkIcon, AlertCircle } from 'lucide-react';
import ProductForm from '../components/ProductForm';
import { fetchEbayProduct, createProduct, scrapeEbayDescription } from '../services/api';

const AddProduct = () => {
    const navigate = useNavigate();
    const [ebayUrl, setEbayUrl] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState('');
    const [scrapedData, setScrapedData] = useState(null);

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

    const handleSaveProduct = async (formData) => {
        try {
            await createProduct(formData);
            navigate('/products');
        } catch (err) {
            alert('Failed to save product');
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
                    <p className="text-gray-500 mt-1">Import product data automatically from eBay.</p>
                </div>
            </div>

            {/* eBay Import Tool */}
            <div className="card border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-8">
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
                        className="btn-primary shrink-0"
                    >
                        {isFetching ? 'Fetching...' : (
                            <>
                                <Sparkles className="w-5 h-5" />
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

            <ProductForm
                initialData={scrapedData}
                onSubmit={handleSaveProduct}
                isFetching={isFetching}
            />
        </div>
    );
};

export default AddProduct;
