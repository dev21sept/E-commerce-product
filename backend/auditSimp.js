const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const sql = await Product.countDocuments({ sql_id: { $exists: true } });
    const tests = await Product.countDocuments({ sql_id: { $exists: false } });
    console.log('SQL_DATA=' + sql);
    console.log('TEST_DATA=' + tests);
    process.exit();
})();
