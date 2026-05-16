import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production' || window.location.hostname.includes('ajxlubricant.co.in');

const api = axios.create({
    baseURL: isProduction
        ? 'https://apivalisting.ajxlubricant.co.in/api'
        : 'http://localhost:5000/api',
    timeout: 120000
});

// Request Interceptor (Original / Clean)
api.interceptors.request.use((config) => {
    const sessionStr = localStorage.getItem('va_admin_session');
    if (sessionStr) {
        const session = JSON.parse(sessionStr);
        // Identify the user role
        const vasterRole = localStorage.getItem('vaster_role') || session.role;
        
        if (session.role === 'agent') {
            config.headers['x-user-id'] = session.id;
            config.headers['x-user-role'] = 'agent';
        } else if (vasterRole === 'workforce') {
            config.headers['x-user-id'] = session.id || 'admin_root';
            config.headers['x-user-role'] = 'workforce';
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Simple In-Memory Cache
const cache = {
    policies: null,
    locations: null,
    products: null,
    orders: null
};

export const getEbayAuthUrl = async (state = 'dashboard') => {
    const response = await api.get(`/ebay/auth-url?state=${state}`);
    return response.data;
};

export const syncEbayData = async () => {
    const response = await api.get('/ebay/sync');
    cache.products = null; // Clear cache to show newly synced products
    return response.data;
};

export const getEbayPolicies = async () => {
    if (cache.policies) return cache.policies;
    const response = await api.get('/ebay/policies');
    cache.policies = response.data;
    return response.data;
};

export const getEbayLocations = async () => {
    if (cache.locations) return cache.locations;
    const response = await api.get('/ebay/locations');
    cache.locations = response.data;
    return response.data;
};

export const getEbayConnectionStatus = async () => {
    const response = await api.get('/ebay/connection-status');
    return response.data;
};

export const disconnectEbay = async () => {
    const response = await api.post('/ebay/disconnect');
    return response.data;
};

export const getCategoryConditions = async (categoryId) => {
    const response = await api.get(`/ebay/conditions?categoryId=${categoryId}`);
    return response.data;
};

export const listProduct = async (productId, isDraft = false) => {
    const response = await api.post(`/listing/ebay/${productId}${isDraft ? '?draft=true' : ''}`);
    cache.products = null; // Invalidate cache so status (Listed/Draft) updates in UI
    return response.data;
};



export const fetchEbayProduct = async (url) => {
    const response = await api.post('/scraper/fetch-ebay-product', { url });
    return response.data;
};

export const scrapeEbayDescription = async (url) => {
    const response = await api.post('/scraper/scrape-ebay', { url });
    return response.data;
};

export const getCategoryAspects = async (categoryId) => {
    const response = await api.get(`/scraper/aspects/${categoryId}`);
    return response.data;
};


export const createProduct = async (productData) => {
    const response = await api.post('/products', productData);
    cache.products = null; // Invalidate cache
    return response.data;
};

export const getProducts = async (forceRefresh = false) => {
    if (cache.products && !forceRefresh) return cache.products;
    const response = await api.get('/products');
    cache.products = response.data;
    return response.data;
};

export const getProductById = async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
};

export const updateProduct = async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    cache.products = null; // Invalidate cache on update
    return response.data;
};

export const deleteProduct = async (id) => {
    const response = await api.delete(`/products/${id}`);
    cache.products = null; // Invalidate cache on delete
    return response.data;
};

export const analyzeProduct = async (data) => {
    const response = await api.post('/ai/analyze-product', data);
    return response.data;
};

export const saveAiListing = async (data) => {
    const response = await api.post('/ai/save-listing', data);
    return response.data;
};


export const getOrders = async () => {
    const response = await api.get('/orders');
    return response.data;
};

export const searchCategories = async (query) => {

    const response = await api.get(`/ai/search-categories?query=${query}`);
    return response.data;
};

export const getFetchRules = async (clientId) => {
    const response = await api.get(`/fetch-rules${clientId ? `?clientId=${clientId}` : ''}`);
    return response.data;
};

export const createFetchRule = async (data) => {
    const response = await api.post('/fetch-rules', data);
    return response.data;
};

export const updateFetchRule = async (id, data) => {
    const response = await api.put(`/fetch-rules/${id}`, data);
    return response.data;
};

export const deleteFetchRule = async (id) => {
    const response = await api.delete(`/fetch-rules/${id}`);
    return response.data;
};

// --- AGENT & CLIENT MANAGEMENT ---

export const loginAgent = async (data) => {
    const response = await api.post('/agents-clients/agents/login', data);
    return response.data;
};

export const getAgents = async () => {
    const response = await api.get('/agents-clients/agents');
    return response.data;
};

export const createAgent = async (data) => {
    const response = await api.post('/agents-clients/agents', data);
    return response.data;
};
export const getAgentPerformance = async (agentId) => {
    const response = await api.get(`/agents-clients/agents/${agentId}/performance`);
    return response.data;
};

export const deleteAgent = async (id) => {
    const response = await api.delete(`/agents-clients/agents/${id}`);
    return response.data;
};

export const updateAgent = async (id, data) => {
    const response = await api.put(`/agents-clients/agents/${id}`, data);
    return response.data;
};

export const createClient = async (data) => {
    const response = await api.post('/agents-clients/clients', data);
    return response.data;
};

export const deleteClient = async (id) => {
    const response = await api.delete(`/agents-clients/clients/${id}`);
    return response.data;
};

export const updateClient = async (id, data) => {
    const response = await api.put(`/agents-clients/clients/${id}`, data);
    return response.data;
};

export const getClients = async () => {
    const response = await api.get('/agents-clients/clients');
    return response.data;
};

export const disconnectClientEbay = async (id) => {
    const response = await api.post(`/agents-clients/clients/${id}/disconnect`);
    return response.data;
};

export const getClientPolicies = async (id) => {
    const response = await api.get(`/agents-clients/clients/${id}/policies`);
    return response.data;
};

export const getAdminStats = async () => {
    const response = await api.get('/agents-clients/dashboard/admin-stats');
    return response.data;
};

export const getSavedConditionNotes = async () => {
    const response = await api.get('/fetch-rules/condition-notes');
    return response.data;
};

