require('dotenv').config();
const ebayService = require('./services/ebayApiService');

async function test() {
    console.log('--- eBay API Auth Test ---');
    console.log('App ID:', process.env.EBAY_APP_ID);
    console.log('RuName:', process.env.EBAY_RU_NAME);

    try {
        console.log('\n1. Testing App Token (Client Credentials)...');
        const appToken = await ebayService.getAppToken();
        console.log('✅ App Token received:', appToken.substring(0, 20) + '...');

        console.log('\n2. Testing Consent URL...');
        const consentUrl = ebayService.getUserConsentUrl(process.env.EBAY_RU_NAME);
        console.log('✅ Consent URL generated:');
        console.log(consentUrl);
        console.log('\n--- Test Complete ---');
    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

test();
