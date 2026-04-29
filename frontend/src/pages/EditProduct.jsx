import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AiProductForm from '../components/AiProductForm';
import ImportProductForm from '../components/ImportProductForm';
import ProductForm from '../components/ProductForm';
import { getProductById, updateProduct, listProduct } from '../services/api';
import { useToast } from '../components/Toast';
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

    const { addToast } = useToast();
    const handleUpdate = async (formData, isListing = false, isDraft = false) => {
        try {
            setLoading(true);
            await updateProduct(id, formData);
            
            if (!isListing && !isDraft) {
                addToast('Product updated successfully', 'success');
                navigate('/products');
                return;
            }

            try {
                addToast(isDraft ? "Saving Draft..." : "Publishing Listing...", 'info');
                const res = await listProduct(id, isDraft);
                addToast(`✅ ${isDraft ? 'Saved as Draft' : 'Published to eBay'}: ${res.message}`, 'success');
                navigate('/products');
            } catch (err) {
                addToast('Marketplace Action Failed: ' + (err.response?.data?.details || err.message), 'error');
            }
        } catch (err) {
            addToast('Failed to update record in Database', 'error');
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
            <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl" />
                
                {/* Product Thumbnail */}
                <div className="w-48 h-48 rounded-[35px] bg-gray-50 border border-gray-100 p-4 shrink-0 group relative overflow-hidden">
                    {product?.images?.[0] ? (
                        <img src={product.images[0]} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt="Product" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
                             <ImageIcon className="w-8 h-8 mb-2" />
                             <span className="text-[8px] font-black uppercase tracking-widest text-center">No Image</span>
                        </div>
                    )}
                    <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg">
                        SOURCE: {product?.source?.toUpperCase() || 'DB'}
                    </div>
                </div>

                <div className="flex-1 space-y-4 text-center md:text-left z-10">
                    <div className="flex items-center justify-center md:justify-start gap-4">
                        <button
                            onClick={() => navigate('/products')}
                            className="p-2 bg-white border border-gray-200 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-gray-400 hover:text-indigo-600 shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none leading-tight max-w-2xl line-clamp-2">
                            {product?.title || 'Untitled Product'}
                        </h1>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                         <div className="px-4 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                             <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">SKU: {product?.sku || 'PENDING'}</span>
                         </div>
                         {product?.ebay_url && (
                             <a 
                                href={product.ebay_url} target="_blank" rel="noreferrer"
                                className="px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 hover:bg-emerald-100 transition-all"
                             >
                                 <ExternalLink className="w-3 h-3 text-emerald-600" />
                                 <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">View on eBay</span>
                             </a>
                         )}
                         <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                             <Globe className="w-3 h-3 text-slate-400" />
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{product?.id}</span>
                         </div>
                    </div>
                </div>
            </div>

            {product?.source === 'ai' ? (
                <AiProductForm
                    initialData={product}
                    onSubmit={handleUpdate}
                    onReset={() => navigate('/products')}
                    onUpdate={(liveData) => setProduct(prev => ({ ...prev, ...liveData }))}
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
