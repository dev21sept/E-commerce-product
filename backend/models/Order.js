const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true, required: true },
    ebayOrderId: String,
    sellerId: String,
    buyerUsername: String,
    totalAmount: Number,
    currency: { type: String, default: 'USD' },
    status: String,
    paymentStatus: String,
    createdDate: Date,
    paidDate: Date,
    shippedDate: Date,
    lineItems: [
        {
            lineItemId: String,
            title: String,
            sku: String,
            quantity: Number,
            price: Number,
            thumbnail: String
        }
    ],
    shippingStep: {
        shipTo: {
            fullName: String,
            addressLine1: String,
            city: String,
            stateOrProvince: String,
            postalCode: String,
            countryCode: String
        }
    },
    syncDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
