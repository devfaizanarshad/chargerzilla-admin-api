const express = require('express');
const router = express.Router();
const stationController = require('../../controllers/admin/stationController');
const auth = require('../../middleware/auth');

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
 *   put:
 *     summary: Edit Public Station (Maximum Control)
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
 *               street_address: { type: string }
 *               status: { type: string }
 *               online: { type: boolean }
 *               pricing: { type: string }
 *               total_ports: { type: integer }
 *               chademo: { type: integer }
 *               ccs: { type: integer }
 *               tesla: { type: integer }
 *     responses:
 *       200:
 *         description: Station updated successfully
 */
router.put('/public/:id', auth, stationController.updatePublicStation);
router.patch('/public/:id', auth, stationController.updatePublicStation);

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
 *     summary: Edit Private Charger Details
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
 *               title: { type: string }
 *               description: { type: string }
 *               address: { type: string }
 *               pricePerHour: { type: number }
 *               weekendPrice: { type: number }
 *               connectorType: { type: string, description: "CSV like J1772,CCS" }
 *               powerOutput: { type: number }
 *               voltage: { type: integer }
 *               amperage: { type: integer }
 *               published: { type: boolean }
 *               disabled: { type: boolean }
 *               access: { type: string }
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

router.delete('/private/:id/media/:mediaId', auth, stationController.deleteChargerMedia);

module.exports = router;
