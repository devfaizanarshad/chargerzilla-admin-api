const express = require('express');
const router = express.Router();
const userController = require('../../controllers/admin/userController');
const auth = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email
 *       - in: query
 *         name: role
 *         schema: { type: string }
 *         description: Filter by user role (host/guest)
 *       - in: query
 *         name: stripe_verified
 *         schema: { type: boolean }
 *         description: Filter by Stripe verification status
 *       - in: query
 *         name: email_verified
 *         schema: { type: boolean }
 *         description: Filter by Email verification status
 *     responses:
 *       200:
 *         description: List of users with stats
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
 *                     properties:
 *                       id:
 *                         type: integer
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       stats:
 *                         type: object
 *                         properties:
 *                           listings:
 *                             type: integer
 *                           bookings:
 *                             type: integer
 */
router.get('/', auth, userController.getUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user details
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details including listings and bookings
 *       404:
 *         description: User not found
 */
router.get('/:id', auth, userController.getUserById);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Update user status
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phoneNumber: { type: string }
 *               role: { type: string, enum: [guest, host, admin] }
 *               active_status: { type: boolean }
 *               delete_status: { type: boolean }
 *               isEmailVerified: { type: boolean }
 *               isStripeVerified: { type: boolean }
 *               account_type: { type: string }
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch('/:id', auth, userController.updateUser);

module.exports = router;
