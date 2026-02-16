const express = require('express');
const router = express.Router();
const multer = require('multer');
const stationController = require('../../controllers/admin/stationController');
const auth = require('../../middleware/auth');

// Multer memory storage (we'll forward to Cloudflare)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   - name: Public Stations
 *     description: System/Network charging stations
 *   - name: Private Chargers
 *     description: User-hosted chargers
 */

// ==========================================
// PUBLIC STATIONS (System / Network)
// ==========================================

/**
 * @swagger
 * /api/admin/stations/public:
 *   get:
 *     summary: Get all public stations with advanced filtering
 *     tags: [Public Stations]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or address
 *       - in: query
 *         name: connector
 *         schema: { type: string, enum: [chk_chademo, chk_ccs, chk_tesla, chk_j1772] }
 *         description: Filter by connector type availability
 *       - in: query
 *         name: level
 *         schema: { type: string }
 *         description: Filter by charging level
 *       - in: query
 *         name: id
 *         schema: { type: integer }
 *         description: Search by station ID
 *     responses:
 *       200:
 *         description: List of public stations
 */
router.get('/public', auth, stationController.getPublicStations);

// Lookup Routes
/**
 * @swagger
 * /api/admin/stations/networks:
 *   get:
 *     summary: Get all network types
 *     tags: [Public Stations]
 *     responses:
 *       200:
 *         description: List of networks for dropdowns
 */
router.get('/networks', auth, stationController.getNetworks);

/**
 * @swagger
 * /api/admin/stations/facilities:
 *   get:
 *     summary: Get all facility types
 *     tags: [Public Stations]
 *     responses:
 *       200:
 *         description: List of facilities for dropdowns
 */
router.get('/facilities', auth, stationController.getFacilities);

/**
 * @swagger
 * /api/admin/stations/public/{id}:
 *   get:
 *     summary: Get single public station details
 *     tags: [Public Stations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Station details (identity, location, connectors, media, activity_log)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 identity:
 *                   type: object
 *                 location:
 *                   type: object
 *                 connectors:
 *                   type: object
 *                 media:
 *                   type: object
 *                 activity_log:
 *                   type: array
 */
router.get('/public/:id', auth, stationController.getPublicStationById);

/**
 * @swagger
 * /api/admin/stations/public/{id}:
 *   patch:
 *     summary: Edit Public Station (Flat Structure)
 *     tags: [Public Stations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               station_name: { type: string }
 *               online: { type: boolean }
 *               pricing: { type: string }
 *               access: { type: string }
 *               network_type_id: { type: integer }
 *               facility_type_id: { type: integer }
 *               street_address: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               zip: { type: string }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               level: { type: string, enum: [L1, L2, "FAST Charger"] }
 *               total_ports: { type: integer }
 *               status: { type: string }
 *               chademo: { type: integer }
 *               ccs: { type: integer }
 *               tesla: { type: integer }
 *               j1772: { type: integer }
 *               nema1450: { type: integer }
 *               nema515: { type: integer }
 *               nema520: { type: integer }
 *     responses:
 *       200:
 *         description: Station updated successfully
 */
/**
 * @swagger
 * /api/admin/stations/public/{id}/activate:
 *   post:
 *     summary: Activate Public Station (Set online and Active status)
 *     tags: [Public Stations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Station activated and cache purged
 */
router.post('/public/:id/activate', auth, stationController.activatePublicStation);

/**
 * @swagger
 * /api/admin/stations/public/{id}/deactivate:
 *   post:
 *     summary: Deactivate/Decommission Public Station (Set offline and Decommissioned status)
 *     tags: [Public Stations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Station decommissioned and cache purged
 */
router.post('/public/:id/deactivate', auth, stationController.decommissionPublicStation);

/**
 * @swagger
 * /api/admin/stations/public/{id}:
 *   patch:
 *     summary: Edit Public Station (Flat Structure)
 *     tags: [Public Stations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               station_name: { type: string }
 *               online: { type: boolean }
 *               pricing: { type: string }
 *               access: { type: string }
 *               network_type_id: { type: integer }
 *               facility_type_id: { type: integer }
 *     responses:
 *       200:
 *         description: Station updated successfully
 */
