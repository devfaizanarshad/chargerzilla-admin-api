const axios = require('axios');
const https = require('https');
require('dotenv').config();

const agent = new https.Agent({
    rejectUnauthorized: false
});

const testCloudflare = async () => {
    const email = process.env.CLOUDFLARE_EMAIL;
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    console.log('Testing with:');
    console.log('Email:', email);
    console.log('Account ID:', accountId);

    try {
        const response = await axios.get(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
            {
                headers: {
                    'X-Auth-Email': email,
                    'X-Auth-Key': apiKey,
                },
                httpsAgent: agent
            }
        );
        console.log('Success:', response.data.success);
        if (response.data.success) {
            console.log('Image Count:', response.data.result.images.length);
        }
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
};

testCloudflare();
