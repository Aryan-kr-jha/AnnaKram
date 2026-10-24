// controllers/requisitionsController.js - AnnaKram iPDS Requisitions Controller
const db = require('../db');

/**
 * 1. GET ALL REQUISITIONS
 * Fetches indents with relational joins for FPS dealer and Commodity details.
 * Supports filtering by ?fps_id=X or ?status=Y with strict input sanitization.
 */
exports.getAllRequests = async (req, res, next) => {
  try {
    const { fps_id, status } = req.query;

    let query = `
      SELECT 
        r.id,
        r.request_code,
        r.fps_id,
        f.fps_code,
        f.dealer_name,
        r.commodity_id,
        c.name AS commodity_name,
        r.demanded_qty,
        r.urgency_level,
        r.status,
        r.challan_no,
        r.remarks,
        r.created_at,
        r.updated_at
      FROM fps_requisitions r
      JOIN fps_stores f ON r.fps_id = f.id
      JOIN commodities c ON r.commodity_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Sanitize and validate fps_id filter if provided
    if (fps_id !== undefined && fps_id !== null && fps_id !== '') {
      const parsedFpsId = parseInt(fps_id, 10);
      if (Number.isNaN(parsedFpsId) || parsedFpsId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter fps_id must be a valid positive integer.'
        });
      }
      params.push(parsedFpsId);
      query += ` AND r.fps_id = $${params.length}`;
    }

    // Sanitize status filter if provided
    if (status && typeof status === 'string') {
      const sanitizedStatus = status.trim().toUpperCase();
      params.push(sanitizedStatus);
      query += ` AND r.status = $${params.length}`;
    }

    query += ` ORDER BY r.created_at DESC;`;

    const { rows } = await db.query(query, params);
    return res.status(200).json({ success: true, requests: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. SUBMIT REQUISITION (FPS DEALER)
 * Validates and inserts a new grain indent from the FPS Owner Portal into the database.
 */
exports.createRequest = async (req, res, next) => {
  try {
    const { fps_id, commodity_id, demanded_qty, urgency_level, remarks } = req.body;

    // Strict Input Validation & Type Casting
    const parsedFpsId = parseInt(fps_id, 10);
    const parsedCommodityId = parseInt(commodity_id, 10);
    const parsedQty = parseFloat(demanded_qty);

    if (Number.isNaN(parsedFpsId) || parsedFpsId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'fps_id must be a valid positive integer.'
      });
    }

    if (Number.isNaN(parsedCommodityId) || parsedCommodityId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'commodity_id must be a valid positive integer.'
      });
    }

    if (Number.isNaN(parsedQty) || !Number.isFinite(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'demanded_qty must be a positive number greater than 0.'
      });
    }

    // Sanitize strings
    const sanitizedUrgency = typeof urgency_level === 'string' && urgency_level.trim()
      ? urgency_level.trim().toUpperCase()
      : 'ROUTINE';

    const sanitizedRemarks = typeof remarks === 'string' && remarks.trim()
      ? remarks.trim()
      : null;

    const requestCode = `REQ-${Date.now().toString().slice(-6)}`;

    const insertQuery = `
      INSERT INTO fps_requisitions (
        request_code, 
        fps_id, 
        commodity_id, 
        demanded_qty, 
        urgency_level, 
        remarks,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING *;
    `;

    const { rows } = await db.query(insertQuery, [
      requestCode,
      parsedFpsId,
      parsedCommodityId,
      parsedQty,
      sanitizedUrgency,
      sanitizedRemarks
    ]);

    return res.status(201).json({
      success: true,
      message: 'Requisition submitted successfully.',
      request: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. FULFILL REQUISITION (GODOWN DISPATCH)
 * ACID Transaction: Locks the requisition row, links the issued delivery challan,
 * and atomically transitions status to DISPATCHED_IN_TRANSIT.
 */
exports.fulfillRequest = async (req, res, next) => {
  // 1. Strict Parameter & Body Validation before acquiring connection
  const parsedId = parseInt(req.params.id, 10);
  if (Number.isNaN(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid requisition ID parameter. Must be a positive integer.'
    });
  }

  const rawChallanNo = req.body.challan_no;
  if (!rawChallanNo || typeof rawChallanNo !== 'string' || !rawChallanNo.trim()) {
    return res.status(400).json({
      success: false,
      error: 'challan_no is required and must be a non-empty string to fulfill a requisition.'
    });
  }
  const sanitizedChallanNo = rawChallanNo.trim();

  // 2. Acquire Client from Pool for ACID Transaction
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Lock row FOR UPDATE to prevent concurrent fulfillments
    const selectQuery = `
      SELECT id, status 
      FROM fps_requisitions 
      WHERE id = $1 
      FOR UPDATE;
    `;
    const { rows: existingRows } = await client.query(selectQuery, [parsedId]);

    if (existingRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Requisition ID not found.'
      });
    }

    const currentReq = existingRows[0];
    if (currentReq.status === 'DELIVERED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Cannot fulfill a requisition that is already marked as DELIVERED.'
      });
    }

    // Perform atomic status transition
    const updateQuery = `
      UPDATE fps_requisitions
      SET 
        status = 'DISPATCHED_IN_TRANSIT', 
        challan_no = $1, 
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

    const { rows } = await client.query(updateQuery, [sanitizedChallanNo, parsedId]);

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Requisition marked as dispatched in transit.',
      request: rows[0]
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[DB ROLLBACK ERROR in fulfillRequest]:', rollbackError.message);
    }
    next(error);
  } finally {
    // Release client back to the pool to prevent connection leaks
    client.release();
  }
};

/**
 * 4. ACKNOWLEDGE DELIVERY (FPS DEALER)
 * ACID Transaction: Dealer confirms receipt of physical foodgrains at the ration shop,
 * transitioning status from DISPATCHED_IN_TRANSIT to DELIVERED.
 */
exports.acknowledgeDelivery = async (req, res, next) => {
  const parsedId = parseInt(req.params.id, 10);
  if (Number.isNaN(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid requisition ID parameter. Must be a positive integer.'
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Lock row FOR UPDATE to verify valid status
    const lockQuery = `
      SELECT id, status 
      FROM fps_requisitions 
      WHERE id = $1 
      FOR UPDATE;
    `;
    const { rows: existingRows } = await client.query(lockQuery, [parsedId]);

    if (existingRows.length === 0 || existingRows[0].status !== 'DISPATCHED_IN_TRANSIT') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Invalid request ID or shipment is not currently in transit.'
      });
    }

    const updateQuery = `
      UPDATE fps_requisitions
      SET 
        status = 'DELIVERED', 
        updated_at = NOW()
      WHERE id = $1 AND status = 'DISPATCHED_IN_TRANSIT'
      RETURNING *;
    `;

    const { rows } = await client.query(updateQuery, [parsedId]);

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Consignment delivery acknowledged by dealer.',
      request: rows[0]
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[DB ROLLBACK ERROR in acknowledgeDelivery]:', rollbackError.message);
    }
    next(error);
  } finally {
    client.release();
  }
};