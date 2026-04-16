import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AiProductForm from '../components/AiProductForm';
import ImportProductForm from '../components/ImportProductForm';
import ProductForm from '../components/ProductForm';
import { getProductById, updateProduct, listProduct } from '../services/api';
import { ChevronLeft, ExternalLink, Sparkles, Globe } from 'lucide-react';

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProduct = async () => {
            try {
                const data = await getProductById(id);
                setProduct(data);
            } catch (err) {
                console.error(err);
                alert('Failed to load product');
            } finally {
                setLoading(false);
            }
        };
        loadProduct();
    }, [id]);

    const handleUpdate = async (formData, isListing = false, isDraft = false) => {
        try {
            setLoading(true);
            // 1. Always sync changes to DB first
            await updateProduct(id, formData);
            
            // 2. If it's just a regular record update, go back
            if (!isListing && !isDraft) {
                navigate('/products');
                return;
            }

            // 3. If Listing or Draft, call the Marketplace API
            try {
                const action = isDraft ? "Saving Draft..." : "Publishing Listing...";
                console.log(action); 
                const res = await listProduct(id, isDraft);
                alert(`✅ Successfully ${isDraft ? 'saved as Draft' : 'Published to eBay'}: ${res.message}`);
                navigate('/products');
            } catch (err) {
                alert('Marketplace Action Failed: ' + (err.response?.data?.details || err.message));
            }
        } catch (err) {
            alert('Failed to update record in Database');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/products')}
                        className="p-2 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-all text-gray-500"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Product Record</h1>
                        <p className="text-gray-500 mt-1">Refining details for SKU: <span className="font-mono text-blue-600 font-bold">{product?.sku || 'PENDING'}</span></p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm mb-8">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-3xl ${product?.source === 'ai' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                        {product?.source === 'ai' ? <Sparkles className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">
                            {product?.source === 'ai' ? 'AI Optimized Edit' : 'Marketplace Data Sync'}
                        </h2>
                        <p className="text-sm text-slate-400 font-medium">Using {product?.source === 'ai' ? 'AI Vision Form' : 'eBay Scraper Form'}</p>
                    </div>
                </div>
            </div>

            {product?.source === 'ai' ? (
                <AiProductForm
                    initialData={product}
                    onSubmit={handleUpdate}
                />
            ) : product?.source === 'scraped' || product?.source === 'ebay' ? (
                <ImportProductForm
                    initialData={product}
                    onSubmit={handleUpdate}
                />
            ) : (
                <ProductForm
                    initialData={product}
                    onSubmit={handleUpdate}
                />
            )}
        </div>
    );
};

export default EditProduct;
