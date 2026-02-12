const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/admin/bookingController');
const auth = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   - name: Bookings
 *     description: Booking management and financial analytics
 */

// ==========================================
// STATS (must be before /:id to avoid conflict)
// ==========================================

/**
 * @swagger
 * /api/admin/bookings/stats:
 *   get:
 *     summary: Get booking statistics and financial dashboard
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *         description: Start date filter (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *         description: End date filter (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Financial dashboard with status breakdown, revenue metrics, monthly trends, and top chargers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                     status_breakdown:
 *                       type: object
 *                     payment_breakdown:
 *                       type: object
 *                     financials:
 *                       type: object
 *                     monthly_trend:
 *                       type: array
 *                     top_chargers:
 *                       type: array
 */
router.get('/stats', auth, bookingController.getBookingStats);

// ==========================================
// LIST ALL BOOKINGS
// ==========================================

/**
 * @swagger
 * /api/admin/bookings:
 *   get:
 *     summary: Get all bookings with advanced filtering and search
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default 15)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Reserved, CancelledByHost, CancelledByGuest, Waiting, Completed]
 *         description: Filter by booking status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, captured, funds-released, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by booking ID (nid) or message content
 *       - in: query
 *         name: guest_id
 *         schema:
 *           type: integer
 *         description: Filter by guest user ID
 *       - in: query
 *         name: host_id
 *         schema:
 *           type: integer
 *         description: Filter by host user ID (via charger owner)
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [createdAt, arriveDate, subtotal, status, paymentStatus]
 *         description: Sort field (default createdAt)
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort direction (default DESC)
 *     responses:
 *       200:
 *         description: Paginated list of bookings with guest, charger and host info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 */
router.get('/', auth, bookingController.getBookings);

// ==========================================
// SINGLE BOOKING DETAIL
// ==========================================

/**
 * @swagger
 * /api/admin/bookings/{id}:
 *   get:
 *     summary: Get full booking detail (Guest - Booking - Charger - Host chain)
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID (string UUID)
 *     responses:
 *       200:
 *         description: Complete booking detail with financials, extras, communication, and linked entities
 *       404:
 *         description: Booking not found
 *   patch:
 *     summary: Update booking status or payment status (Admin moderation)
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Reserved, CancelledByHost, CancelledByGuest, Waiting, Completed]
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, captured, funds-released, cancelled, refunded]
 *     responses:
 *       200:
 *         description: Booking updated with change log
 *       400:
 *         description: No valid fields provided
 *       404:
 *         description: Booking not found
 */
router.get('/:id', auth, bookingController.getBookingById);
router.patch('/:id', auth, bookingController.updateBooking);

module.exports = router;
