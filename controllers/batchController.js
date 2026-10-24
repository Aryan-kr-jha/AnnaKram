// controllers/batchController.js - AnnaKram iPDS Stock Ingestion Controller
const db = require('../db');

// Official Commodity Prefix Mapping for Standard PDS Batch Coding
const COMMODITY_PREFIXES = {
  1: 'WHT', // Wheat (Grade A)
  2: 'RIC', // Boiled Rice
  3: 'SUG', // Refined Sugar
  4: 'DAL'  // Tuvar Dal
};

/**
 * Deterministic sequential batch number allocator:
 * Format: B-[COMMODITY_PREFIX]-[YEAR]-[3_DIGIT_SEQUENCE]
 * Example: B-WHT-2026-004
 */
async function generateSequentialBatchNumber(commodityId) {
  const prefix = COMMODITY_PREFIXES[commodityId] || 'GEN';
  const year = new Date().getFullYear();
  const searchPattern = `B-${prefix}-${year}-%`;

  const queryText = `
    SELECT batch_number FROM stock_batches 
    WHERE batch_number LIKE $1 
    ORDER BY id DESC;
  `;

  const res = await db.query(queryText, [searchPattern]);
  let maxSeq = 0;

  for (const row of res.rows) {
    const parts = String(row.batch_number).split('-');
    if (parts.length >= 4) {
      const seq = parseInt(parts[3], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const formattedSeq = String(nextSeq).padStart(3, '0');
  return `B-${prefix}-${year}-${formattedSeq}`;
}

/**
 * Public Endpoint: Fetch Next Deterministic Batch Number for a Commodity
 */
exports.getNextBatchNumberEndpoint = async (req, res, next) => {
  try {
    const commodityId = parseInt(req.query.commodity_id, 10) || 1;
    const nextNumber = await generateSequentialBatchNumber(commodityId);
    return res.status(200).json({
      success: true,
      commodity_id: commodityId,
      next_batch_number: nextNumber
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ingest incoming stock batch from scanned QR manifest or manual entry
 */
exports.ingestBatch = async (req, res, next) => {
  try {
    const {
      manifest_id,
      commodity_id,
      supplier_name,
      receipt_date,
      initial_qty,
      stack_location,
      status,
      batch_number: customBatchNumber
    } = req.body;

    // Strict Input Validation & Sanitization
    const parsedCommodityId = parseInt(commodity_id, 10);
    const parsedInitialQty = parseFloat(initial_qty);
    const trimmedSupplier = typeof supplier_name === 'string' ? supplier_name.trim() : '';
    const trimmedLocation = typeof stack_location === 'string' ? stack_location.trim() : '';
    const trimmedManifest = typeof manifest_id === 'string' && manifest_id.trim() ? manifest_id.trim() : null;

    if (Number.isNaN(parsedCommodityId) || parsedCommodityId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'commodity_id must be a valid positive integer.'
      });
    }

    if (!trimmedSupplier) {
      return res.status(400).json({
        success: false,
        error: 'supplier_name is mandatory and cannot be blank.'
      });
    }

    if (!trimmedLocation) {
      return res.status(400).json({
        success: false,
        error: 'stack_location is mandatory and cannot be blank.'
      });
    }

    if (Number.isNaN(parsedInitialQty) || !Number.isFinite(parsedInitialQty) || parsedInitialQty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'initial_qty must be a positive number greater than 0.'
      });
    }

    // Allocate perfect sequential batch number (or validate custom format if supplied)
    let batchNumber = (typeof customBatchNumber === 'string' && customBatchNumber.trim().startsWith('B-'))
      ? customBatchNumber.trim().toUpperCase()
      : await generateSequentialBatchNumber(parsedCommodityId);

    const effectiveDate = receipt_date && !Number.isNaN(Date.parse(receipt_date))
      ? new Date(receipt_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const allowedStatuses = ['AVAILABLE', 'QUALITY_HOLD', 'DAMAGED', 'EXHAUSTED'];
    const initialStatus = status && allowedStatuses.includes(status.trim().toUpperCase())
      ? status.trim().toUpperCase()
      : 'AVAILABLE';

    const insertQuery = `
      INSERT INTO stock_batches (
        batch_number, 
        external_manifest_id, 
        commodity_id, 
        supplier_name, 
        receipt_date, 
        initial_qty, 
        remaining_qty, 
        stack_location, 
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      batchNumber,
      trimmedManifest,
      parsedCommodityId,
      trimmedSupplier,
      effectiveDate,
      parsedInitialQty,
      trimmedLocation,
      initialStatus
    ];

    const result = await db.query(insertQuery, values);

    return res.status(201).json({
      success: true,
      message: 'Consignment successfully ingested into stock batches.',
      batch: result.rows[0]
    });
  } catch (error) {
    // Detect duplicate manifest scan via PostgreSQL unique constraint code '23505'
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Duplicate Ingestion: This e-Way Bill / Manifest has already been processed.'
      });
    }
    next(error);
  }
};

/**
 * Fetch all active batches with calculated storage age
 */
exports.getAllBatches = async (req, res, next) => {
  try {
    const { commodity_id } = req.query;

    let queryText = `
      SELECT 
        b.id,
        b.batch_number,
        b.external_manifest_id,
        b.commodity_id,
        c.name AS commodity_name,
        c.unit,
        b.supplier_name,
        b.receipt_date,
        (CURRENT_DATE - b.receipt_date) AS days_in_storage,
        b.initial_qty,
        b.remaining_qty,
        b.stack_location,
        b.status
      FROM stock_batches b
      JOIN commodities c ON b.commodity_id = c.id
      WHERE b.remaining_qty > 0
    `;

    const params = [];
    if (commodity_id && commodity_id !== 'ALL') {
      const parsedCommId = parseInt(commodity_id, 10);
      if (!Number.isNaN(parsedCommId) && parsedCommId > 0) {
        params.push(parsedCommId);
        queryText += ` AND b.commodity_id = $${params.length}`;
      }
    }

    queryText += ` ORDER BY b.commodity_id, b.receipt_date ASC;`;

    const result = await db.query(queryText, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      batches: result.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update batch status (e.g., QUALITY_HOLD or AVAILABLE)
 */
exports.updateBatchStatus = async (req, res, next) => {
  try {
    const parsedId = parseInt(req.params.id, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch ID parameter. Must be a positive integer.'
      });
    }

    const { status } = req.body;
    const allowed = ['AVAILABLE', 'QUALITY_HOLD', 'DAMAGED', 'EXHAUSTED'];
    const sanitizedStatus = typeof status === 'string' ? status.trim().toUpperCase() : '';

    if (!allowed.includes(sanitizedStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${allowed.join(', ')}`
      });
    }

    const result = await db.query(
      `UPDATE stock_batches SET status = $1 WHERE id = $2 RETURNING *;`,
      [sanitizedStatus, parsedId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Batch not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Batch status updated to ${sanitizedStatus}`,
      batch: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * FPS Reverse Logistics: Return Leftover Stock back to Central Godown
 * Ingests returned stock directly into stock_batches with sequential batch allocation,
 * generates a verified Reverse Gate Pass (RGP), and records dealer traceability.
 */
exports.returnStockToGodown = async (req, res, next) => {
  try {
    const {
      fps_id,
      fps_code,
      dealer_name,
      commodity_id,
      returned_qty,
      return_reason,
      remarks,
      vehicle_no
    } = req.body;

    const parsedCommodityId = parseInt(commodity_id, 10);
    const parsedQty = parseFloat(returned_qty);

    if (Number.isNaN(parsedCommodityId) || parsedCommodityId <= 0) {
      return res.status(400).json({ success: false, error: 'Valid commodity_id is required.' });
    }

    if (Number.isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ success: false, error: 'returned_qty must be greater than 0.' });
    }

    const batchNumber = await generateSequentialBatchNumber(parsedCommodityId);
    const commPrefix = COMMODITY_PREFIXES[parsedCommodityId] || 'GEN';
    const returnChallanNo = `RGP-${commPrefix}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const dealerLabel = dealer_name ? dealer_name.trim() : 'Authorized FPS Dealer';
    const codeLabel = fps_code ? fps_code.trim() : `FPS-${fps_id || 'LOCAL'}`;
    const supplierString = `FPS Return: ${dealerLabel} (${codeLabel})`;
    const effectiveDate = new Date().toISOString().split('T')[0];
    const stackLocation = 'Bay-Return / Shed-R';
    const status = 'AVAILABLE';

    const insertQuery = `
      INSERT INTO stock_batches (
        batch_number, 
        external_manifest_id, 
        commodity_id, 
        supplier_name, 
        receipt_date, 
        initial_qty, 
        remaining_qty, 
        stack_location, 
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      batchNumber,
      returnChallanNo,
      parsedCommodityId,
      supplierString,
      effectiveDate,
      parsedQty,
      stackLocation,
      status
    ];

    const result = await db.query(insertQuery, values);

    return res.status(201).json({
      success: true,
      message: 'Leftover stock accepted and logged into Central Godown inventory.',
      return_challan_no: returnChallanNo,
      batch: result.rows[0],
      returned_qty: parsedQty,
      return_reason: return_reason || 'END_OF_MONTH_SURPLUS',
      return_date: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};