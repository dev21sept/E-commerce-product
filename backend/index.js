const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectMongoDB = require('./config/mongodb');
require('dotenv').config({ path: path.join(__dirname, '.env') });
connectMongoDB();

const productRoutes = require('./routes/productRoutes');
const ebayRoutes = require('./routes/ebayRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api', productRoutes);
app.use('/api/ebay', ebayRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
