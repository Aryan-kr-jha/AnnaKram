// public/fps.js - AnnaKram Fair Price Shop Dashboard Controller
const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '9765')
  ? 'http://localhost:9765/api'
  : '/api';
let currentFpsId = null;
let currentFpsEntity = null;

const COMMODITY_MAP = {
  1: 'Wheat (Grade A)',
  2: 'Raw Rice (Boiled)',
  3: 'Refined Sugar',
  4: 'Tuvar Dal'
};

function getDisplayCommodityName(id) {
  const lang = (typeof window.getCurrentLanguage === 'function') ? window.getCurrentLanguage() : 'en';
  const names = {
    en: { 1: 'Wheat (Grade A)', 2: 'Raw Rice (Boiled)', 3: 'Refined Sugar', 4: 'Tuvar Dal' },
    hi: { 1: 'गेहूं (ग्रेड ए)', 2: 'कच्चा चावल (उसना/उबला)', 3: 'रिफाइंड चीनी', 4: 'तूर / अरहर दाल' }
  };
  return names[lang]?.[id] || names['en'][id] || COMMODITY_MAP[id] || 'Commodity';
}

window.onAnnaKramLanguageChanged = function(lang) {
  if (typeof fetchRequisitionsAndSyncInventory === 'function') {
    fetchRequisitionsAndSyncInventory();
  }
};

/* ==========================================================================
   MODERN CUSTOM GOVTECH MODAL POPUP SYSTEM (FPS PORTAL)
   ========================================================================== */
function ensureGovModalDOM() {
  let backdrop = document.getElementById('govModalBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'govModalBackdrop';
    backdrop.className = 'gov-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.innerHTML = `
      <div class="gov-modal-card">
        <div class="gov-modal-header">
          <div class="gov-modal-icon-badge info" id="govModalIcon">ℹ️</div>
          <div class="gov-modal-title-wrap">
            <span class="gov-modal-category" id="govModalCategory">FPS OWNER PORTAL • ANNAKRAM</span>
            <h3 class="gov-modal-title" id="govModalTitle">System Notification</h3>
          </div>
          <button class="gov-modal-close-btn" id="govModalCloseBtn" aria-label="Close modal">&times;</button>
        </div>
        <div class="gov-modal-body" id="govModalBody"></div>
        <div class="gov-modal-footer" id="govModalFooter">
          <button type="button" class="gov-btn gov-btn-secondary" id="govModalCancelBtn" style="display: none;">Cancel</button>
          <button type="button" class="gov-btn gov-btn-primary" id="govModalConfirmBtn">Acknowledge</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

function showGovModal({
  title = 'System Notification',
  category = 'FPS OWNER PORTAL • ANNAKRAM',
  message = '',
  type = 'info',
  confirmText = 'Acknowledge',
  cancelText = 'Cancel',
  showCancel = false
}) {
  return new Promise((resolve) => {
    const backdrop = ensureGovModalDOM();
    const iconBadge = document.getElementById('govModalIcon');
    const titleElem = document.getElementById('govModalTitle');
    const categoryElem = document.getElementById('govModalCategory');
    const bodyElem = document.getElementById('govModalBody');
    const confirmBtn = document.getElementById('govModalConfirmBtn');
    const cancelBtn = document.getElementById('govModalCancelBtn');
    const closeBtn = document.getElementById('govModalCloseBtn');

    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '🛑', confirm: '🛡️' };
    if (iconBadge) { iconBadge.className = `gov-modal-icon-badge ${type}`; iconBadge.innerHTML = icons[type] || 'ℹ️'; }
    if (titleElem) titleElem.textContent = title;
    if (categoryElem) categoryElem.textContent = category;
    if (bodyElem) {
      if (typeof message === 'string') { bodyElem.innerHTML = message.replace(/\n/g, '<br>'); }
      else { bodyElem.textContent = String(message); }
    }
    if (confirmBtn) confirmBtn.textContent = confirmText;
    if (cancelBtn) { cancelBtn.textContent = cancelText; cancelBtn.style.display = showCancel ? 'inline-flex' : 'none'; }

    function cleanup(result) {
      backdrop.classList.remove('active');
      if (confirmBtn) confirmBtn.removeEventListener('click', onConfirm);
      if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
      if (closeBtn) closeBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeyDown);
      backdrop.removeEventListener('click', onBackdropClick);
      resolve(result);
    }

    function onConfirm() { cleanup(true); }
    function onCancel() { cleanup(false); }
    function onKeyDown(e) { if (e.key === 'Escape') cleanup(false); if (e.key === 'Enter' && !showCancel) cleanup(true); }
    function onBackdropClick(e) { if (e.target === backdrop && !showCancel) cleanup(false); }

    if (confirmBtn) confirmBtn.addEventListener('click', onConfirm);
    if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
    if (closeBtn) closeBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
    backdrop.addEventListener('click', onBackdropClick);

    backdrop.classList.add('active');
    if (confirmBtn) confirmBtn.focus();
  });
}

