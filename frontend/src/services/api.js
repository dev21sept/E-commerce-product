import axios from 'axios';

const isProduction = import.meta.env.MODE === 'production' || window.location.hostname.includes('hostingersite.com');

const api = axios.create({
    baseURL: isProduction
        ? 'https://e-commerce-product-cdfx.vercel.app/api'
        : 'http://localhost:5000/api',
    timeout: 120000
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
    return response.data;
};

export const deleteProduct = async (id) => {
    const response = await api.delete(`/products/${id}`);
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