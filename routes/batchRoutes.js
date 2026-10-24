// routes/batchRoutes.js
const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');

router.post('/ingest', batchController.ingestBatch);
router.post('/return', batchController.returnStockToGodown);
router.get('/next-number', batchController.getNextBatchNumberEndpoint);
router.get('/', batchController.getAllBatches);
router.patch('/:id/status', batchController.updateBatchStatus);

module.exports = router;