import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react';

const AdminLogin = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        setTimeout(() => {
            if (email === 'valisting@gmail.com' && password === 'admin123') {
                onLogin({ role: 'admin', email });
            } else {
                setError('Authentication failed. Check your data.');
                setIsSubmitting(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen flex bg-white font-sans overflow-hidden">
            {/* LEFT SIDE: BRANDING (60%) */}
            <div className="hidden lg:flex lg:w-[60%] flex-col relative bg-[#F9FAFB] p-20 justify-between border-r border-gray-100">
                {/* Background Decor */}
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-50/50 rounded-full blur-[120px]" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-16">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <ShoppingBag className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight italic">VA LISTER</h1>
                    </div>

                    <div className="max-w-xl">
                        <motion.h2 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl font-black text-gray-900 leading-[1.1] mb-8"
                        >
                            Automate your eBay <br/>
                            <span className="text-indigo-600">business with AI.</span>
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg text-gray-500 font-medium leading-relaxed leading-7 mb-10"
                        >
                            VA Lister is a high-performance administrative panel designed for professional eBay sellers. 
                            From AI-driven one-click listing to advanced title architect, we simplify every step of your workflow.
                        </motion.p>

                        <div className="space-y-4">
                            {[
                                'Universal AI Product Analysis',
                                'One-Click eBay Draft Automation',
                                'Dynamic Title Sequence Builder',
                                'Secure Role-Based Access'
                            ].map((feature, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (i * 0.1) }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-50">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    </div>
                                    <span className="text-sm font-black text-gray-900 uppercase tracking-wider">{feature}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Built for Professional VAs · 2026 Edition</p>
                </div>
            </div>

            {/* RIGHT SIDE: LOGIN FORM (40%) */}
            <div className="w-full lg:w-[40%] flex flex-col items-center justify-start pt-24 lg:pt-40 px-8 lg:px-24 relative overflow-hidden bg-white overflow-y-auto">
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-14">
                        <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Admin Sign In</h2>
                        <p className="text-sm text-gray-400 font-medium tracking-tight">Enter your administrative power-key below.</p>
                    </div>

                    {/* SHADOWED LOGIN BOX WITH BORDER */}
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_32px_64px_-20px_rgba(0,0,0,0.1)] p-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] font-black text-rose-600 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-300 group-focus-within:text-indigo-600 transition-colors" />
                                    <input 
                                        type="email" 
                                        required 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 focus:border-indigo-600 focus:bg-white rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 placeholder:text-gray-300 transition-all outline-none" 
                                        placeholder="example@mail.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-300 group-focus-within:text-indigo-600 transition-colors" />
                                    <input 
                                        type="password" 
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 focus:border-indigo-600 focus:bg-white rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-900 placeholder:text-gray-300 transition-all outline-none" 
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={isSubmitting}
                                type="submit" 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-sm py-4 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all active:scale-[0.98] mt-4"
                            >
                                {isSubmitting ? 'Verifying...' : 'Authorize Access'}
                                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </form>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Authorized Personnel Only</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AdminLogin;