window.showGovAlert = function(message, title = 'System Notification', type = 'info') {
  return showGovModal({ title, message, type, confirmText: 'Acknowledge', showCancel: false });
};

window.showGovConfirm = function(message, title = 'Action Confirmation Required', type = 'confirm') {
  return showGovModal({ title, message, type, confirmText: 'Confirm & Proceed', cancelText: 'Cancel', showCancel: true });
};

window.alert = function(msg) {
  let type = 'info';
  let title = 'System Notification';
  const str = String(msg || '');
  const lower = str.toLowerCase();
  if (lower.includes('success') || lower.includes('confirmed') || lower.includes('transmitted')) { type = 'success'; title = 'Submission Successful'; }
  else if (lower.includes('error') || lower.includes('fail') || lower.includes('reject')) { type = 'error'; title = 'System Notice / Error'; }
  else if (lower.includes('warn') || lower.includes('please') || lower.includes('greater')) { type = 'warning'; title = 'Input Validation'; }
  return showGovAlert(str, title, type);
};

window.confirm = function(msg) {
  return showGovConfirm(String(msg || ''), 'Action Confirmation Required', 'confirm');
};

document.addEventListener('DOMContentLoaded', async () => {
  /* ==========================================================================
     PROTECTED ROUTE GUARD: SUPABASE AUTH CHECK & SESSION VALIDATION
     ========================================================================== */
  const sb = (typeof window.getSupabaseClient === 'function')
    ? await window.getSupabaseClient()
    : (window.supabaseClient || null);

  let session = null;
  if (sb && sb.auth) {
    try {
      const { data, error } = await sb.auth.getSession();
      if (!error && data?.session) {
        session = data.session;
      }
    } catch (err) {
      console.warn('[AUTH GUARD] Supabase session retrieval notice:', err);
    }
  }

  const sessionData = sessionStorage.getItem('ipds_auth_user');

  // Route Guard: If neither active Supabase session nor session storage exists, kick to login.html
  if (!session && !sessionData) {
    window.location.replace('login.html');
    return;
  }

  let currentUser = null;
  if (session?.user) {
    const meta = session.user.user_metadata || {};
    currentUser = {
      name: meta.name || session.user.email?.split('@')[0] || 'Ramesh Kumar Verma',
      email: session.user.email,
      role: meta.role || 'FPS Owner',
      entity_id: meta.entity_id || 'FPS-NOD-101',
      fps_id: meta.fps_id || 1
    };
  } else if (sessionData) {
    try {
      currentUser = JSON.parse(sessionData);
    } catch (e) {
      currentUser = { name: 'Ramesh Kumar Verma', role: 'FPS Owner', entity_id: 'FPS-NOD-101', fps_id: 1 };
    }
  }

  // Dynamic FPS ID Mapping based on authenticated account
  function resolveFpsId(user) {
    if (user?.fps_id) return Number(user.fps_id);
    const ent = String(user?.entity_id || '').toUpperCase();
    if (ent.includes('101')) return 1;
    if (ent.includes('204')) return 2;
    if (ent.includes('305')) return 3;
    const str = user?.email || ent || '1';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
    return (Math.abs(hash) % 3) + 1;
  }

  currentFpsId = resolveFpsId(currentUser);
  currentFpsEntity = currentUser?.entity_id || `FPS-NOD-10${currentFpsId}`;

  const fpsName = currentUser?.name || 'Ramesh Kumar Verma';
  const fpsEmail = currentUser?.email || 'dealer@ipds.gov.in';

  if (document.getElementById('profileDisplayName')) {
    document.getElementById('profileDisplayName').textContent = fpsName;
  }
  if (document.getElementById('profileDisplayEmail')) {
    document.getElementById('profileDisplayEmail').textContent = fpsEmail;
  }
  if (document.getElementById('avatarInitials')) {
    document.getElementById('avatarInitials').textContent = fpsName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  document.getElementById('fpsLicenseText').textContent = `${currentFpsEntity} • Reg: UP West`;

  initUI(sb);
  fetchRequisitionsAndSyncInventory();
});

/* ==========================================================================
   UI CONTROLS
   ========================================================================== */
function initUI(sb) {
  setInterval(() => {
    const now = new Date();
    document.getElementById('liveTime').textContent = now.toLocaleTimeString('en-IN', { hour12: false });
    document.getElementById('liveDate').textContent = now.toLocaleDateString('en-IN', { dateStyle: 'medium' });
  }, 1000);

  const now = new Date();
  document.getElementById('reqMonth').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const pMenu = document.getElementById('profileMenu');
  document.getElementById('profileButton').addEventListener('click', (e) => {
    e.stopPropagation();
    pMenu.classList.toggle('show');
  });
  document.addEventListener('click', () => pMenu.classList.remove('show'));

  // Mobile Drawer Toggle & Backdrop for FPS Portal
  const fpsSidebarToggle = document.getElementById('fpsSidebarToggle');
  const fpsSidebar = document.getElementById('sidebar');
  const fpsSidebarBackdrop = document.getElementById('fpsSidebarBackdrop');

  const closeFpsMobileSidebar = () => {
    if (fpsSidebar && fpsSidebar.classList.contains('mobile-open')) {
      fpsSidebar.classList.remove('mobile-open');
    }
    if (fpsSidebarBackdrop && fpsSidebarBackdrop.classList.contains('active')) {
      fpsSidebarBackdrop.classList.remove('active');
    }
  };

  if (fpsSidebarToggle && fpsSidebar) {
    fpsSidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      fpsSidebar.classList.toggle('mobile-open');
      if (fpsSidebarBackdrop) {
        fpsSidebarBackdrop.classList.toggle('active', fpsSidebar.classList.contains('mobile-open'));
      }
    });
  }

  if (fpsSidebarBackdrop) {
    fpsSidebarBackdrop.addEventListener('click', () => {
      closeFpsMobileSidebar();
    });
  }

  const logoutBtn = document.getElementById('logoutButton');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        if (sb && sb.auth) {
          await sb.auth.signOut();
        }
      } catch (err) {
        console.warn('[AUTH] Error during Supabase signOut:', err);
      }
      sessionStorage.clear();
      window.location.replace('login.html');
    });
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
      
      const target = e.currentTarget;
      target.classList.add('active');
      document.getElementById(`view-${target.dataset.view}`).classList.add('active');
      
      let title = 'Dashboard';
      if(target.dataset.view === 'requests') title = 'Complete Indent History';
      if(target.dataset.view === 'inventory') title = 'Live Shop Inventory';
      if(target.dataset.view === 'returns') title = 'Return Leftover Stock to Godown';
      document.getElementById('pageTitle').textContent = title;

      // Close mobile drawer on item select
      if (window.innerWidth <= 768) {
        closeFpsMobileSidebar();
      }
    });
  });

  document.getElementById('indentForm').addEventListener('submit', handleIndentSubmission);
  const returnForm = document.getElementById('returnStockForm');
  if (returnForm) {
    returnForm.addEventListener('submit', handleReturnStockSubmission);
  }
}

