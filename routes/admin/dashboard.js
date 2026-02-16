const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/dashboardController');
const auth = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Administrative analytics and oversight
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get all dashboard metrics (Trends, Revenue, Health)
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Full dashboard data payload
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                 trends:
 *                   type: object
 *                 health:
 *                   type: object
 *                 geographic:
 *                   type: object
 *                 recent_activity:
 *                   type: array
 */
router.get('/', auth, dashboardController.getDashboardData);

module.exports = router;
