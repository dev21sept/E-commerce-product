import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const Button = ({ children, isLoading, variant = 'primary', className = '', ...props }) => {
    const variants = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/10 active:bg-indigo-800',
        secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm',
        danger: 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-sm',
        outline: 'bg-transparent hover:bg-indigo-50 text-indigo-600 border border-indigo-200',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={isLoading || props.disabled}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            {...props}
        >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
        </motion.button>
    );
};

export const Card = ({ children, className = '', ...props }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden ${className}`}
        {...props}
    >
        {children}
    </motion.div>
);

export const InputField = ({ label, error, className = '', ...props }) => (
    <div className={`space-y-1.5 ${className}`}>
        {label && <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">{label}</label>}
        <input
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all ${
                error ? 'border-rose-400 ring-4 ring-rose-500/5' : ''
            }`}
            {...props}
        />
        {error && <p className="text-[10px] font-bold text-rose-500 ml-1 uppercase">{error}</p>}
    </div>
);

export const Loader = () => (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-100 rounded-full"></div>
            <div className="w-12 h-12 border-4 border-t-indigo-600 rounded-full animate-spin absolute top-0"></div>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Content...</p>
    </div>
);

export const Toast = ({ message, type = 'success', onClose }) => (
    <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl z-[100] border ${
            type === 'success' ? 'bg-white text-slate-800 border-emerald-100' : 'bg-white text-rose-600 border-rose-100'
        }`}
    >
        <div className={`p-2 rounded-xl scale-95 ${type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>
        <span className="text-sm font-bold text-slate-700 mr-2">{message}</span>
        <button onClick={onClose} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
        </button>
    </motion.div>
);
