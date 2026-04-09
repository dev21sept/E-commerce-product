import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import AiProductForm from '../components/AiProductForm';
import AiFetchSection from '../components/AiFetchSection';
import { createProduct } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const AiFetching = () => {
    const navigate = useNavigate();
    const [isFetching, setIsFetching] = useState(false);
    const [scrapedData, setScrapedData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAiDataFetched = (data) => {
        setScrapedData(data);
        setIsAnalyzing(false);
    };

    const handleAnalyzingStart = () => {
        setIsAnalyzing(true);
        setScrapedData(null); // Clear old data when starting new analysis
    };

    const handleSaveProduct = async (formData) => {
        try {
            const productWithSource = {
                ...formData,
                source: 'ai'
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

    return (
        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom duration-500 max-w-7xl mx-auto md:px-4 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">AI Product Fetching</h1>
                    <p className="text-gray-400 mt-1 font-medium italic text-sm">Scan images and detect details automatically.</p>
                </div>
            </div>

            {/* AI Fetching Section - Exactly as it was */}
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <AiFetchSection onDataFetched={handleAiDataFetched} onAnalyzingStart={handleAnalyzingStart} />
            </div>

            <AnimatePresence>
                {isAnalyzing && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-24 bg-white rounded-[40px] border border-indigo-50 shadow-sm"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <Sparkles className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <h3 className="mt-6 text-lg font-black text-gray-900 tracking-tight">AI Vision is Analyzing...</h3>
                        <p className="text-sm text-gray-400 font-medium italic mt-1 uppercase tracking-widest text-[9px]">Detecting brand, category, specifics, and more</p>
                    </motion.div>
                )}

                {scrapedData && !isAnalyzing && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="animate-in fade-in duration-700"
                    >
                        <AiProductForm
                            initialData={scrapedData}
                            onSubmit={handleSaveProduct}
                            isFetching={isFetching}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AiFetching;
