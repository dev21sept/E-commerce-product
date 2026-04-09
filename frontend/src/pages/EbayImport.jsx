import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Link as LinkIcon, AlertCircle, RefreshCcw, Cpu, Zap, Globe, Search, PlusSquare, ArrowLeft, Loader2 } from 'lucide-react';
import ImportProductForm from '../components/ImportProductForm';
import { fetchEbayProduct, createProduct, scrapeEbayDescription, getCategoryAspects } from '../services/api';
import { Card, Button, Loader } from '../components/ui';

const EbayImport = () => {
    const navigate = useNavigate();
    const [ebayUrl, setEbayUrl] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState('');
    const [scrapedData, setScrapedData] = useState(null);

    const handleFetchEbay = async () => {
        if (!ebayUrl) return setError('Please enter an eBay product URL');
        if (!ebayUrl.includes('ebay.com')) return setError('Invalid URL. Please provide a standard eBay listing link.');

        setError('');
        setIsFetching(true);
        try {
            const data = await fetchEbayProduct(ebayUrl);
            if (data) {
                // Fetch description in parallel
                const descData = await scrapeEbayDescription(ebayUrl);
                
                // Clean up price (remove symbols, convert to number) for compatibility with advanced form
                const cleanPrice = parseFloat(data.price?.replace(/[^0-9.]/g, '') || data.selling_price || 0);
                const cleanRetailPrice = data.retailPrice ? parseFloat(data.retailPrice.replace(/[^0-9.]/g, '') || 0) : '';

                setScrapedData({
                    ...data,
                    selling_price: cleanPrice,
                    retail_price: cleanRetailPrice,
                    description: descData?.description || data.description || '',
                    ebay_url: ebayUrl,
                    item_specifics: data.item_specifics || {},
                    variations: data.variations || [],
                    officialAspects: data.officialAspects || [],
                    source: 'scraper'
                });
            }
        } catch (err) {
            setError('Failed to fetch product data. Please check the URL and try again.');
        } finally {
            setIsFetching(false);
        }
    };

    const handleSaveProduct = async (formData) => {
        try {
            await createProduct(formData);
            navigate('/products');
        } catch (err) {
            setError('Failed to save product to database');
        }
    };

    return (
        <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500 pb-20 overflow-x-hidden">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">eBay Product Import</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div> Import data directly from eBay listing link.
                    </p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4">
                    <Button variant="secondary" onClick={() => navigate('/products')} className="px-6 border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all">
                         <ArrowLeft className="w-4 h-4 mr-2" /> Back to Inventory
                    </Button>
                </motion.div>
            </div>

            {/* URL Input Section */}
            <Card className="p-10 bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden group">
                <div className="space-y-8 relative z-10">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-6 py-4 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all"
                                placeholder="Paste eBay listing URL here..."
                                value={ebayUrl}
                                onChange={(e) => setEbayUrl(e.target.value)}
                            />
                        </div>
                        <Button
                            onClick={handleFetchEbay}
                            disabled={isFetching}
                            className={`px-10 h-14 rounded-xl shadow-lg shadow-indigo-600/10 ${isFetching ? 'opacity-50' : ''}`}
                        >
                            {isFetching ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-3 animate-spin" /> Fetching...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 mr-3" /> Fetch Product Data
                                </>
                            )}
                        </Button>
                    </div>
                    
                    <AnimatePresence>
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-3 text-rose-600 text-[10px] font-bold uppercase tracking-widest bg-rose-50 p-4 rounded-xl border border-rose-100"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        Tip: Copy the URL from your browser address bar and paste it above to auto-fill the form.
                    </div>
                </div>
            </Card>

            <AnimatePresence>
                {isFetching && !scrapedData && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <LinkIcon className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <h3 className="mt-6 text-lg font-black text-slate-900 tracking-tight">Fetching Listing Data...</h3>
                        <p className="text-sm text-slate-400 font-medium italic mt-1 uppercase tracking-widest text-[9px]">Contacting eBay & extracting details</p>
                    </motion.div>
                )}

                {scrapedData && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 pt-10 border-t border-slate-200"
                    >
                        <ImportProductForm
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

export default EbayImport;
