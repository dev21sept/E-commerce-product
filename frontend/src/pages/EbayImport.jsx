import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Link as LinkIcon, AlertCircle, RefreshCcw, Cpu, Zap, Globe, Search, PlusSquare, ArrowLeft, Loader2 } from 'lucide-react';
import ImportProductForm from '../components/ImportProductForm';
import { fetchEbayProduct, createProduct, listProduct, scrapeEbayDescription } from '../services/api';
import { Card, Button } from '../components/ui';

import { useToast } from '../components/Toast';

const EbayImport = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [ebayUrl, setEbayUrl] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState('');
    const [scrapedData, setScrapedData] = useState(null);

    const handleFetchEbay = async () => {
        if (!ebayUrl) return setError('Please enter an eBay product URL');
        if (!ebayUrl.includes('ebay.com')) return setError('Invalid URL. Please provide a standard eBay listing link.');

        setError('');
        setIsFetching(true);
        setScrapedData(null);

        try {
            const data = await fetchEbayProduct(ebayUrl);
            if (data) {
                // Fetch description in parallel
                const descData = await scrapeEbayDescription(ebayUrl);
                
                const cleanPrice = parseFloat(data.price?.replace(/[^0-9.]/g, '') || data.selling_price || 0);

                // --- SMART CONDITION MAPPING ---
                let matchedCondition = 'New';
                if (data.condition_name) {
                    const scraped = data.condition_name.toLowerCase();
                    if (scraped.includes('new')) matchedCondition = 'New';
                    else if (scraped.includes('excellent') || scraped.includes('like new')) matchedCondition = 'Used - Like New';
                    else if (scraped.includes('very good')) matchedCondition = 'Used - Very Good';
                    else if (scraped.includes('good')) matchedCondition = 'Used - Good';
                    else if (scraped.includes('pre-owned') || scraped.includes('used')) matchedCondition = 'Used - Good';
                }

                setScrapedData({
                    ...data,
                    selling_price: cleanPrice,
                    condition_name: matchedCondition,
                    condition_notes: data.condition_notes || data.seller_notes || data.conditionDescription || '',
                    description: descData?.description || data.description || '',
                    ebay_url: ebayUrl,
                    source: 'scraper'
                });
            }
        } catch (err) {
            console.error(err);
            setError('Failed to fetch product data. Please check the URL.');
        } finally {
            setIsFetching(false);
        }
    };

    const handleSaveProduct = async (formData, isDirectList = false, isDraft = false) => {
        try {
            setIsFetching(true);
            const response = await createProduct(formData);
            const targetId = response.productId || response.id;

            if (isDirectList || isDraft) {
                const listRes = await listProduct(targetId, isDraft);
                addToast(`${listRes.message}${listRes.listingId ? ' (ID: ' + listRes.listingId + ')' : ''}`, 'success');
            } 
            
            // Stay on page and clear data for next scan
            setScrapedData(null); 
            setEbayUrl('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            addToast("Product imported successfully!", 'success');
        } catch (err) {
            console.error(err);
            addToast('Operation failed: ' + (err.response?.data?.details || err.message), 'error');
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500 pb-20 overflow-x-hidden max-w-7xl mx-auto px-4">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Globe className="w-8 h-8 text-emerald-600" /> eBay Direct Import
                    </h1>
                    <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Convert any eBay link into a clean database record.
                    </div>
                </motion.div>
                
                <Button variant="secondary" onClick={() => navigate('/products')} className="px-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Inventory
                </Button>
            </div>

            {/* URL Input Section */}
            <Card className="p-8 bg-emerald-50/10 border border-emerald-100 rounded-[40px] shadow-sm relative overflow-hidden group">
                <div className="space-y-6 relative z-10">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                            <input
                                type="text"
                                className="w-full bg-white border-2 border-transparent rounded-[20px] pl-14 pr-6 py-5 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm transition-all"
                                placeholder="Paste eBay listing URL here..."
                                value={ebayUrl}
                                onChange={(e) => setEbayUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFetchEbay()}
                            />
                        </div>
                        <button
                            onClick={handleFetchEbay}
                            disabled={isFetching}
                            className={`px-10 h-[64px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-3 ${isFetching ? 'opacity-50 grayscale' : ''}`}
                        >
                            {isFetching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                            {isFetching ? 'Importing...' : 'Import Now'}
                        </button>
                    </div>
                    
                    <AnimatePresence>
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-3 text-rose-600 text-[10px] font-black uppercase tracking-widest bg-rose-50 p-4 rounded-xl border border-rose-100"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Card>

            <AnimatePresence>
                {isFetching && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-24 bg-white rounded-[40px] border border-slate-100 shadow-sm"
                    >
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
                            <Globe className="w-8 h-8 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <h3 className="mt-8 text-xl font-black text-slate-900 tracking-tight">Accessing Marketplace Data...</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Connecting to eBay Servers</p>
                    </motion.div>
                )}

                {scrapedData && !isFetching && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="animate-in fade-in duration-700"
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