/* ==========================================================================
   API FETCH: REQUISITIONS & LIVE INVENTORY SYNC (ACCOUNT ISOLATED)
   ========================================================================== */
window.currentShopInventory = { 1: 0, 2: 0, 3: 0, 4: 0 };

async function fetchRequisitionsAndSyncInventory() {
  const historyBody = document.getElementById('fullHistoryTableBody');
  const inventoryBody = document.getElementById('inventoryTableBody');
  
  // Read account-isolated requisitions from namespaced storage
  const localReqs = (typeof window.getAccountData === 'function') 
    ? window.getAccountData('fps_requisitions', []) 
    : [];

  let reqs = [...localReqs];

  try {
    const res = await fetch(`${API_BASE}/requests?fps_id=${currentFpsId}&t=${Date.now()}`, { cache: 'no-store' });
    const data = await res.json();

    if (data.success && Array.isArray(data.requests)) {
      const localIds = new Set(localReqs.map(r => r.id || r.request_code));
      data.requests.forEach(r => {
        if (!localIds.has(r.id) && !localIds.has(r.request_code)) {
          reqs.push(r);
        }
      });
    }
  } catch (err) {
    console.info('[SYNC] Using account local ledger sync:', err.message);
  }

  // Update statistics
  document.getElementById('statPending').textContent = reqs.filter(r => r.status === 'PENDING').length;
  document.getElementById('statTransit').textContent = reqs.filter(r => r.status === 'DISPATCHED_IN_TRANSIT').length;
  document.getElementById('statDelivered').textContent = reqs.filter(r => r.status === 'DELIVERED').length;

  // 1. Render History Table
  if (reqs.length === 0) {
    historyBody.innerHTML = `<tr><td colspan="7" class="empty-state">No requisitions submitted for this account yet.</td></tr>`;
  } else {
    historyBody.innerHTML = reqs.map(r => renderRow(r)).join('');
  }

  // 2. Compute Total Delivered Stock for THIS Account
  const liveInventory = { 1: 0, 2: 0, 3: 0, 4: 0 };
  reqs.forEach(r => {
    if (r.status === 'DELIVERED' && r.commodity_id) {
      liveInventory[r.commodity_id] += Number(r.demanded_qty);
    }
  });

  // 3. Deduct Returned Stock from Live Inventory
  const localReturns = (typeof window.getAccountData === 'function')
    ? window.getAccountData('fps_returns', [])
    : [];

  localReturns.forEach(ret => {
    const cid = Number(ret.commodity_id);
    if (liveInventory[cid] !== undefined) {
      liveInventory[cid] = Math.max(0, Number((liveInventory[cid] - Number(ret.returned_qty)).toFixed(2)));
    }
  });

  window.currentShopInventory = liveInventory;

  // 4. Render Live Inventory Table with Reverse Logistics Action Button
  const inventoryHtml = Object.keys(liveInventory).map(commId => {
    const qty = liveInventory[commId];
    const hasStock = qty > 0;
    return `
      <tr>
        <td style="font-weight: 900; font-size: 16px;">${getDisplayCommodityName(commId)}</td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 900; color: var(--primary); font-size: 30px;">
          ${qty.toFixed(2)} <span style="font-size: 18px; color: var(--text-muted);">Qtl</span>
        </td>
        <td style="text-align: center;">
          ${hasStock
            ? `<button type="button" class="action-btn-return" onclick="navigateToReturnView(${commId})">${(typeof window.getI18nText === 'function') ? window.getI18nText('btnReturnToGodownAction') : '🔄 Return to Godown'}</button>`
            : `<span style="font-size: 13px; color: var(--text-muted); font-weight: 700;">${(typeof window.getI18nText === 'function') ? window.getI18nText('noFloorBalance') : 'No floor balance'}</span>`
          }
        </td>
      </tr>
    `;
  }).join('');
  
  inventoryBody.innerHTML = inventoryHtml;

  // 5. Render Returns History Ledger
  renderReturnsHistoryTable();

  // 6. Refresh return form helper hints if populated
  handleReturnCommodityChange();
}

