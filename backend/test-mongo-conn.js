const mongoose = require('mongoose');
const dns = require('dns');

// Force Node to use Google DNS for this process
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoURI = 'mongodb+srv://shirramagrokk_db_user:a21YDX1Y34X2znkY@cluster0.vui2pms.mongodb.net/ebay_db?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
    try {
        console.log('🔄 Attempting SRV connection with Google DNS (8.8.8.8)...');
        await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log('✅ Connection Successful!');
        process.exit(0);
    } catch (error) {
        console.log('❌ Mongoose Connection Failed:', error.message);
        process.exit(1);
    }
}

testConnection();
