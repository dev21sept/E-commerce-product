const axios = require('axios');

(async () => {
    try {
        console.log('Testing Backend API Fetch (Correct Endpoint)...');
        // Correct route is /api/fetch-ebay-product based on routes/productRoutes.js and server.js prefix
        const response = await axios.post('http://localhost:5000/api/fetch-ebay-product', {
            url: 'https://www.ebay.com/itm/204365313431'
        });

        console.log('API Response Status:', response.status);
        console.log('Data received:', JSON.stringify(response.data, (key, value) => {
            if (key === 'description' && value) return value.substring(0, 100) + '...';
            return value;
        }, 2));
    } catch (err) {
        console.error('API Error:', err.response ? err.response.data : err.message);
    }
})();
