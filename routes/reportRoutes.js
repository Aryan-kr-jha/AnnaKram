// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/kpis', reportController.getDashboardKPIs);
router.get('/traceability', reportController.getTraceability);
router.get('/overrides', reportController.getAuditOverrides);

module.exports = router;