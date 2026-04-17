const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectMongoDB = async () => {
    // If already connected, do nothing
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    // If connecting, wait for it
    if (mongoose.connection.readyState === 2) {
        console.log('⏳ MongoDB is already connecting...');
        return;
    }

    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        console.log('⏳ Attempting to connect to MongoDB Atlas...');
        
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ MongoDB Connected (State:', mongoose.connection.readyState, ')');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        // Important: Reset state so next call can try again
        await mongoose.disconnect();
    }
};

module.exports = connectMongoDB;