function renderRow(r) {
  const isTransit = r.status === 'DISPATCHED_IN_TRANSIT';
  const isDelivered = r.status === 'DELIVERED';
  
  let badgeClass = 'bg-warning';
  let statusText = 'PENDING GODOWN';
  if (isTransit) { badgeClass = 'bg-transit'; statusText = 'IN TRANSIT'; }
  if (isDelivered) { badgeClass = 'bg-success'; statusText = 'DELIVERED'; }

  let actionHtml = '--';
  if (isTransit) {
    actionHtml = `<button class="action-btn" onclick="acknowledgeReceipt(${r.id}, this)">Receive Stock</button>`;
  } else if (isDelivered) {
    actionHtml = `<span style="font-family:var(--font-mono); font-weight:900; color:var(--success-txt);">${r.challan_no}</span>`;
  }

  return `
    <tr>
      <td style="color: var(--primary); font-weight: 900;">${r.request_code}</td>
      <td style="color: var(--text-muted);">${new Date(r.created_at).toLocaleDateString()}</td>
      <td style="font-weight: 900;">${r.commodity_name}</td>
      <td style="font-family:var(--font-mono); font-weight:900; font-size: 18px;">${r.demanded_qty} Qtl</td>
      <td style="font-weight: 800;">${r.urgency_level}</td>
      <td><span class="status-badge ${badgeClass}">${statusText}</span></td>
      <td>${actionHtml}</td>
    </tr>
  `;
}

/* ==========================================================================
   API POST: SUBMIT INDENT
   ========================================================================== */
