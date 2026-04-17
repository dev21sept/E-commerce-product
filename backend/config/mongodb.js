const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectMongoDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        console.log('⏳ Attempting to connect to MongoDB Atlas...');
        
        // Clear anything that might be hanging
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ MongoDB ReadyState:', mongoose.connection.readyState); // 1 means connected
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
    }
};

module.exports = connectMongoDB;
