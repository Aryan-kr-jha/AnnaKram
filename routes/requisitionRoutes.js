// routes/requisitionRoutes.js
const express = require('express');
const router = express.Router();
const requisitionController = require('../controllers/requisitionsController');

// GET all requisitions (supports ?fps_id= & ?status=)
router.get('/', requisitionController.getAllRequests);

// POST create new requisition (FPS Dealer)
router.post('/', requisitionController.createRequest);

// PATCH fulfill requisition when Godown issues a challan
router.patch('/:id/fulfill', requisitionController.fulfillRequest);

// PATCH dealer acknowledges physical arrival
router.patch('/:id/acknowledge', requisitionController.acknowledgeDelivery);

module.exports = router;