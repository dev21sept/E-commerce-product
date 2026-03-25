const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Product = require('./models/Product');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ebay_db');
    const sqlData = await Product.countDocuments({ sql_id: { $exists: true } });
    const aiTestData = await Product.countDocuments({ sql_id: { $exists: false } });
    console.log(`📡 MongoDB breakdown:`);
    console.log(`✅ Old SQL Data: ${sqlData} items`);
    console.log(`🤖 AI Test Generated Data: ${aiTestData} items`);
    console.log(`📊 Total items: ${sqlData + aiTestData}`);
    process.exit();
}
check();