async function handleIndentSubmission(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitIndent');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Transmitting...';

  const urgency = document.getElementById('urgencyLevel').value;
  const remarks = document.getElementById('reqRemarks').value.trim();
  
  const payloads = [];
  [1, 2, 3, 4].forEach(commId => {
    const qty = parseFloat(document.getElementById(`qty-${commId}`).value) || 0;
    if (qty > 0) {
      payloads.push({
        fps_id: Number(currentFpsId),
        commodity_id: commId,
        demanded_qty: qty,
        urgency_level: urgency,
        remarks: remarks
      });
    }
  });

  if (payloads.length === 0) {
    alert("Please enter a quantity greater than 0 for at least one commodity.");
    btn.textContent = 'Submit Requisition';
    btn.disabled = false;
    return;
  }

  try {
    const responses = await Promise.all(payloads.map(p =>
      fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      })
    ));

    // Save to account-isolated storage so this account retains its private history
    if (typeof window.getAccountData === 'function') {
      const localReqs = window.getAccountData('fps_requisitions', []);
      payloads.forEach((p, idx) => {
        localReqs.unshift({
          id: Date.now() + idx,
          request_code: `IND-${Math.floor(100000 + Math.random() * 900000)}`,
          created_at: new Date().toISOString(),
          commodity_id: p.commodity_id,
          commodity_name: COMMODITY_MAP[p.commodity_id],
          demanded_qty: p.demanded_qty,
          urgency_level: p.urgency_level,
          status: 'PENDING',
          remarks: p.remarks
        });
      });
      window.saveAccountData('fps_requisitions', localReqs);
    }

    const allOk = responses.every(res => res.ok);

    if (allOk) {
      alert('Stock Indent transmitted successfully to AnnaKram Godown.');
      document.getElementById('indentForm').reset();
      fetchRequisitionsAndSyncInventory();
    } else {
      alert('Indent recorded into your local account ledger.');
      document.getElementById('indentForm').reset();
      fetchRequisitionsAndSyncInventory();
    }
  } catch (err) {
    // If backend request errors, still save to account isolated ledger
    if (typeof window.getAccountData === 'function') {
      const localReqs = window.getAccountData('fps_requisitions', []);
      payloads.forEach((p, idx) => {
        localReqs.unshift({
          id: Date.now() + idx,
          request_code: `IND-${Math.floor(100000 + Math.random() * 900000)}`,
          created_at: new Date().toISOString(),
          commodity_id: p.commodity_id,
          commodity_name: COMMODITY_MAP[p.commodity_id],
          demanded_qty: p.demanded_qty,
          urgency_level: p.urgency_level,
          status: 'PENDING',
          remarks: p.remarks
        });
      });
      window.saveAccountData('fps_requisitions', localReqs);
    }
    alert('Stock Indent recorded successfully in your offline account ledger.');
    document.getElementById('indentForm').reset();
    fetchRequisitionsAndSyncInventory();
  } finally {
    btn.textContent = 'Submit Requisition';
    btn.disabled = false;
  }
}

/* ==========================================================================
   API PATCH: ACKNOWLEDGE RECEIPT
   ========================================================================== */
window.acknowledgeReceipt = async function(requestId, btnElement) {
  if (!confirm('Confirm physical stock delivery? This verifies arrival and updates your live inventory.')) return;

  // Resolve clicked button and parent cell
  const btn = btnElement || (typeof event !== 'undefined' ? event.target : null) || document.querySelector(`button[onclick*="acknowledgeReceipt(${requestId}"]`);
  const cell = btn ? btn.parentElement : null;
  const originalHtml = btn ? btn.outerHTML : '';

  // Optimistic UI: Immediately replace button with green DELIVERED badge
  if (cell) {
    cell.innerHTML = `<span class="status-badge bg-success" style="font-weight:900;">DELIVERED</span>`;
  }

  // Update account-isolated requisition state
  if (typeof window.getAccountData === 'function') {
    const localReqs = window.getAccountData('fps_requisitions', []);
    const target = localReqs.find(r => r.id === requestId);
    if (target) {
      target.status = 'DELIVERED';
      target.challan_no = `CH-${Math.floor(10000000 + Math.random() * 90000000)}`;
      window.saveAccountData('fps_requisitions', localReqs);
    }
  }

  try {
    const res = await fetch(`${API_BASE}/requests/${requestId}/acknowledge`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await res.json();
    if (res.ok && data.success) {
      fetchRequisitionsAndSyncInventory(); 
    } else {
      fetchRequisitionsAndSyncInventory(); 
    }
  } catch (err) {
    fetchRequisitionsAndSyncInventory(); 
  }
};

/* ==========================================================================
   REVERSE LOGISTICS: RETURN LEFTOVER STOCK TO CENTRAL GODOWN
   ========================================================================== */

window.navigateToReturnView = function(commodityId) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));

  const returnsBtn = document.getElementById('navBtnReturns') || document.querySelector('.nav-btn[data-view="returns"]');
  if (returnsBtn) returnsBtn.classList.add('active');

  const returnsView = document.getElementById('view-returns');
  if (returnsView) returnsView.classList.add('active');

  document.getElementById('pageTitle').textContent = 'Return Leftover Stock to Godown';

  if (commodityId) {
    const commSelect = document.getElementById('returnCommoditySelect');
    if (commSelect) {
      commSelect.value = String(commodityId);
      window.handleReturnCommodityChange();
    }
    const qtyInput = document.getElementById('returnQtyInput');
    if (qtyInput) {
      qtyInput.focus();
    }
  }
};

window.handleReturnCommodityChange = function() {
  const commSelect = document.getElementById('returnCommoditySelect');
  const hint = document.getElementById('availableStockHint');
  const qtyInput = document.getElementById('returnQtyInput');
  if (!commSelect || !hint) return;

  const commId = commSelect.value;
  if (!commId) {
    hint.textContent = 'Available on floor: 0.00 Qtl';
    if (qtyInput) qtyInput.removeAttribute('max');
    window.updateReturnSummary();
    return;
  }

  const available = window.currentShopInventory ? (Number(window.currentShopInventory[commId]) || 0) : 0;
  hint.textContent = `Available on floor: ${available.toFixed(2)} Qtl (${COMMODITY_MAP[commId]})`;
  if (qtyInput) {
    qtyInput.max = available;
  }
  window.updateReturnSummary();
};

