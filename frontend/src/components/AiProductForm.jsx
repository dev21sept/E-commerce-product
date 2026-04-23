import React, { useState, useEffect, useRef } from 'react';
import { Package, Image as ImageIcon, Plus, X, Loader2, Sparkles, AlertCircle, ChevronDown, User, ExternalLink, Tag, Upload, Search, Check, TrendingUp, FileText, Save, Layers, Zap, ChevronLeft, ChevronRight, MapPin, Truck, CreditCard, RotateCcw } from 'lucide-react';
import { EBAY_CONDITIONS } from '../constants/ebayConditions';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { searchCategories, analyzeProduct, getCategoryAspects, getEbayPolicies, getEbayLocations } from '../services/api';
import { useToast } from './Toast';
import { Reorder } from 'framer-motion';

const EBAY_CONDITION_NOTES = [
    "Pre-owned In Excellent Condition.",
    "Pre-owned In Good Condition.",
    "Pre-owned In Good Condition. Please See Pictures.",
    "Brand New With Tags.",
    "Brand New Without Tags."
];

// --- SHARED SEARCHABLE DROPDOWN COMPONENT ---
const SearchableDropdown = ({ options = [], value, onSelect, placeholder = 'Select...' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = (options || []).filter(opt => {
        const label = typeof opt === 'object' ? opt.label : opt;
        return label?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-11 px-4 bg-gray-50 border-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'border-indigo-600 bg-white ring-4 ring-indigo-50' : 'border-transparent hover:border-indigo-100 hover:bg-white'}`}
            >
                <div className="flex-1 truncate">
                    <span className={`text-xs font-bold ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                        {value || placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[5000] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3 bg-gray-50 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    autoFocus type="text" placeholder="Search..." value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-600 shadow-inner"
                                />
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-200">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt, i) => {
                                    const label = typeof opt === 'object' ? opt.label : opt;
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => { onSelect(opt); setIsOpen(false); setSearchTerm(''); }}
                                            className={`px-4 py-3 text-[13px] border-b border-gray-50 last:border-0 hover:bg-indigo-600 hover:text-white cursor-pointer flex items-center justify-between font-medium transition-colors ${value === label ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span>{label}</span>
                                                {opt.description && <span className={`text-[9px] ${value === label ? 'text-indigo-200' : 'text-gray-400'}`}>{opt.description}</span>}
                                            </div>
                                            {String(value) === String(label) && <Check className="w-4 h-4 text-current" />}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="px-4 py-6 text-center text-[10px] font-bold text-gray-400 italic">No matches found</div>
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SearchableCondition = ({ value, onChange }) => (
    <SearchableDropdown
        value={value}
        onSelect={(val) => onChange(val)}
        placeholder="Search condition..."
        options={EBAY_CONDITIONS}
    />
);

// --- PREVIEW SIDEBAR COMPONENT ---
const ListingSidebarPreview = React.memo(({ formData }) => {
    const mainImage = formData.images?.[0];

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden sticky top-8 animate-in slide-in-from-right duration-500 will-change-transform">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Real-time Preview</span>
                {formData.sku && <span className="bg-indigo-600 text-[9px] font-black text-white px-2 py-1 rounded-md">SKU: {formData.sku}</span>}
            </div>

            <div className="p-6 space-y-6">
                {/* Visuals */}
                <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 group relative">
                    {mainImage ? (
                        <img
                            src={mainImage}
                            loading="lazy"
                            decoding="async"
                            style={{ contentVisibility: 'auto' }}
                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
                            <ImageIcon className="w-12 h-12 mb-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest">No Image Detected</span>
                        </div>
                    )}
                    {formData.images?.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white">
                            +{formData.images.length - 1} PHOTOS
                        </div>
                    )}
                </div>

                {/* Listing Details */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-gray-900 leading-snug line-clamp-3">
                        {formData.title || "Waiting for meaningful title..."}
                    </h2>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Price</span>
                            <span className="text-2xl font-black text-indigo-600">${formData.selling_price || '0.00'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Condition</span>
                            <span className="text-xs font-bold text-gray-700">
                                {(() => {
                                    const raw = formData.condition_name;
                                    if (!raw) return 'Select One';
                                    return typeof raw === 'object' ? (raw.label || raw.name || 'Custom') : raw;
                                })()}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-gray-50">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-gray-400 uppercase tracking-tight">Category:</span>
                            <span className="text-indigo-500 truncate max-w-[200px]">
                                {typeof formData.category === 'object' ? (formData.category.fullName || formData.category.name) : (formData.category || 'N/A')}
                            </span>
                        </div>
                        {formData.fulfillment_policy && (
                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 italic">
                                <Truck className="w-3 h-3" /> {formData.fulfillment_policy.name}
                            </div>
                        )}
                        {formData.payment_policy && (
                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 italic">
                                <CreditCard className="w-3 h-3" /> {formData.payment_policy.name}
                            </div>
                        )}
                        {formData.inventory_location && (
                            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 italic">
                                <MapPin className="w-3 h-3" /> {formData.inventory_location.name}
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100/50">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block mb-2">Description Snippet</span>
                            <p className="text-[11px] text-gray-600 line-clamp-4 leading-relaxed font-medium italic">
                                {formData.description?.replace(/<[^>]*>?/gm, '') || "AI will generate description once image is analyzed..."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- SEARCHABLE SELECT FOR ASPECTS ---
const SearchableSelect = ({ label, value, options = [], onChange, metrics }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = (options || []).filter(opt => String(opt).toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="flex items-center justify-between py-5 border-b border-gray-100 group relative bg-white" ref={wrapperRef}>
            <div className="w-[35%] flex flex-col group">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-indigo-700 uppercase tracking-tight">
                        {label}
                    </span>
                    {metrics && <span className="text-[11px] text-indigo-400/60 font-medium whitespace-nowrap italic">{metrics}</span>}
                </div>
            </div>
            <div className="w-[63%] relative">
                <div onClick={() => setIsOpen(!isOpen)} className={`w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent hover:border-indigo-400 flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'bg-white ring-2 ring-indigo-100 border-indigo-600 shadow-sm' : ''}`}>
                    <span className={`text-[13px] ${value ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                        {typeof value === 'object' ? (value.label || value.name || JSON.stringify(value)) : (value || 'Select or type...')}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                </div>
                <AnimatePresence>
                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-2xl shadow-2xl z-[1000] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-3 bg-gray-50 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        autoFocus type="text" placeholder="Search or type..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && searchTerm.trim()) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onChange(searchTerm);
                                                setIsOpen(false);
                                                setSearchTerm('');
                                            }
                                        }}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-indigo-600 shadow-inner"
                                    />
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-200">
                                {filteredOptions.map((opt, i) => (
                                    <div key={i} onClick={() => { onChange(opt); setIsOpen(false); setSearchTerm(''); }} className="px-4 py-3 text-[13px] text-gray-700 hover:bg-indigo-600 hover:text-white cursor-pointer flex items-center justify-between font-medium">
                                        {opt}
                                        {String(value) === String(opt) && <Check className="w-4 h-4 text-current" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};


const ConditionNotesSection = ({ value = "", onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const wrapperRef = useRef(null);

    const ALL_NOTES = [...EBAY_CONDITION_NOTES, "Add Custom description..."];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (note) => {
        if (note === "Add Custom description...") {
            setShowCustom(true);
            onChange("");
        } else {
            setShowCustom(false);
            onChange(note);
        }
        setIsOpen(false);
    };

    return (
        <div className="space-y-2 relative" ref={wrapperRef}>
            <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Condition Notes</label>

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 bg-white border flex items-center justify-between cursor-pointer transition-all rounded-xl ${isOpen ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
                <span className={`text-xs font-bold truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                    {showCustom ? "Custom Note Active" : (value || 'Select Note...')}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[3000] overflow-hidden">
                        {ALL_NOTES.map((note, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleSelect(note)}
                                className={`px-4 py-3 text-xs font-bold hover:bg-indigo-600 hover:text-white cursor-pointer transition-all border-b border-gray-50 last:border-0 ${value === note ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'} ${note.includes('Custom') ? 'bg-amber-50 text-amber-600' : ''}`}
                            >
                                {note}
                            </div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {showCustom && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                    <textarea
                        autoFocus
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-indigo-600 focus:bg-white rounded-2xl text-xs font-bold outline-none transition-all placeholder:text-gray-300"
                        rows={3}
                        placeholder="Type high-quality condition details..."
                    />
                </motion.div>
            )}
        </div>
    );
};

const AiProductForm = ({ initialData, onSubmit, isFetching, onReset }) => {

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        categoryId: '',
        brand: '',
        condition_name: '',
        sku: '',
        retail_price: '',
        selling_price: '0.00',
        images: [],
        item_specifics: {},
        officialAspects: [],
        fulfillment_policy: null,
        payment_policy: null,
        return_policy: null,
        inventory_location: null,
        source: 'ai',
        title_parts: {},
        structure: initialData?.structure || ['Brand', 'Product Type', 'Model / Series', 'Material', 'Key Features', 'Size'],
        title_sequence: ['Brand', 'Product Type', 'Model / Series', 'Material', 'Key Features', 'Size', 'Color', 'Style / Use Case', 'Gender / Department'],
        lastAutoTitle: ''
    });

    const [categoryConditions, setCategoryConditions] = useState(EBAY_CONDITIONS);
    const [isConditionsLoading, setIsConditionsLoading] = useState(false);
    const [isArchitectOpen, setIsArchitectOpen] = useState(false);
    const [editingPart, setEditingPart] = useState(null); // Track which part is being edited inline
    const descriptionRef = useRef(null);
    const architectRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (architectRef.current && !architectRef.current.contains(e.target)) {
                setIsArchitectOpen(false);
            }
        };
        if (isArchitectOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isArchitectOpen]);

    const [policies, setPolicies] = useState({ fulfillment: [], payment: [], returns: [] });
    const [locations, setLocations] = useState([]);
    const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
    const [aspectsLoading, setAspectsLoading] = useState(false);
    const [isMagicLoading, setIsMagicLoading] = useState(false);
    const [authStatus, setAuthStatus] = useState(null);

    useEffect(() => {
        const fetchEbaySettings = async () => {
            setIsLoadingPolicies(true);
            try {
                const [policiesData, locationsData] = await Promise.all([
                    getEbayPolicies(),
                    getEbayLocations()
                ]);
                
                // Mapping eBay policy objects to label/value for SearchableDropdown
                const mapPolicy = (arr = [], type) => arr.map(p => ({
                    label: p.name,
                    value: p, // Store full object
                    description: p.description || `${type} policy`
                }));

                setPolicies({
                    fulfillment: mapPolicy(policiesData.fulfillment || [], 'Shipping'),
                    payment: mapPolicy(policiesData.payment || [], 'Payment'),
                    returns: mapPolicy(policiesData.returns || [], 'Return')
                });
                setLocations((locationsData || []).map(l => ({
                    label: l.name,
                    value: l,
                    description: `${l.address?.city}, ${l.address?.stateOrProvince}`
                })));
                setAuthStatus('Connected');
            } catch (err) {
                console.error("Error loading account settings:", err);
                if (err.response?.status === 401) {
                    setAuthStatus('Unauthorized');
                }
            } finally {
                setIsLoadingPolicies(false);
            }
        };
        fetchEbaySettings();
    }, []);

    useEffect(() => {
        if (formData.categoryId) {
            // fetchCategoryConditions(formData.categoryId); // DISABLED: Using static conditions as requested

            // Also fetch official aspects for this category if not already loading
            const loadAspects = async () => {
                setAspectsLoading(true);
                try {
                    const aspects = await getCategoryAspects(formData.categoryId);
                    setFormData(prev => ({ ...prev, officialAspects: aspects || [] }));
                } catch (e) {
                    console.error('Aspect fetch fail:', e);
                } finally {
                    setAspectsLoading(false);
                }
            };
            loadAspects();
        }
    }, [formData.categoryId]);

    useEffect(() => {
        if (initialData) {
            // Map initial data to our preferred architect keys with item_specifics fallback
            const specs = typeof initialData.item_specifics === 'string' ? JSON.parse(initialData.item_specifics) : (initialData.item_specifics || {});
            const getVal = (key, aliases = []) => {
                if (initialData[key.toLowerCase()]) return initialData[key.toLowerCase()];
                const found = [key, ...aliases].find(alt => specs[alt] || specs[alt.toLowerCase()] || specs[alt.charAt(0).toUpperCase() + alt.slice(1).toLowerCase()]);
                return found ? (specs[found] || specs[found.toLowerCase()] || specs[found.charAt(0).toUpperCase() + found.slice(1).toLowerCase()]) : '';
            };

            const parts = {
                'Brand': initialData.brand || getVal('Brand', ['brand']),
                'Product Type': initialData.product_type || initialData.category_name || getVal('Type', ['Product Type', 'Category', 'category']),
                'Model / Series': initialData.model || getVal('Model', ['Model/Series', 'Series']),
                'Size': initialData.size || getVal('Size', ['Size Type', 'Size (Men\'s)', 'Size (Women\'s)']),
                'Color': initialData.color || getVal('Color', ['Main Color', 'Colour']),
                'Material': initialData.material || getVal('Material', ['Fabric Type', 'Content']),
                'Style / Use Case': initialData.style || getVal('Style', ['Occasion', 'Use Case']),
                'Gender / Department': initialData.gender || getVal('Department', ['Gender', 'Sex'])
            };

            setFormData(prev => {
                const isSameProduct = prev.id === initialData.id || prev._id === initialData._id;

                // Critical: Stable SKU logic
                let finalSku = initialData.sku || prev.sku;
                if (!finalSku) {
                    // Only generate once if completely missing
                    finalSku = 'VX' + Math.random().toString(36).substring(2, 6).toUpperCase();
                }

                return {
                    ...prev,
                    ...initialData,
                    title_parts: parts,
                    selling_price: initialData.selling_price || '0.00',
                    sku: finalSku,
                    item_specifics: typeof initialData.item_specifics === 'string' ? JSON.parse(initialData.item_specifics) : initialData.item_specifics || {},
                };
            });
        }
    }, [initialData]);

    // Live Title Construction (CONTROLLED BY STRUCTURE)
    useEffect(() => {
        const activeParts = (formData.structure || [])
            .map(key => {
                const foundKey = Object.keys(formData.title_parts || {}).find(k =>
                    k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, '')
                );
                return foundKey ? formData.title_parts[foundKey] : null;
            })
            .filter(val => val && val.trim() !== '' && val !== 'null' && val !== 'undefined');

        const newTitle = activeParts.join(' ').substring(0, 80);

        if (newTitle && newTitle !== formData.title) {
            setFormData(prev => ({ ...prev, title: newTitle, lastAutoTitle: newTitle }));
        }
    }, [formData.title_parts, formData.structure]);

    const fetchCategoryConditions = async (cid) => {
        if (!cid) return;
        setIsConditionsLoading(true);
        try {
            const data = await getCategoryConditions(cid);
            const fetched = data?.conditions || data || [];

            if (fetched.length > 0) {
                setCategoryConditions(fetched.map(c => ({
                    label: c.condition_name || c.label || c.conditionDisplayName,
                    value: c.condition_name || c.label || c.conditionDisplayName
                })));
            } else {
                setCategoryConditions([]);
            }
        } catch (e) {
            console.error('Failed to fetch category conditions:', e);
            setCategoryConditions([]);
        } finally {
            setIsConditionsLoading(false);
        }
    };

    const handleChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };
    const handleMagicAnalyze = async () => {
        if (!formData.images || formData.images.length === 0) return;
        setIsMagicLoading(true);
        try {
            const result = await analyzeProduct({
                images: formData.images,
                platform: formData.target_platform || 'ebay',
                structure: ['Brand', 'Product Type', 'Model / Series', 'Size', 'Color', 'Material', 'Style / Use Case', 'Key Features', 'Gender / Department']
            });
            if (result.success) {
                // Map AI result to our preferred architect keys with aliases
                const ai = result.data.title_parts || {};
                const resData = result.data || {};
                const getAiVal = (key, aliases = []) => {
                    const found = [key, ...aliases].find(alt => 
                        ai[alt] || ai[alt.toLowerCase()] || ai[alt.toUpperCase()] || 
                        resData[alt.toLowerCase()] || resData[alt]
                    );
                    return found ? (ai[found] || ai[found.toLowerCase()] || ai[found.toUpperCase()] || resData[found.toLowerCase()] || resData[found]) : '';
                };

                const mappedParts = {
                    'Brand': getAiVal('Brand', ['brand']),
                    'Product Type': getAiVal('Product Type', ['product_type', 'Type', 'category_name']),
                    'Model / Series': getAiVal('Model', ['model', 'Model / Series']),
                    'Size': getAiVal('Size', ['size']),
                    'Color': getAiVal('Color', ['color', 'Main Color']),
                    'Material': getAiVal('Material', ['material', 'Fabric Type']),
                    'Style / Use Case': getAiVal('Style', ['style', 'Occasion']),
                    'Gender / Department': getAiVal('Department', ['gender', 'Gender', 'department'])
                };

                // AUTO-ARCHITECT: Enable all parts that have values
                const foundParts = Object.keys(mappedParts).filter(k => mappedParts[k] && mappedParts[k].trim() !== '' && mappedParts[k] !== 'null');
                const currentStructure = formData.structure || [];
                const newStructure = [...new Set([...currentStructure, ...foundParts])];
                
                // Maintain a clean title_sequence order for the UI
                const currentSequence = formData.title_sequence || [];
                const newSequence = [...new Set([...currentSequence, ...Object.keys(mappedParts)])];

                setFormData(prev => ({
                    ...prev,
                    ...result.data,
                    sku: prev.sku || result.data.sku,
                    title: result.data.title || prev.title,
                    title_parts: { ...prev.title_parts, ...mappedParts },
                    structure: newStructure,
                    title_sequence: newSequence
                }));
            }
        } catch (error) {
            console.error('Magic re-analysis failed:', error);
        } finally {
            setIsMagicLoading(false);
        }
    };

    const handleCategoryChange = async (cat) => {
        setFormData(prev => ({ ...prev, category: cat.fullName || cat.name, categoryId: cat.id }));
        setAspectsLoading(true);
        try {
            // fetchCategoryConditions(cat.id); // DISABLED: Using static conditions as requested
            const aspects = await getCategoryAspects(cat.id);
            setFormData(prev => ({ ...prev, officialAspects: aspects || [] }));
        } catch (e) { console.error('Aspect fetch fail:', e); }
        finally { setAspectsLoading(false); }
    };

    const removeVariationValue = (vIdx, valIdx) => {
        const newVars = [...formData.variations || []];
        if (!newVars[vIdx]) return;
        newVars[vIdx].values = newVars[vIdx].values.filter((_, i) => i !== valIdx);
        setFormData(p => ({ ...p, variations: newVars }));
    };

    const addVariationValue = (vIdx) => {
        const val = prompt("Enter new value for " + formData.variations[vIdx].name);
        if (val) {
            const newVars = [...formData.variations || []];
            newVars[vIdx].values.push(val);
            setFormData(p => ({ ...p, variations: newVars }));
        }
    };

    const handlePreSubmit = (e, isListing = false, isDraft = false) => {
        if (e) e.preventDefault();
        const finalDescription = descriptionRef.current ? descriptionRef.current.innerHTML : formData.description;
        onSubmit({ ...formData, description: finalDescription }, isListing, isDraft);
    };

    const { showConfirm } = useToast();

    return (
        <form onSubmit={(e) => handlePreSubmit(e, false)} className="max-w-[1400px] mx-auto pb-20 mt-8">
            <div className="space-y-8">
                <div className="space-y-8">

                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Step 1: Listing Information</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Basic details for your eBay store</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
                                    {['ebay', 'poshmark', 'vinted'].map(p => (
                                        <button
                                            key={p} type="button" onClick={() => setFormData(f => ({ ...f, target_platform: p }))}
                                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${formData.target_platform === p ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                                <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 text-indigo-600 font-black text-[10px] tracking-widest uppercase">
                                    AI SCORE: 98%
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 relative">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Product Title</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsArchitectOpen(!isArchitectOpen)}
                                            className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${isArchitectOpen ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}
                                        >
                                            <Layers className="w-3 h-3" /> Architect Sequence
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {isArchitectOpen && (
                                            <motion.div
                                                ref={architectRef}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute top-full left-0 right-0 mt-4 bg-white border border-gray-100 rounded-[35px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] p-6 z-[6000]"
                                            >
                                                <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
                                                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Title Sequence Builder</h4>
                                                </div>

                                                <div className="space-y-4">
                                                    <Reorder.Group 
                                                        axis="y" 
                                                        values={formData.title_sequence} 
                                                        onReorder={(newFullOrder) => {
                                                            // Calculate new structure: Everything that was in the old structure stays active,
                                                            // but their order is defined by the new drag position.
                                                            // We detect which items are "above the line".
                                                            // For simplicity: users drag to reorder. The first N items (matching old structure count) are the active ones?
                                                            // Actually, let's keep it simple: the user rearranges the whole list.
                                                            // We define a divider. Let's say top 5 are active initially.
                                                            setFormData(p => {
                                                                const activeCount = p.structure.length;
                                                                const newActive = newFullOrder.slice(0, activeCount);
                                                                return { ...p, title_sequence: newFullOrder, structure: newActive };
                                                            });
                                                        }} 
                                                        className="space-y-2"
                                                    >
                                                        {formData.title_sequence.map((partKey, idx) => {
                                                            const isActive = formData.structure.includes(partKey);
                                                            const getPartVal = (key) => {
                                                                const foundKey = Object.keys(formData.title_parts || {}).find(k =>
                                                                    k.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, '')
                                                                );
                                                                return foundKey ? formData.title_parts[foundKey] : null;
                                                            };
                                                            const partValue = getPartVal(partKey);

                                                            return (
                                                                <React.Fragment key={partKey}>
                                                                    {idx === formData.structure.length && (
                                                                        <div className="py-4 flex items-center gap-4 group/divider">
                                                                            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent group-hover/divider:via-indigo-300 transition-all" />
                                                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] whitespace-nowrap bg-white px-3 py-1 rounded-full border border-gray-50 group-hover/divider:text-indigo-400 group-hover/divider:border-indigo-100 transition-all">Available Pool</span>
                                                                            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent group-hover/divider:via-indigo-300 transition-all" />
                                                                        </div>
                                                                    )}
                                                                <Reorder.Item
                                                                    key={partKey}
                                                                    value={partKey}
                                                                    className={`group flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border-2 transition-all cursor-grab active:cursor-grabbing ${isActive ? 'border-indigo-100 bg-white ring-4 ring-indigo-50/30 shadow-sm' : 'opacity-40 grayscale border-dashed border-gray-100 hover:opacity-60'}`}
                                                                >
                                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-0.5">{partKey}</div>
                                                                        {editingPart === partKey ? (
                                                                            <input
                                                                                autoFocus
                                                                                type="text"
                                                                                className="w-full bg-white border-b-2 border-indigo-600 text-[13px] font-black text-gray-900 outline-none pb-0.5"
                                                                                value={partValue || ''}
                                                                                onChange={(e) => setFormData(p => ({
                                                                                    ...p,
                                                                                    title_parts: { ...p.title_parts, [partKey]: e.target.value }
                                                                                }))}
                                                                                onBlur={() => setEditingPart(null)}
                                                                                onKeyDown={(e) => e.key === 'Enter' && setEditingPart(null)}
                                                                            />
                                                                        ) : (
                                                                            <div
                                                                                onClick={() => setEditingPart(partKey)}
                                                                                className={`text-[13px] font-black truncate cursor-text ${partValue ? 'text-gray-900' : 'text-gray-300 italic'}`}
                                                                            >
                                                                                {partValue || 'Empty'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {isActive ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setFormData(p => {
                                                                                        const newStructure = p.structure.filter(k => k !== partKey);
                                                                                        const newSequence = p.title_sequence.filter(k => k !== partKey).concat(partKey);
                                                                                        return { ...p, structure: newStructure, title_sequence: newSequence };
                                                                                    });
                                                                                }}
                                                                                className="p-1 hover:bg-rose-100 rounded-md text-rose-600 opacity-0 group-hover:opacity-100 transition-all font-bold"
                                                                            >
                                                                                <X className="w-3 h-3" />
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setFormData(p => {
                                                                                        const newStructure = [...p.structure, partKey];
                                                                                        const poolItems = p.title_sequence.filter(k => !newStructure.includes(k));
                                                                                        return { ...p, structure: newStructure, title_sequence: [...newStructure, ...poolItems] };
                                                                                    });
                                                                                }}
                                                                                className="p-1 hover:bg-indigo-100 rounded-md text-indigo-700 transition-all font-bold"
                                                                            >
                                                                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                                                            </button>
                                                                        )}
                                                                        {isActive && partValue && (
                                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                                                                        )}
                                                                    </div>
                                                                </Reorder.Item>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </Reorder.Group>
                                                </div>

                                                <div className="mt-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30">
                                                    <p className="text-[10px] text-gray-500 font-medium italic leading-relaxed">
                                                        <b>Pro Tip:</b> AI has detected these details from high-res images. Reorder them to optimize SEO and Click-Through Rate.
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="relative group">
                                        <input
                                            type="text" name="title" value={formData.title} onChange={handleChange}
                                            className="w-full h-14 px-5 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[20px] text-sm font-black transition-all outline-none shadow-sm hover:shadow-md"
                                            placeholder="e.g. Nike Vintage Polo Shirt"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-300 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-gray-50 shadow-sm pointer-events-none group-focus-within:opacity-0 transition-opacity">
                                            {formData.title?.length || 0} / 80
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category Lookup</label>
                                    <SearchableCategory
                                        value={formData.category}
                                        onChange={handleCategoryChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Custom Label (SKU)</label>
                                    <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="text-lg font-bold text-indigo-900 bg-transparent border-b border-indigo-50 outline-none w-full py-2 hover:border-indigo-300 focus:border-indigo-600 transition-all placeholder:text-indigo-200" placeholder="SKU..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Brand</label>
                                    <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="text-lg font-bold text-indigo-900 bg-transparent border-b border-indigo-50 outline-none w-full py-2 hover:border-indigo-300 focus:border-indigo-600 transition-all placeholder:text-indigo-200" placeholder="Brand..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block font-mono">Condition</label>
                                    <SearchableCondition
                                        value={formData.condition_name}
                                        onChange={(selected) => {
                                            if (typeof selected === 'object') {
                                                setFormData(p => ({ ...p, condition_name: selected.label, condition_id: selected.id }));
                                            } else {
                                                setFormData(p => ({ ...p, condition_name: selected }));
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Listing Price</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-lg">$</span>
                                        <input
                                            type="number" name="selling_price" value={formData.selling_price} onChange={handleChange}
                                            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-transparent focus:border-indigo-600 focus:bg-white rounded-xl text-lg font-black text-gray-900 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Custom SKU</label>
                                    <input
                                        type="text" name="sku" value={formData.sku} onChange={handleChange}
                                        className="w-full h-11 px-4 bg-gray-50 border border-transparent focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-black uppercase transition-all outline-none font-mono"
                                        placeholder="FKVD..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Quantity</label>
                                    <input
                                        type="number" name="quantity" value={formData.quantity || 1} onChange={handleChange}
                                        className="w-full h-11 px-4 bg-gray-50 border border-transparent focus:border-indigo-600 focus:bg-white rounded-xl text-sm font-bold transition-all outline-none"
                                    />
                                </div>
                                {/* CONDITION NOTES IF NOT NEW */}
                                <AnimatePresence>
                                    {(() => {
                                        const cName = (formData.condition_name || '').toString();

                                        if (cName && !cName.toLowerCase().includes('new')) {
                                            return (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="col-span-full space-y-2 mt-4 border-t border-gray-100 pt-6 relative">
                                                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                        <AlertCircle className="w-3 h-3" /> Condition Details (Visible to buyers)
                                                    </label>
                                                    <ConditionNotesSection
                                                        value={formData.condition_notes}
                                                        onChange={(val) => setFormData({ ...formData, condition_notes: val })}
                                                    />
                                                </motion.div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: POLICIES & LOCATION (As per SS) */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
                        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <Truck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Step 2: Policies & Location</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">eBay account business settings</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Fulfillment Policy *</label>
                                <SearchableDropdown
                                    options={policies.fulfillment}
                                    value={formData.fulfillment_policy?.name}
                                    onSelect={(val) => setFormData({ ...formData, fulfillment_policy: val.value })}
                                    placeholder="Search Policy..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Payment Policy *</label>
                                <SearchableDropdown
                                    options={policies.payment}
                                    value={formData.payment_policy?.name}
                                    onSelect={(val) => setFormData({ ...formData, payment_policy: val.value })}
                                    placeholder="Search Policy..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Return Policy *</label>
                                <SearchableDropdown
                                    options={policies.returns}
                                    value={formData.return_policy?.name}
                                    onSelect={(val) => setFormData({ ...formData, return_policy: val.value })}
                                    placeholder="Search Policy..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Inventory Location *</label>
                                <SearchableDropdown
                                    options={locations}
                                    value={formData.inventory_location?.name}
                                    onSelect={(val) => setFormData({ ...formData, inventory_location: val.value })}
                                    placeholder="Select Location..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: ITEM SPECIFICS */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
                        <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Step 3: Item Specifics</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">AI Detected & Required aspects</p>
                            </div>
                        </div>

                        <div className="bg-gray-50/50 rounded-3xl p-6 divide-y divide-gray-100">
                            {formData.officialAspects?.length > 0 ? formData.officialAspects.map((aspect) => {
                                const matchedKey = Object.keys(formData.item_specifics).find(k => k.toLowerCase() === aspect.localizedAspectName.toLowerCase());
                                const value = matchedKey ? formData.item_specifics[matchedKey] : '';
                                return (
                                    <SearchableSelect
                                        key={aspect.localizedAspectName}
                                        label={aspect.localizedAspectName}
                                        value={value}
                                        options={aspect.values || []}
                                        metrics={<span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{aspect.usage}</span>}
                                        onChange={(val) => handleItemSpecificsChange(aspect.localizedAspectName, val)}
                                    />
                                );
                            }) : (
                                aspectsLoading ? (
                                    <div className="py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-3" />
                                        <p className="text-indigo-400 text-xs font-bold italic">Loading marketplace aspects...</p>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-gray-400 italic font-medium text-sm">
                                        Select a category to view required aspects.
                                    </div>
                                )
                            )}

                            {/* Additional/Custom Specifics */}
                            {Object.entries(formData.item_specifics).map(([key, value]) => {
                                const lowerKey = key.toLowerCase();
                                const isOfficial = formData.officialAspects?.some(a => a.localizedAspectName.toLowerCase() === lowerKey);
                                if (isOfficial || ['condition', 'price', 'title', 'description'].includes(lowerKey)) return null;
                                return (
                                    <SearchableSelect
                                        key={key}
                                        label={key}
                                        value={value}
                                        options={[]}
                                        metrics={<span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">CUSTOM</span>}
                                        onChange={(val) => handleItemSpecificsChange(key, val)}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 4: IMAGES SEQUENCE (As per SS) */}

                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Gallery Sequence</h3>
                            </div>
                            {formData.images.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleMagicAnalyze}
                                    disabled={isMagicLoading}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isMagicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {isMagicLoading ? 'AI IS SCANNING...' : 'Magic Auto-Fill'}
                                </button>
                            )}
                        </div>

                        {/* IMAGE REORDER GALLERY */}
                        <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 will-change-transform">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-indigo-500" /> Image Gallery
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Drag to reorder • First image is main</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.multiple = true;
                                            input.accept = 'image/*';
                                            input.onchange = (e) => {
                                                const files = Array.from(e.target.files);
                                                files.forEach(file => {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const img = new Image();
                                                        img.onload = () => {
                                                            const canvas = document.createElement('canvas');
                                                            let width = img.width;
                                                            let height = img.height;
                                                            const MAX = 1200;
                                                            if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
                                                            else { if (height > MAX) { width *= MAX / height; height = MAX; } }
                                                            canvas.width = width; canvas.height = height;
                                                            const ctx = canvas.getContext('2d');
                                                            ctx.drawImage(img, 0, 0, width, height);
                                                            const compressed = canvas.toDataURL('image/jpeg', 0.7);
                                                            setFormData(p => ({ ...p, images: [...p.images, compressed] }));
                                                        };
                                                        img.src = ev.target.result;
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                            };
                                            input.click();
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 hover:border-indigo-500 transition-all shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> ADD PHOTOS
                                    </button>
                                </div>
                            </div>

                            <Reorder.Group
                                axis="x"
                                values={formData.images || []}
                                onReorder={(newImages) => setFormData({ ...formData, images: newImages })}
                                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                            >
                                {(formData.images || []).map((img, idx) => (
                                    <Reorder.Item
                                        key={img}
                                        value={img}
                                        className="group relative aspect-square w-32 h-32 bg-white rounded-2xl overflow-hidden border-2 border-transparent hover:border-indigo-500 shadow-sm transition-all cursor-grab active:cursor-grabbing flex-shrink-0"
                                    >
                                        <img
                                            src={img}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover pointer-events-none"
                                            style={{ contentVisibility: 'auto' }}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                            <button type="button" onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })} className="p-2 bg-rose-500 rounded-xl text-white hover:scale-110 transition-all shadow-md">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[9px] font-black text-white shadow-lg ${idx === 0 ? 'bg-indigo-600' : 'bg-black/50'}`}>
                                            {idx === 0 ? 'MAIN' : `#${idx + 1}`}
                                        </div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        </div>
                    </div>

                    {/* SECTION 4.5: VARIATIONS */}
                    {formData.variations && formData.variations.length > 0 && (
                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
                            <div className="flex items-center gap-4 border-b border-gray-50 pb-6">
                                <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Product Variations</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.variations.map((v, vIdx) => (
                                    <div key={vIdx} className="bg-gray-50 p-6 rounded-[30px] border border-gray-100 relative group">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                                            <button type="button" onClick={() => addVariationValue(vIdx)} className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-600 hover:text-white transition-all">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-3">{v.name}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {v.values.map((val, valIdx) => (
                                                <span key={valIdx} className="px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded-xl border border-gray-200 flex items-center gap-2 group/pill shadow-sm">
                                                    {val}
                                                    <button type="button" onClick={() => removeVariationValue(vIdx, valIdx)} className="hover:text-rose-500 opacity-0 group-hover/pill:opacity-100 transition-all">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 5: DESCRIPTION & ASPECTS */}
                    <div className="bg-gray-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl opacity-50"></div>
                        <div className="flex items-center gap-3 mb-8">
                            <Sparkles className="w-6 h-6 text-indigo-400" />
                            <h3 className="text-xl font-black uppercase tracking-widest">AI Description</h3>
                        </div>
                        <div
                            ref={descriptionRef}
                            contentEditable={true}
                            className="min-h-[400px] outline-none text-gray-300 text-lg leading-relaxed prose prose-invert font-medium italic"
                            onBlur={(e) => setFormData(p => ({ ...p, description: e.target.innerHTML }))}
                            dangerouslySetInnerHTML={{ __html: formData.description }}
                        />
                    </div>
                </div>

                {/* COMPACT ACTION BAR (END OF FORM) */}
                <div className="pt-10 flex items-center justify-between border-t border-gray-100 mt-10">
                    <button
                        type="button"
                        onClick={async () => {
                            const ok = await showConfirm("This will delete all current progress and start fresh.");
                            if (ok) {
                                if (onReset) onReset();
                                else window.location.reload();
                            }
                        }}
                        className="text-gray-400 hover:text-rose-500 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all group"
                    >
                        <RotateCcw className="w-3 h-3 group-hover:rotate-[-180deg] transition-transform duration-500" /> Discard Everything
                    </button>

                    <div className="flex items-center gap-3">
                        {/* 1. SAVE ITEM */}
                        <button
                            type="submit" disabled={isFetching}
                            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"
                        >
                            <Save className="w-4 h-4" /> Save Item
                        </button>

                        {/* 2. EXTENSION */}
                        <button
                            type="button" disabled={isFetching}
                            onClick={() => {
                                window.postMessage({ type: 'EbayAutoLister_SendData', payload: formData }, "*");
                            }}
                            className="px-6 py-3 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg active:scale-95"
                        >
                            <Layers className="w-4 h-4 text-white" /> Extension
                        </button>

                        {/* 3. API LIST */}
                        <button
                            type="button" disabled={isFetching}
                            onClick={(e) => handlePreSubmit(e, true, false)}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                        >
                            <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300" /> API List
                        </button>

                        {/* 4. SAVE DRAFT */}
                        <button
                            type="button" disabled={isFetching}
                            onClick={(e) => handlePreSubmit(e, false, true)}
                            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                        >
                            <FileText className="w-4 h-4" /> Save Draft
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

// Helper component for category search
const SearchableCategory = ({ value, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            // Check if the click was outside the wrapper OR if the user clicked the OK button
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (searchTerm.length > 2) {
                const cats = await searchCategories(searchTerm);
                setResults(cats || []);
            }
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full min-h-[48px] h-auto px-4 py-2.5 bg-gray-50 border border-transparent focus:border-indigo-600 rounded-xl flex items-center justify-between cursor-pointer group transition-all"
            >
                <div className="flex-1 pr-4">
                    <span className="text-[10px] font-black text-gray-900 leading-normal break-words">
                        {typeof value === 'object' ? (value.fullName || value.name) : (value || 'Select Category...')}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[5000] overflow-hidden">
                    <div className="p-3 bg-gray-50">
                        <input
                            autoFocus type="text" placeholder="Search categories..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold font-mono outline-none"
                        />
                    </div>
                    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-100">
                        {results.map((cat, idx) => (
                            <div key={idx} onClick={() => { onChange(cat); setIsOpen(false); }} className="px-4 py-3 text-[10px] font-bold text-gray-700 hover:bg-indigo-600 hover:text-white cursor-pointer border-b border-gray-50 last:border-0 italic">
                                {cat.fullName}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiProductForm;

