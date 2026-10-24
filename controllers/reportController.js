// controllers/reportController.js - AnnaKram iPDS Reports & Traceability Controller
const db = require('../db');

/**
 * 1. KPI & AGING SUMMARY
 */
exports.getDashboardKPIs = async (req, res, next) => {
  try {
    // 1. Total active batches & stock sum
    const stockQuery = `
      SELECT 
        COUNT(id)::int AS total_active_batches,
        COALESCE(SUM(remaining_qty), 0)::numeric(10,2) AS total_remaining_stock,
        COUNT(CASE WHEN (CURRENT_DATE - receipt_date) > 60 THEN 1 END)::int AS critical_aging_batches
      FROM stock_batches
      WHERE remaining_qty > 0 AND status = 'AVAILABLE';
    `;
    const { rows: stockSummary } = await db.query(stockQuery);

    // 2. FIFO Compliance Rate
    const complianceQuery = `
      SELECT 
        COUNT(id)::int AS total_dispatches,
        COUNT(CASE WHEN is_override = TRUE THEN 1 END)::int AS total_overrides
      FROM dispatches;
    `;
    const { rows: compSummary } = await db.query(complianceQuery);

    const totalDispatches = compSummary[0]?.total_dispatches || 0;
    const totalOverrides = compSummary[0]?.total_overrides || 0;
    const complianceRate = totalDispatches === 0 
      ? 100.0 
      : Number((((totalDispatches - totalOverrides) / totalDispatches) * 100).toFixed(1));

    return res.status(200).json({
      success: true,
      kpis: {
        total_active_batches: stockSummary[0]?.total_active_batches || 0,
        total_remaining_stock: stockSummary[0]?.total_remaining_stock || 0,
        critical_aging_batches: stockSummary[0]?.critical_aging_batches || 0,
        total_dispatches: totalDispatches,
        total_overrides: totalOverrides,
        fifo_compliance_rate: `${complianceRate}%`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. TWO-WAY TRACEABILITY
 */
exports.getTraceability = async (req, res, next) => {
  try {
    const { batch_number, fps_code } = req.query;

    const trimmedBatch = typeof batch_number === 'string' ? batch_number.trim() : '';
    const trimmedFps = typeof fps_code === 'string' ? fps_code.trim() : '';

    if (!trimmedBatch && !trimmedFps) {
      return res.status(400).json({
        success: false,
        error: 'Provide either ?batch_number=... or ?fps_code=... for traceability.'
      });
    }

    // A. Forward Traceability: Batch -> FPS Deliveries
    if (trimmedBatch) {
      const query = `
        SELECT 
          b.batch_number,
          b.supplier_name,
          b.receipt_date,
          c.name AS commodity_name,
          d.challan_no,
          d.dispatch_date,
          di.allocated_qty,
          f.fps_code,
          f.dealer_name,
          f.location_taluka
        FROM stock_batches b
        JOIN commodities c ON b.commodity_id = c.id
        LEFT JOIN dispatch_items di ON b.id = di.batch_id
        LEFT JOIN dispatches d ON di.dispatch_id = d.id
        LEFT JOIN fps_stores f ON d.fps_id = f.id
        WHERE b.batch_number = $1
        ORDER BY d.dispatch_date DESC;
      `;
      const { rows } = await db.query(query, [trimmedBatch]);
      return res.status(200).json({ success: true, mode: 'BATCH_TO_FPS', records: rows });
    }

    // B. Reverse Traceability: FPS -> Batch Sources
    if (trimmedFps) {
      const query = `
        SELECT 
          f.fps_code,
          f.dealer_name,
          d.challan_no,
          d.dispatch_date,
          c.name AS commodity_name,
          di.allocated_qty,
          b.batch_number,
          b.supplier_name,
          b.receipt_date
        FROM fps_stores f
        JOIN dispatches d ON f.id = d.fps_id
        JOIN dispatch_items di ON d.id = di.dispatch_id
        JOIN stock_batches b ON di.batch_id = b.id
        JOIN commodities c ON b.commodity_id = c.id
        WHERE f.fps_code = $1
        ORDER BY d.dispatch_date DESC;
      `;
      const { rows } = await db.query(query, [trimmedFps]);
      return res.status(200).json({ success: true, mode: 'FPS_TO_BATCHES', records: rows });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 3. OVERRIDE AUDIT HISTORY
 */
exports.getAuditOverrides = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        o.id,
        o.recorded_at,
        d.challan_no,
        sb.batch_number AS skipped_batch,
        sel.batch_number AS selected_batch,
        o.reason_code,
        o.remarks,
        o.approved_by
      FROM fifo_overrides o
      JOIN dispatches d ON o.dispatch_id = d.id
      JOIN stock_batches sb ON o.skipped_batch_id = sb.id
      JOIN stock_batches sel ON o.selected_batch_id = sel.id
      ORDER BY o.recorded_at DESC;
    `;
    const { rows } = await db.query(query);
    return res.status(200).json({ success: true, overrides: rows });
  } catch (error) {
    next(error);
  }
};