window.updateReturnSummary = function() {
  const commSelect = document.getElementById('returnCommoditySelect');
  const qtyInput = document.getElementById('returnQtyInput');
  const calcCard = document.getElementById('returnCalculationCard');
  if (!commSelect || !qtyInput || !calcCard) return;

  const commId = commSelect.value;
  const qty = parseFloat(qtyInput.value) || 0;

  if (!commId || qty <= 0) {
    calcCard.style.display = 'none';
    return;
  }

  const available = window.currentShopInventory ? (Number(window.currentShopInventory[commId]) || 0) : 0;
  const remaining = available - qty;

  calcCard.style.display = 'flex';
  document.getElementById('calcCurrentStock').textContent = `${available.toFixed(2)} Qtl`;
  document.getElementById('calcReturningQty').textContent = `- ${qty.toFixed(2)} Qtl`;

  const remElem = document.getElementById('calcRemainingStock');
  if (remaining < 0) {
    remElem.textContent = `EXCEEDS AVAILABLE STOCK (${remaining.toFixed(2)} Qtl)`;
    remElem.style.color = '#DC2626';
  } else {
    remElem.textContent = `${remaining.toFixed(2)} Qtl`;
    remElem.style.color = 'var(--primary)';
  }
};

window.resetReturnForm = function() {
  const form = document.getElementById('returnStockForm');
  if (form) form.reset();
  const hint = document.getElementById('availableStockHint');
  if (hint) hint.textContent = 'Available on floor: 0.00 Qtl';
  const calcCard = document.getElementById('returnCalculationCard');
  if (calcCard) calcCard.style.display = 'none';
};

