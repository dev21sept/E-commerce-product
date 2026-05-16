const path = require('path');
console.log(`\n\n*****************************************`);
console.log(`*   SYSTEM STARTING: ${new Date().toLocaleTimeString()}   *`);
console.log(`*****************************************\n`);
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectMongoDB = require('./config/mongodb');
connectMongoDB();

const productRoutes = require('./routes/productRoutes');
const ebayRoutes = require('./routes/ebayRoutes');
const aiRoutes = require('./routes/aiRoutes');
const scraperRoutes = require('./routes/scraperRoutes');
const listingRoutes = require('./routes/listingRoutes');
const orderRoutes = require('./routes/orderRoutes');
const fetchRuleRoutes = require('./routes/fetchRuleRoutes');
const agentRoutes = require('./routes/agent_client_routes');
const agentToolsRoutes = require('./routes/agent_tools_routes');
const ebayController = require('./controllers/ebayController');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-role']
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(morgan('dev'));

// Routes Initialization Logs
console.log(`\n--- [SYSTEM] Initializing Modular Routes ---`);

// Debug Logger
app.use((req, res, next) => {
    console.log(`[DEBUG] ${req.method} ${req.url}`);
    next();
});

app.use('/api', productRoutes);
console.log(`✅ [INIT] Product CRUD Routes Active`);

app.use('/api/ebay', ebayRoutes);
app.get('/api/callback', ebayController.handleCallback);
app.get('/api/deletion', ebayController.handleDeletionNotification);
app.post('/api/deletion', ebayController.handleDeletionNotification);
console.log(`✅ [INIT] eBay Auth & OAuth Routes Active (including /api/callback fallback)`);

app.use('/api/ai', aiRoutes);
console.log(`✅ [INIT] AI Vision & Analysis Routes Active`);

app.use('/api/scraper', scraperRoutes);
console.log(`✅ [INIT] eBay Link Scraper Routes Active`);

app.use('/api/agents-clients', agentRoutes);
app.use('/api/agent-tools', agentToolsRoutes);
console.log(`✅ [INIT] Agent & Client Management Routes Active`);

app.use('/api/listing', listingRoutes);
console.log(`✅ [INIT] Direct API Listing Routes Active`);

app.use('/api/orders', orderRoutes);
app.use('/api/fetch-rules', fetchRuleRoutes);
console.log(`✅ [INIT] eBay Order Management Routes Active`);

console.log(`--- [SYSTEM] All Modules Loaded Successfully ---\n`);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
