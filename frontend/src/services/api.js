import axios from 'axios';

const api = axios.create({
    //baseURL: 'http://localhost:5000/api',
    baseURL: 'https://e-commerce-product-3.onrender.com/api',
    timeout: 120000
});



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
