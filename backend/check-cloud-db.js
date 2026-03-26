const mongoose = require('mongoose');
require('dotenv').config();

const checkDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI not found in environment');
        
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(uri);
        console.log('✅ Connected successfully!');
        
        const count = await mongoose.connection.collection('products').countDocuments();
        console.log('--- DATABASE STATS ---');
        console.log(`Total Products in Cloud: ${count}`);
        
        if (count > 0) {
            console.log('\nLast 3 Products Added:');
            const lastProducts = await mongoose.connection.collection('products')
                .find({})
                .sort({ created_at: -1 })
                .limit(3)
                .toArray();
            
            lastProducts.forEach((p, i) => {
                console.log(`${i+1}. Title: ${p.title || 'N/A'}`);
                console.log(`   Source: ${p.source || 'ebay'}`);
                console.log(`   Created: ${p.created_at || 'N/A'}`);
                console.log('-------------------------');
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking cloud DB:', error.message);
        process.exit(1);
    }
};

checkDB();
