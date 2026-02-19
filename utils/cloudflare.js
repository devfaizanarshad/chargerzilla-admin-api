const axios = require('axios');
const https = require('https');

// Create an HTTPS agent that can ignore SSL errors if NODE_ENV is development
const httpsAgent = new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV !== 'production' ? false : true
});

/**
 * Purge Cloudflare cache for the configured zone.
 * Currently configured to purge everything to ensure frontend reflects DB changes.
 */
const purgeCache = async () => {
    try {
        const zoneId = process.env.CLOUDFLARE_ZONE_ID;
        const apiKey = process.env.CLOUDFLARE_API_KEY;
        const email = process.env.CLOUDFLARE_EMAIL;

        if (!zoneId || !apiKey || !email) {
            console.warn('[CLOUDFLARE] Missing credentials, skipping cache purge.');
            return;
        }

        console.log(`[CLOUDFLARE] Initiating cache purge for Zone: ${zoneId}`);

        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
            { purge_everything: true },
            {
                headers: {
                    'X-Auth-Email': email,
                    'X-Auth-Key': apiKey,
                    'Content-Type': 'application/json'
                },
                httpsAgent
            }
        );

        if (response.data.success) {
            console.log('[CLOUDFLARE] Cache purged successfully.');
        } else {
            console.error('[CLOUDFLARE] Cache purge failed:', response.data.errors);
        }

        return response.data;
    } catch (error) {
        console.error('[CLOUDFLARE] Error during cache purge:', error.response ? error.response.data : error.message);
        throw error;
    }
};

/**
 * Upload an image to Cloudflare Images.
 * @param {Buffer} fileBuffer - The image file buffer.
 * @param {string} fileName - The name of the file.
 */
const uploadImage = async (fileBuffer, fileName, mimeType = 'image/jpeg') => {
    try {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiKey = process.env.CLOUDFLARE_API_KEY;
        const email = process.env.CLOUDFLARE_EMAIL;

        if (!accountId || !apiKey || !email) {
            throw new Error('Cloudflare credentials missing for image upload');
        }

        console.log(`[CLOUDFLARE] Uploading image: ${fileName} (${mimeType}) to Account: ${accountId}`);

        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: mimeType });
        formData.append('file', blob, fileName);

        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
            formData,
            {
                headers: {
                    'X-Auth-Email': email,
                    'X-Auth-Key': apiKey,
                },
                httpsAgent
            }
        );

        if (response.data.success) {
            console.log('[CLOUDFLARE] Image uploaded successfully.');
            return response.data.result; // Contains id and variants (urls)
        } else {
            console.error('[CLOUDFLARE] Image upload failed. Response:', JSON.stringify(response.data.errors, null, 2));
            throw new Error(`Cloudflare upload failed: ${JSON.stringify(response.data.errors)}`);
        }
    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('[CLOUDFLARE] Error during image upload:', JSON.stringify(errorData, null, 2));
        throw error;
    }
};

/**
 * Delete an image from Cloudflare Images.
 * @param {string} imageId - The Cloudflare image ID.
 */
const deleteImage = async (imageId) => {
    try {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiKey = process.env.CLOUDFLARE_API_KEY;
        const email = process.env.CLOUDFLARE_EMAIL;

        if (!accountId || !apiKey || !email) {
            throw new Error('Cloudflare credentials missing for image deletion');
        }

        console.log(`[CLOUDFLARE] Deleting image ID: ${imageId} from Account: ${accountId}`);

        const response = await axios.delete(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
            {
                headers: {
                    'X-Auth-Email': email,
                    'X-Auth-Key': apiKey,
                },
                httpsAgent
            }
        );

        if (response.data.success) {
            console.log('[CLOUDFLARE] Image deleted successfully.');
            return true;
        } else {
            console.error('[CLOUDFLARE] Image delete failed:', JSON.stringify(response.data.errors, null, 2));
            return false;
        }
    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('[CLOUDFLARE] Error during image deletion:', JSON.stringify(errorData, null, 2));
        return false;
    }
};

module.exports = {
    purgeCache,
    uploadImage,
    deleteImage
};
