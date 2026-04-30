const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Serverless optimization: Cache the connection
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectMongoDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        console.log('⏳ Attempting to connect to MongoDB Atlas (Serverless)...');

        cached.promise = mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 5 // Better for small serverless functions
        }).then((mongooseInstance) => {
            console.log('✅ MongoDB Connected (State: 1)');
            console.log(`📡 Active Database: ${mongooseInstance.connection.name}`);
            return mongooseInstance;
        }).catch(err => {
            console.error('❌ MongoDB Connection Error:', err.message);
            cached.promise = null;
            throw err;
        });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (e) {
        cached.promise = null;
        throw e;
    }
};

module.exports = connectMongoDB;
