import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.MODE === 'production' 
        ? 'https://capable-mercy-production-8c90.up.railway.app/api'
        : 'http://localhost:5000/api',
    timeout: 120000
});

export const getEbayAuthUrl = async (state = 'dashboard') => {
    const response = await api.get(`/ebay/auth-url?state=${state}`);
    return response.data;
};

export const listProduct = async (productId) => {
    const response = await api.post(`/ebay/list/${productId}`);
    return response.data;
};



export const fetchEbayProduct = async (url) => {
    const response = await api.post('/fetch-ebay-product', { url });
    return response.data;
};

export const scrapeEbayDescription = async (url) => {
    const response = await api.post('/scrape-ebay', { url });
    return response.data;
};


export const createProduct = async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
};

export const getProducts = async () => {
    const response = await api.get('/products');
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
