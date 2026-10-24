// routes/dispatchRoutes.js
const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');

// 1. Read-only FIFO calculation preview
router.post('/preview', dispatchController.previewFIFOAllocation);

// 2. Atomic confirmation & deduction
router.post('/confirm', dispatchController.confirmDispatch);

module.exports = router;