window.handleReturnStockSubmission = async function(e) {
  if (e && e.preventDefault) e.preventDefault();

  const btn = document.getElementById('btnSubmitReturn');
  if (btn && btn.disabled) return;

  const commSelect = document.getElementById('returnCommoditySelect');
  const qtyInput = document.getElementById('returnQtyInput');
  const reasonSelect = document.getElementById('returnReasonSelect');
  const vehicleInput = document.getElementById('returnVehicleInput');
  const remarksInput = document.getElementById('returnRemarksInput');

  const commId = parseInt(commSelect.value, 10);
  const qty = parseFloat(qtyInput.value) || 0;
  const reason = reasonSelect.value;
  const vehicle = vehicleInput.value.trim() || 'FCI Reverse Logistics Depot Carrier';
  const remarks = remarksInput.value.trim();

  if (!commId || Number.isNaN(commId)) {
    showGovAlert('Please select a valid commodity to return.', 'Input Required', 'warning');
    return;
  }

  if (qty <= 0) {
    showGovAlert('Please enter a return quantity greater than 0 Quintals.', 'Validation Error', 'warning');
    return;
  }

  const available = window.currentShopInventory ? (Number(window.currentShopInventory[commId]) || 0) : 0;
  if (qty > available) {
    showGovAlert(`The specified return quantity (${qty.toFixed(2)} Qtl) exceeds your physical on-floor inventory (${available.toFixed(2)} Qtl).`, 'Stock Limit Exceeded', 'error');
    return;
  }

  const commName = COMMODITY_MAP[commId];
  const confirmMsg = `Confirm transmitting ${qty.toFixed(2)} Qtl of ${commName} back to Central Warehousing Godown?\n\nThis will generate an official Reverse Gate Pass (RGP) and deduct the stock from your shop floor inventory.`;

  const confirmed = await showGovConfirm(confirmMsg, 'Confirm Reverse Consignment', 'confirm');
  if (!confirmed) return;

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Transmitting Return Manifest...';
  }

  let gatePassNo = `RGP-${commId === 1 ? 'WHT' : commId === 2 ? 'RIC' : commId === 3 ? 'SUG' : 'DAL'}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  let allocatedBatchNo = `B-RET-${Date.now().toString().slice(-6)}`;

  const resolvedFpsCode = (typeof currentFpsEntity === 'string' ? currentFpsEntity : currentFpsEntity?.fps_code) || 'FPS-NOD-101';
  const resolvedDealer = (typeof currentFpsEntity === 'object' && currentFpsEntity?.dealer_name) || currentUser?.name || 'Ramesh Kumar Verma';

  try {
    const res = await fetch(`${API_BASE}/batches/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fps_id: Number(currentFpsId) || 1,
        fps_code: resolvedFpsCode,
        dealer_name: resolvedDealer,
        commodity_id: commId,
        returned_qty: qty,
        return_reason: reason,
        remarks: remarks,
        vehicle_no: vehicle
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      gatePassNo = data.return_challan_no || gatePassNo;
      allocatedBatchNo = data.batch?.batch_number || allocatedBatchNo;
    }
  } catch (err) {
    console.info('[SYNC] Inward return recorded in storage sync:', err.message);
  }

  const newReturnBatch = {
    id: Date.now(),
    batch_number: allocatedBatchNo,
    external_manifest_id: gatePassNo,
    commodity_id: commId,
    commodity_name: commName,
    supplier_name: `FPS Return: ${resolvedDealer} (${resolvedFpsCode})`,
    receipt_date: new Date().toISOString().split('T')[0],
    initial_qty: qty,
    remaining_qty: qty,
    days_in_storage: 0,
    stack_location: 'Bay-Return / Shed-R',
    status: 'AVAILABLE'
  };

  // Save to account-isolated returns ledger
  if (typeof window.getAccountData === 'function') {
    const localReturns = window.getAccountData('fps_returns', []);
    localReturns.unshift({
      id: Date.now(),
      gate_pass_no: gatePassNo,
      allocated_batch_no: allocatedBatchNo,
      created_at: new Date().toISOString(),
      commodity_id: commId,
      commodity_name: commName,
      returned_qty: qty,
      return_reason: reason,
      vehicle_no: vehicle,
      remarks: remarks,
      status: 'INGESTED_AT_GODOWN'
    });
    window.saveAccountData('fps_returns', localReturns);

    // Also mirror to godown batches so if godown is inspected under same account it is present
    const godownBatches = window.getAccountData('godown_batches', []);
    godownBatches.unshift(newReturnBatch);
    window.saveAccountData('godown_batches', godownBatches);
  }

  // Global shared storage across all accounts and Central Dashboard
  try {
    const globalBatches = JSON.parse(localStorage.getItem('annakram_global_godown_batches') || '[]');
    globalBatches.unshift(newReturnBatch);
    localStorage.setItem('annakram_global_godown_batches', JSON.stringify(globalBatches));

    // Real-time notification trigger for Central Dashboard in other tabs/windows
    localStorage.setItem('annakram_stock_update_trigger', Date.now().toString());
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('annakram_inventory_channel');
      bc.postMessage({ type: 'STOCK_RETURNED', commodity_id: commId, qty: qty, time: Date.now() });
      bc.close();
    }
  } catch (e) {
    console.warn('[BROADCAST] Error signaling stock return:', e);
  }

  // Re-sync physical inventory and history tables
  await fetchRequisitionsAndSyncInventory();
  window.resetReturnForm();

  if (btn) {
    btn.disabled = false;
    btn.textContent = '🔄 Transmit Return & Generate Gate Pass';
  }

  // Show Success Modal with Gate Pass Details
  await showGovModal({
    title: 'Reverse Gate Pass Issued',
    type: 'success',
    confirmText: 'Print / View Challan',
    message: `
      <strong>Stock Successfully Dispatched to Central Godown!</strong><br><br>
      • <strong>Reverse Gate Pass:</strong> <span style="font-family: var(--font-mono); font-weight: 800; color: #C2410C;">${gatePassNo}</span><br>
      • <strong>Allocated Godown Batch:</strong> <span style="font-family: var(--font-mono); font-weight: 800;">${allocatedBatchNo}</span><br>
      • <strong>Commodity:</strong> ${commName}<br>
      • <strong>Quantity Returned:</strong> <strong>${qty.toFixed(2)} Quintals</strong><br>
      • <strong>Carrier Vehicle:</strong> ${vehicle}<br>
      • <strong>Audit Status:</strong> Ingested into Central Godown Storage (Bay-Return / Shed-R).<br><br>
      <em>Your shop floor inventory has been automatically adjusted.</em>
    `
  });

  window.viewReturnGatePassModal(gatePassNo);
};

