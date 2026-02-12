const express = require('express');
const router = express.Router();
const metadataController = require('../../controllers/admin/metadataController');
const auth = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Metadata
 *   description: Lookup data for filters and select menus
 */

/**
 * @swagger
 * /api/admin/metadata:
 *   get:
 *     summary: Get all valid lookup values for administrator filters
 *     tags: [Metadata]
 *     responses:
 *       200:
 *         description: Full set of metadata including cities, networks, hosts, and status constants
 */
router.get('/', auth, metadataController.getAdminMetadata);

module.exports = router;
