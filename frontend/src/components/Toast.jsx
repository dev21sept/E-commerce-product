import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Save, Zap, FileText, RotateCcw } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmData, setConfirmData] = useState(null);

    const addToast = (message, type = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    // Override Global Alert
    useEffect(() => {
        window.alert = (msg) => {
            if (!msg) return;
            const isError = /error|failed|invalid|wrong/i.test(msg);
            addToast(msg, isError ? 'error' : 'success');
        };
    }, []);

    const showConfirm = (message) => {
        return new Promise((resolve) => {
            setConfirmData({ message, resolve });
        });
    };

    const handleConfirmResponse = (value) => {
        if (confirmData) {
            confirmData.resolve(value);
            setConfirmData(null);
        }
    };

    return (
        <ToastContext.Provider value={{ addToast, showConfirm }}>
            {children}
            
            {/* TOAST CONTAINER (BOTTOM RIGHT) */}
            <div className="fixed bottom-8 right-8 z-[10000] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence mode="multiple">
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={{ opacity: 0, y: 50, scale: 0.3 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                            className={`pointer-events-auto min-w-[350px] max-w-[450px] p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-between gap-4 backdrop-blur-3xl border transition-all ${
                                toast.type === 'error' 
                                    ? 'bg-rose-500 text-white border-white/20' 
                                    : 'bg-indigo-600/95 text-white border-white/20'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-2.5 rounded-2xl">
                                    {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 text-white" /> : <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />}
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-[0.15em] leading-relaxed drop-shadow-sm">{toast.message}</p>
                            </div>
                            <button onClick={() => removeToast(toast.id)} className="p-2.5 hover:bg-white/20 rounded-full transition-colors flex-shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* PREMIUM SIDEBOARD CONFIRM (WINDOWS STYLE) */}
            <AnimatePresence>
                {confirmData && (
                    <>
                        {/* Subtle Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => handleConfirmResponse(false)}
                            className="fixed inset-0 z-[11000] bg-black/5 backdrop-blur-[2px]"
                        />

            {/* COMPACT CORNER CONFIRM (WINDOWS NOTIFICATION STYLE) */}
            <AnimatePresence>
                {confirmData && (
                    <motion.div
                        initial={{ x: '120%', opacity: 0 }} 
                        animate={{ x: 0, opacity: 1 }} 
                        exit={{ x: '120%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                        className="fixed bottom-8 right-8 w-96 z-[12000] bg-white rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] border border-gray-100 overflow-hidden"
                    >
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Confirm?</h3>
                            </div>

                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-loose mb-8 italic">
                                {confirmData.message}
                            </p>
                            
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleConfirmResponse(true)}
                                    className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                                >
                                    Confirm
                                </button>
                                <button
                                    onClick={() => handleConfirmResponse(false)}
                                    className="px-6 py-3.5 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                                >
                                    No
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
                    </>
                )}
            </AnimatePresence>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
