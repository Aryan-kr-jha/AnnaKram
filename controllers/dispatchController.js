// controllers/dispatchController.js - AnnaKram iPDS Inventory Dispatch & Allocation Engine
const db = require('../db');
const { analyzeAllocationRisk } = require('../services/airiskChecker');

/**
 * 1. FIFO PREVIEW (Read-Only)
 * Given commodity_id and required_qty, calculates the chronological batch split
 * according to First-In, First-Out (FIFO) rules.
 */
exports.previewFIFOAllocation = async (req, res, next) => {
  try {
    const { commodity_id, required_qty } = req.body;

    // Strict input validation & sanitization
    const parsedCommodityId = parseInt(commodity_id, 10);
    const targetQty = parseFloat(required_qty);

    if (Number.isNaN(parsedCommodityId) || parsedCommodityId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid commodity_id (must be a positive integer).'
      });
    }

    if (Number.isNaN(targetQty) || !Number.isFinite(targetQty) || targetQty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid required_qty (must be a positive number greater than 0).'
      });
    }

    // Fetch active, available batches sorted chronologically (FIFO order)
    const batchesQuery = `
      SELECT 
        b.id,
        b.batch_number,
        b.receipt_date,
        (CURRENT_DATE - b.receipt_date) AS days_in_storage,
        b.remaining_qty,
        b.stack_location,
        b.supplier_name
      FROM stock_batches b
      WHERE b.commodity_id = $1 
        AND b.remaining_qty > 0 
        AND b.status = 'AVAILABLE'
      ORDER BY b.receipt_date ASC, b.id ASC;
    `;

    const { rows: batches } = await db.query(batchesQuery, [parsedCommodityId]);

    // Calculate total available stock across all eligible batches
    const totalAvailable = batches.reduce((sum, b) => sum + Number(b.remaining_qty), 0);

    if (totalAvailable < targetQty) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock. Requested: ${targetQty} Qtl, Available: ${totalAvailable} Qtl.`,
        available_stock: totalAvailable
      });
    }

    // FIFO Auto-Split Loop
    let qtyStillNeeded = targetQty;
    const allocations = [];

    for (const batch of batches) {
      if (qtyStillNeeded <= 0) break;

      const availableInBatch = Number(batch.remaining_qty);
      const pickQty = Math.min(availableInBatch, qtyStillNeeded);

      allocations.push({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        receipt_date: batch.receipt_date,
        days_in_storage: Number(batch.days_in_storage) || 0,
        stack_location: batch.stack_location,
        supplier_name: batch.supplier_name,
        allocated_qty: Number(pickQty.toFixed(2)),
        remaining_after_pick: Number((availableInBatch - pickQty).toFixed(2))
      });

      qtyStillNeeded -= pickQty;
    }

    // Context for AI Risk Checker
    const maxStorageDays = allocations.length > 0 
      ? Math.max(...allocations.map(a => a.days_in_storage))
      : 0;
    const totalRemainingAfter = Number((totalAvailable - targetQty).toFixed(2));

    const commRes = await db.query('SELECT name FROM commodities WHERE id = $1', [parsedCommodityId]);
    const commodityName = commRes.rows[0]?.name || 'Commodity';

    // Call Gemini AI Risk Checker with built-in safety and fallback
    let aiRiskAssessment = null;
    try {
      aiRiskAssessment = await analyzeAllocationRisk({
        commodityName,
        requestedQty: targetQty,
        totalRemainingStock: totalRemainingAfter,
        allocations,
        daysInStorageMax: maxStorageDays
      });
    } catch (aiErr) {
      console.warn('[AI ADVISORY WARNING]:', aiErr.message);
      aiRiskAssessment = {
        risk_level: 'MODERATE',
        risk_summary: 'Algorithmic allocation verified. AI advisory service temporarily unavailable.',
        flags: ['Manual verification of physical bags recommended'],
        recommended_action: 'Proceed with standard physical inspection.'
      };
    }

    return res.status(200).json({
      success: true,
      mode: 'STANDARD_FIFO',
      total_requested: targetQty,
      batches_used_count: allocations.length,
      allocations,
      ai_risk_assessment: aiRiskAssessment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. TRANSACTIONAL DISPATCH CONFIRMATION (ACID Transaction)
 * Atomically deducts inventory from locked batches, creates master dispatch,
 * line items, logs overrides if applicable, and optionally links/fulfills requisition.
 */
exports.confirmDispatch = async (req, res, next) => {
  // Step 1: Input Validation & Sanitization BEFORE acquiring database connection
  const {
    fps_id,
    commodity_id,
    total_qty,
    allocations,
    is_override,
    override_reason,
    override_remarks,
    approved_by,
    requisition_id,
    request_id
  } = req.body;

  const parsedFpsId = parseInt(fps_id, 10);
  const parsedCommodityId = parseInt(commodity_id, 10);
  const parsedTotalQty = parseFloat(total_qty);

  if (Number.isNaN(parsedFpsId) || parsedFpsId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid fps_id: must be a positive integer.'
    });
  }

  if (Number.isNaN(parsedCommodityId) || parsedCommodityId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid commodity_id: must be a positive integer.'
    });
  }

  if (Number.isNaN(parsedTotalQty) || !Number.isFinite(parsedTotalQty) || parsedTotalQty <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid total_qty: must be a positive number greater than 0.'
    });
  }

  if (!Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid allocations: must provide a non-empty array of batch allocations.'
    });
  }

  // Validate each allocation item and compute sum
  let allocationSum = 0;
  const sanitizedAllocations = [];

  for (let i = 0; i < allocations.length; i++) {
    const item = allocations[i];
    const bId = parseInt(item.batch_id, 10);
    const qty = parseFloat(item.qty);

    if (Number.isNaN(bId) || bId <= 0) {
      return res.status(400).json({
        success: false,
        error: `Allocation item at index ${i} has an invalid batch_id (must be a positive integer).`
      });
    }

    if (Number.isNaN(qty) || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        error: `Allocation item at index ${i} has an invalid qty (must be a positive number).`
      });
    }

    allocationSum += qty;
    sanitizedAllocations.push({ batch_id: bId, qty: Number(qty.toFixed(2)) });
  }

  // Cross-check allocation sum with total_qty (allowing 0.01 floating-point variance)
  if (Math.abs(allocationSum - parsedTotalQty) > 0.01) {
    return res.status(400).json({
      success: false,
      error: `Sum of allocation quantities (${allocationSum.toFixed(2)}) does not match total_qty (${parsedTotalQty.toFixed(2)}).`
    });
  }

  const isOverrideBool = Boolean(is_override);
  const sanitizedOverrideReason = typeof override_reason === 'string' ? override_reason.trim() : '';
  const sanitizedOverrideRemarks = typeof override_remarks === 'string' ? override_remarks.trim() : '';
  const sanitizedApprovedBy = typeof approved_by === 'string' && approved_by.trim() 
    ? approved_by.trim() 
    : 'Godown Operator';

  if (isOverrideBool && (!sanitizedOverrideReason || !sanitizedOverrideRemarks || !approved_by)) {
    return res.status(400).json({
      success: false,
      error: 'Audit compliance failure: Override reason, remarks, and approving authority are mandatory.'
    });
  }

  // Optional target requisition to fulfill atomically in the same transaction
  const targetRequisitionId = parseInt(requisition_id || request_id, 10);
  const hasRequisitionLink = !Number.isNaN(targetRequisitionId) && targetRequisitionId > 0;

  // Step 2: Acquire Dedicated Client from Pool for Atomic Transaction
  const client = await db.pool.connect();

  try {
    // BEGIN ACID Transaction
    await client.query('BEGIN');

    // 1. Lock candidate batch rows FOR UPDATE to eliminate concurrency race conditions
    const batchIds = sanitizedAllocations.map(a => a.batch_id);
    const lockQuery = `
      SELECT id, remaining_qty, status 
      FROM stock_batches 
      WHERE id = ANY($1::int[]) 
      FOR UPDATE;
    `;
    const { rows: lockedBatches } = await client.query(lockQuery, [batchIds]);
    const lockedBatchMap = new Map(lockedBatches.map(b => [b.id, Number(b.remaining_qty)]));

    // 2. Validate stock sufficiency on locked rows and deduct atomically
    for (const item of sanitizedAllocations) {
      const currentBalance = lockedBatchMap.get(item.batch_id);

      if (currentBalance === undefined) {
        throw new Error(`Batch ID ${item.batch_id} not found in active inventory.`);
      }

      if (currentBalance < item.qty) {
        throw new Error(
          `Stock mismatch on Batch ID ${item.batch_id}. Requested: ${item.qty}, Available: ${currentBalance}`
        );
      }

      const newRemaining = Number((currentBalance - item.qty).toFixed(2));
      const newStatus = newRemaining === 0 ? 'EXHAUSTED' : 'AVAILABLE';

      await client.query(
        `UPDATE stock_batches 
         SET remaining_qty = $1, status = $2 
         WHERE id = $3;`,
        [newRemaining, newStatus, item.batch_id]
      );
    }

    // 3. Generate unique Delivery Challan Number
    const challanNo = `CH-${Date.now().toString().slice(-8)}`;

    // 4. Create Master Dispatch Record
    const dispatchInsert = `
      INSERT INTO dispatches (challan_no, fps_id, commodity_id, total_qty, is_override, dispatched_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const dispatchResult = await client.query(dispatchInsert, [
      challanNo,
      parsedFpsId,
      parsedCommodityId,
      parsedTotalQty,
      isOverrideBool,
      sanitizedApprovedBy
    ]);
    const dispatchRecord = dispatchResult.rows[0];

    // 5. Insert Dispatch Line Items
    for (const item of sanitizedAllocations) {
      await client.query(
        `INSERT INTO dispatch_items (dispatch_id, batch_id, allocated_qty)
         VALUES ($1, $2, $3);`,
        [dispatchRecord.id, item.batch_id, item.qty]
      );
    }

    // 6. Record FIFO Exception Audit if overridden
    if (isOverrideBool) {
      const oldestQuery = `
        SELECT id FROM stock_batches 
        WHERE commodity_id = $1 AND remaining_qty > 0 AND status = 'AVAILABLE'
        ORDER BY receipt_date ASC, id ASC LIMIT 1;
      `;
      const oldestRes = await client.query(oldestQuery, [parsedCommodityId]);
      const skippedBatchId = oldestRes.rows[0] ? oldestRes.rows[0].id : sanitizedAllocations[0].batch_id;

      await client.query(
        `INSERT INTO fifo_overrides (dispatch_id, skipped_batch_id, selected_batch_id, reason_code, remarks, approved_by)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          dispatchRecord.id,
          skippedBatchId,
          sanitizedAllocations[0].batch_id,
          sanitizedOverrideReason,
          sanitizedOverrideRemarks,
          sanitizedApprovedBy
        ]
      );
    }

    // 7. Atomic Multi-Step Operation: If linked to a requisition, fulfill it in the exact same transaction
    if (hasRequisitionLink) {
      await client.query(
        `UPDATE fps_requisitions
         SET 
           status = 'DISPATCHED_IN_TRANSIT', 
           challan_no = $1, 
           updated_at = NOW()
         WHERE id = $2;`,
        [challanNo, targetRequisitionId]
      );
    }

    // COMMIT Transaction - All updates persist atomically
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Dispatch confirmed and inventory deducted atomically.',
      challan: dispatchRecord,
      allocations: sanitizedAllocations
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[DB ROLLBACK ERROR in confirmDispatch]:', rollbackError.message);
    }
    next(error);
  } finally {
    // Guaranteed Client Release prevents connection leaks
    client.release();
  }
};