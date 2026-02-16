const axios = require('axios');

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
                }
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
const uploadImage = async (fileBuffer, fileName) => {
    try {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiKey = process.env.CLOUDFLARE_API_KEY;
        const email = process.env.CLOUDFLARE_EMAIL;

        if (!accountId || !apiKey || !email) {
            throw new Error('Cloudflare credentials missing for image upload');
        }

        const formData = new FormData();
        const blob = new Blob([fileBuffer]);
        formData.append('file', blob, fileName);

        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
            formData,
            {
                headers: {
                    'X-Auth-Email': email,
                    'X-Auth-Key': apiKey,
                }
            }
        );

        if (response.data.success) {
            console.log('[CLOUDFLARE] Image uploaded successfully.');
            return response.data.result; // Contains id and variants (urls)
        } else {
            console.error('[CLOUDFLARE] Image upload failed:', response.data.errors);
            throw new Error('Cloudflare upload failed');
        }
    } catch (error) {
        console.error('[CLOUDFLARE] Error during image upload:', error.response ? error.response.data : error.message);
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

        const response = await axios.delete(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
            {
                headers: {
                    'X-Auth-Email': email,
                    'X-Auth-Key': apiKey,
                }
            }
        );

        if (response.data.success) {
            console.log('[CLOUDFLARE] Image deleted successfully.');
            return true;
        } else {
            console.error('[CLOUDFLARE] Image delete failed:', response.data.errors);
            return false;
        }
    } catch (error) {
        console.error('[CLOUDFLARE] Error during image deletion:', error.response ? error.response.data : error.message);
        return false;
    }
};

module.exports = {
    purgeCache,
    uploadImage,
    deleteImage
};
