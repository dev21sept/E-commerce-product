import React from 'react';

const PrivacyPolicy = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="text-gray-600 mb-4 text-sm">Effective Date: March 13, 2026</p>
            
            <section className="mb-8">
                <h2 className="text-xl font-bold mb-3">1. Information We Collect</h2>
                <p className="text-gray-700 leading-relaxed">
                    Our application connects to your eBay account to manage listings. We collect and store eBay authentication tokens securely in our database to ensure continuous service. We do not share your private data with third parties.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-3">2. How We Use Data</h2>
                <p className="text-gray-700 leading-relaxed">
                    The data collected is used solely to facilitate the product listing process from our admin panel to your eBay store.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-3">3. Data Security</h2>
                <p className="text-gray-700 leading-relaxed">
                    We implement industry-standard security measures to protect your tokens and product information.
                </p>
            </section>

            <footer className="mt-12 pt-8 border-t">
                <p className="text-gray-500 text-sm italic underline">For any questions, please contact the developer.</p>
            </footer>
        </div>
    );
};

export default PrivacyPolicy;