window.renderReturnsHistoryTable = function() {
  const tableBody = document.getElementById('returnsHistoryTableBody');
  if (!tableBody) return;

  const localReturns = (typeof window.getAccountData === 'function')
    ? window.getAccountData('fps_returns', [])
    : [];

  if (localReturns.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No stock return consignments logged yet for this shop.</td></tr>`;
    return;
  }

  const reasonLabels = {
    'END_OF_MONTH_SURPLUS': 'End-of-Month Surplus',
    'QUALITY_DEGRADATION_MOISTURE': 'Moisture / Lab Inspection',
    'SHOP_RENOVATION_TEMPORARY': 'Depot Space Maintenance',
    'ALLOTMENT_ADJUSTMENT': 'Quota Re-alignment',
    'DAMAGED_BAGS_INSPECTION': 'Bag Tear / Gate Inspection',
    'OTHER': 'Operational Return'
  };

  tableBody.innerHTML = localReturns.map(ret => `
    <tr>
      <td><span class="reverse-gatepass-pill">${ret.gate_pass_no}</span></td>
      <td style="color: var(--text-muted); font-size: 14px;">${new Date(ret.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
      <td style="font-weight: 900;">${ret.commodity_name}</td>
      <td style="font-family: var(--font-mono); font-weight: 900; font-size: 18px; color: #C2410C;">${Number(ret.returned_qty).toFixed(2)} Qtl</td>
      <td style="font-size: 13px; font-weight: 800; color: var(--text-muted);">${reasonLabels[ret.return_reason] || ret.return_reason}</td>
      <td><span class="status-badge bg-success" style="font-size: 12px; font-weight: 900;">INGESTED AT GODOWN</span></td>
      <td>
        <button type="button" class="gov-btn-outline" style="padding: 6px 12px; font-size: 13px; font-weight: 800;" onclick="viewReturnGatePassModal('${ret.gate_pass_no}')">
          📄 View Gate Pass
        </button>
      </td>
    </tr>
  `).join('');
};

window.viewReturnGatePassModal = function(gatePassNo) {
  const localReturns = (typeof window.getAccountData === 'function')
    ? window.getAccountData('fps_returns', [])
    : [];

  const ret = localReturns.find(r => r.gate_pass_no === gatePassNo) || {
    gate_pass_no: gatePassNo,
    created_at: new Date().toISOString(),
    commodity_name: 'Wheat (Grade A)',
    returned_qty: 10,
    vehicle_no: 'FCI Depot Logistics',
    return_reason: 'END_OF_MONTH_SURPLUS',
    allocated_batch_no: 'B-WHT-2026-005',
    remarks: 'Approved by FPS Dealer'
  };

  const html = `
    <div style="background: #FFFFFF; border: 2px solid var(--secondary); border-radius: 8px; padding: 18px; font-family: var(--font-sans);">
      <div style="text-align: center; border-bottom: 2px solid var(--primary); padding-bottom: 10px; margin-bottom: 12px;">
        <span style="font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: var(--primary); text-transform: uppercase;">GOVERNMENT OF INDIA • PUBLIC DISTRIBUTION SYSTEM</span>
        <h3 style="font-size: 18px; font-weight: 900; color: #1E293B; margin: 4px 0;">STATUTORY REVERSE GATE PASS (RGP)</h3>
        <span style="font-size: 12px; font-weight: 700; color: var(--text-muted);">Stock Return &amp; Warehousing Consignment Pass</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 13px;">
        <div><strong>Pass Number:</strong> <span style="font-family: var(--font-mono); font-weight: 800; color: #C2410C;">${ret.gate_pass_no}</span></div>
        <div><strong>Issue Date:</strong> ${new Date(ret.created_at).toLocaleString('en-IN')}</div>
        <div><strong>Origin FPS:</strong> Sector 12, Noida (FPS-NOD-101)</div>
        <div><strong>Destination:</strong> Central Godown (Return Bay R-01)</div>
        <div><strong>Dealer Licensee:</strong> Ramesh Kumar Verma</div>
        <div><strong>Carrier Vehicle:</strong> ${ret.vehicle_no || 'FCI Carrier'}</div>
      </div>

      <div style="background: var(--bg-canvas); border: 1.5px solid var(--border); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="font-size: 15px; color: var(--primary);">${ret.commodity_name}</strong>
            <div style="font-size: 12px; color: var(--text-muted); font-weight: 700; margin-top: 2px;">Godown Inward Batch: <code>${ret.allocated_batch_no || 'B-RET'}</code></div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 11px; font-weight: 800; color: var(--text-muted); display: block;">NET RETURN WEIGHT</span>
            <strong style="font-family: var(--font-mono); font-size: 22px; color: #C2410C;">${Number(ret.returned_qty).toFixed(2)} Qtl</strong>
          </div>
        </div>
      </div>

      <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5; border-top: 1px dashed var(--border); padding-top: 10px;">
        <strong>Audit Declaration:</strong> This certifies that the above consignment was returned in sealed condition by the licensed FPS dealer. The stock has been safely accepted and credited back into the Central Warehousing Godown reserve.
      </div>
    </div>
  `;

  showGovModal({
    title: `Reverse Gate Pass: ${ret.gate_pass_no}`,
    type: 'confirm',
    confirmText: 'Print Pass',
    cancelText: 'Close',
    showCancel: true,
    message: html
  }).then(shouldPrint => {
    if (shouldPrint) {
      window.print();
    }
  });
};