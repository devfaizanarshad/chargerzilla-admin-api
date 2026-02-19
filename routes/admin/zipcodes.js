const express = require('express');
const router = express.Router();
const zipcodeController = require('../../controllers/admin/zipcodeController');

// All routes here are prefixed with /api/admin/zipcodes
router.get('/', zipcodeController.getAllZipcodes);

module.exports = router;