router.patch('/public/:id', auth, stationController.updatePublicStation);
router.put('/public/:id', auth, stationController.updatePublicStation);

/**
 * @swagger
 * /api/admin/stations/public/{id}/media:
 *   delete:
 *     summary: Delete Public Station Image
 *     tags: [Public Stations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Image removed from station
 */
router.delete('/public/:id/media', auth, stationController.deletePublicStationMedia);

// ==========================================
// PRIVATE CHARGERS (User Added)
// ==========================================

/**
 * @swagger
 * /api/admin/stations/private:
 *   get:
 *     summary: Get all private chargers with search
 *     tags: [Private Chargers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by title, description, or address
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [published, draft, disabled] }
 *       - in: query
 *         name: host_id
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of private chargers
 */
router.get('/private', auth, stationController.getPrivateChargers);

/**
 * @swagger
 * /api/admin/stations/private/{id}:
 *   get:
 *     summary: Get single private charger details
 *     tags: [Private Chargers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Charger details (identity, location, availability, gallery, activity_log)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 identity:
 *                   type: object
 *                 location:
 *                   type: object
 *                 availability:
 *                   type: object
 *                   description: Timings & Days
 *                 gallery:
 *                   type: array
 *                   items: { type: object }
 *                 amenities:
 *                   type: object
 *                   description: Upsells & Facilities
 *                 activity_log:
 *                   type: array
 *                   description: Bookings & Chat History
 */
router.get('/private/:id', auth, stationController.getPrivateChargerById);

/**
 * @swagger
 * /api/admin/stations/private/{id}:
 *   put:
 *     summary: Edit Private Charger (Nested Structure)
 *     tags: [Private Chargers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identity:
 *                 type: object
 *                 properties:
 *                   title: { type: string }
 *                   description: { type: string }
 *                   status:
 *                     type: object
 *                     properties:
 *                       published: { type: boolean }
 *                       disabled: { type: boolean }
 *                       draft: { type: boolean }
 *               location:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   coordinates: { type: object, properties: { lat: { type: number }, lng: { type: number } } }
 *               pricing:
 *                 type: object
 *                 properties:
 *                   hourly: { type: number }
 *                   weekend: { type: number }
 *                   cancellation_policy: { type: string }
 *               specs:
 *                 type: object
 *                 properties:
 *                   connector_type: { type: string }
 *                   power_output_kw: { type: number }
 *                   voltage: { type: integer }
 *                   amperage: { type: integer }
 *                   ports: { type: object, properties: { l2: { type: integer }, dc: { type: integer } } }
 *               amenities:
 *                 type: object
 *                 properties:
 *                   list: { type: array, items: { type: string } }
 *                   facilities: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Charger updated
 */
router.put('/private/:id', auth, stationController.updatePrivateCharger);

/**
 * @swagger
 * /api/admin/stations/private/{id}:
 *   patch:
 *     summary: Moderate status (Quick Action)
 *     tags: [Private Chargers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               disabled: { type: boolean }
 *               published: { type: boolean }
 *     responses:
 *       200:
 *         description: Status toggled
 */
router.patch('/private/:id', auth, stationController.updatePrivateChargerStatus);

/**
 * @swagger
 * /api/admin/stations/public/{id}/image:
 *   post:
 *     summary: Upload and update Public Station image
 *     tags: [Public Stations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded and DB updated
 */
router.post('/public/:id/image', auth, upload.single('image'), stationController.uploadPublicStationImage);

/**
 * @swagger
 * /api/admin/stations/private/{id}/media:
 *   post:
 *     summary: Add image to Private Charger gallery
 *     tags: [Private Chargers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Media added to gallery
 */
router.post('/private/:id/media', auth, upload.single('image'), stationController.uploadPrivateChargerMedia);

router.delete('/private/:id/media/:mediaId', auth, stationController.deleteChargerMedia);

module.exports = router;
