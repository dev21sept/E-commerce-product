const mongoose = require('mongoose');

// Local Connection
const LOCAL_URI = 'mongodb://127.0.0.1:27017/ebay_db';
// Cloud Connection
const CLOUD_URI = 'mongodb+srv://shirramagrokk_db_user:a21YDX1Y34X2znkY@cluster0.vui2pms.mongodb.net/ebay_db?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
    try {
        console.log('--- STARTING MIGRATION ---');
        
        // Connect to local
        const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
        console.log('✅ Connected to LOCAL MongoDB');
        
        // Connect to cloud
        const cloudConn = await mongoose.createConnection(CLOUD_URI).asPromise();
        console.log('✅ Connected to CLOUD MongoDB');

        // Create the same schema/model on both connections
        const productSchema = new mongoose.Schema({
            title: String,
            description: String,
            category: String,
            brand: String,
            condition_name: String,
            selling_price: Number,
            images: [String],
            source: String,
            created_at: { type: Date, default: Date.now },
            updated_at: { type: Date, default: Date.now }
        }, { strict: false }); // Allow all fields

        const LocalProduct = localConn.model('Product', productSchema);
        const CloudProduct = cloudConn.model('Product', productSchema);

        console.log('🔄 Fetching products from LOCAL...');
        const products = await LocalProduct.find().lean();
        console.log(`📦 Found ${products.length} products to migrate.`);

        if (products.length === 0) {
            console.log('ℹ️ No products found in local database.');
            return;
        }

        console.log('🚀 Uploading products to CLOUD...');
        let successCount = 0;
        
        for (const product of products) {
            // Remove the unique local _id or keep it? 
            // Better logic: if already exists by some criteria, update.
            // For now, we just insert.
            const { _id, ...dataWithoutId } = product; 
            
            // Check if title already exists in cloud to avoid duplicates if migration is re-run
            const exists = await CloudProduct.findOne({ title: product.title });
            
            if (exists) {
                console.log(`Skipping: "${product.title}" already exists in Cloud.`);
            } else {
                await CloudProduct.create(dataWithoutId);
                successCount++;
                if (successCount % 10 === 0) console.log(`${successCount} products uploaded...`);
            }
        }

        console.log(`--- MIGRATION COMPLETE! ---`);
        console.log(`✅ Successfully uploaded ${successCount} new products to the Cloud.`);
        
        // Close connections
        await localConn.close();
        await cloudConn.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ MIGRATION FAILED:', error);
        process.exit(1);
    }
}

migrate();
