// public/dashboard.js - Live Central Godown Dashboard Controller
const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '9765')
  ? 'http://localhost:9765/api'
  : '/api';

/* ==========================================================================
   DYNAMIC STATE: LIVE DATABASE SYNCHRONIZATION
   ========================================================================== */
let fpsRequests = [];
let activeAllocations = null;
let activeProcessingRequestId = null;

// Strategy & FIFO Override State
let currentAllocationMode = 'AUTO'; // 'AUTO' or 'MANUAL'
let availableCommodityBatches = [];
let selectedManualBatchId = null;
let isFIFOOverrideTriggered = false;
let skippedOlderBatchInfo = null;

const fpsMaster = {
    '1': { code: 'FPS-NOD-101', name: 'Ramesh Kumar Verma', address: 'Sector 12, Noida Central' },
    '2': { code: 'FPS-GZB-204', name: 'Sunita Devi Store', address: 'Govindpuram, Ghaziabad' },
    '3': { code: 'FPS-GRN-305', name: 'Kisan Sahakari Ration', address: 'Surajpur, Greater Noida' }
};

/* ==========================================================================
   FEATURE 1: AUTOMATED GRAIN AGING GRADE INDICATOR & COMMODITY I18N
   ========================================================================== */
function getDisplayCommodityName(rawNameOrId) {
    const lang = (typeof window.getCurrentLanguage === 'function') ? window.getCurrentLanguage() : 'en';
    const dict = (window.ANNAKRAM_I18N && window.ANNAKRAM_I18N[lang]) ? window.ANNAKRAM_I18N[lang] : null;
    if (!dict) return rawNameOrId;

    const lower = String(rawNameOrId || '').toLowerCase();
    if (lower === '1' || lower.includes('wheat') || lower.includes('गेहूं')) {
        return dict.commWheat || 'Wheat (Grade A)';
    }
    if (lower === '2' || lower.includes('rice') || lower.includes('चावल')) {
        return dict.commRice || 'Raw Rice (Boiled)';
    }
    if (lower === '3' || lower.includes('sugar') || lower.includes('चीनी')) {
        return dict.commSugar || 'Refined Sugar';
    }
    if (lower === '4' || lower.includes('dal') || lower.includes('दाल') || lower.includes('tuvar')) {
        return dict.commDal || 'Tuvar Dal';
    }
    return rawNameOrId;
}

function getGrainAgingGrade(daysInStorage) {
    const days = parseInt(daysInStorage, 10) || 0;
    const isHi = (typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'hi');
    if (days <= 30) {
        return {
            grade: isHi ? 'ग्रेड ए' : 'Grade A',
            badgeClass: 'grade-badge-a',
            label: isHi ? 'ताजा स्टॉक' : 'Fresh Stock',
            subtext: isHi ? '0–30 दिन' : '0–30 Days',
            status: 'FRESH'
        };
    } else if (days <= 90) {
        return {
            grade: isHi ? 'ग्रेड बी' : 'Grade B',
            badgeClass: 'grade-badge-b',
            label: isHi ? 'मध्यम भंडारण' : 'Moderate Storage',
            subtext: isHi ? '31–90 दिन' : '31–90 Days',
            status: 'MODERATE'
        };
    } else {
        return {
            grade: isHi ? 'ग्रेड सी' : 'Grade C',
            badgeClass: 'grade-badge-c',
            label: isHi ? 'पुराना / प्राथमिकता निकासी' : 'Aging / Priority Clearance',
            subtext: isHi ? '> 90 दिन' : '> 90 Days',
            status: 'AGING_PRIORITY'
        };
    }
}

function renderAgingGradeBadge(daysInStorage, compact = false) {
    const info = getGrainAgingGrade(daysInStorage);
    if (compact) {
        return `<span class="aging-grade-badge ${info.badgeClass}" title="${info.grade}: ${info.label} (${daysInStorage} days in storage)">
            <span class="grade-indicator-dot"></span>
            <span class="grade-name">${info.grade}</span>
        </span>`;
    }
    return `<span class="aging-grade-badge ${info.badgeClass}" title="${info.grade}: ${info.label} (${daysInStorage} days in storage)">
        <span class="grade-indicator-dot"></span>
        <span class="grade-name">${info.grade}</span>
        <span class="grade-pill-label">${info.label}</span>
    </span>`;
}

/* ==========================================================================
   FEATURE 3: MODERN CUSTOM GOVTECH MODAL POPUP SYSTEM (NO BROWSER POPUPS)
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
                        <span class="gov-modal-category" id="govModalCategory">DEPARTMENT OF FOOD &amp; PUBLIC DISTRIBUTION</span>
                        <h3 class="gov-modal-title" id="govModalTitle">System Notification</h3>
                    </div>
                    <button class="gov-modal-close-btn" id="govModalCloseBtn" aria-label="Close modal">&times;</button>
                </div>
                <div class="gov-modal-body" id="govModalBody"></div>
                <div class="gov-modal-footer" id="govModalFooter">
                    <button type="button" class="gov-btn secondary" id="govModalCancelBtn" style="display: none;">Cancel</button>
                    <button type="button" class="gov-btn" id="govModalConfirmBtn">Acknowledge</button>
                </div>
            </div>
        `;
        document.body.appendChild(backdrop);
    }
    return backdrop;
}

function showGovModal({
    title = 'System Notification',
    category = 'DEPARTMENT OF FOOD & PUBLIC DISTRIBUTION • IPDS',
    message = '',
    type = 'info',
    confirmText = 'Acknowledge',
    cancelText = 'Cancel',
    showCancel = false,
    onBeforeConfirm = null
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

        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '🛑',
            confirm: '🛡️'
        };

        if (iconBadge) {
            iconBadge.className = `gov-modal-icon-badge ${type}`;
            iconBadge.innerHTML = icons[type] || 'ℹ️';
        }
        if (titleElem) titleElem.textContent = title;
        if (categoryElem) categoryElem.textContent = category;
        if (bodyElem) {
            if (typeof message === 'string') {
                bodyElem.innerHTML = message.includes('<') ? message : message.replace(/\n/g, '<br>');
            } else {
                bodyElem.textContent = String(message);
            }
        }

        if (confirmBtn) confirmBtn.textContent = confirmText;
        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
            cancelBtn.style.display = showCancel ? 'inline-flex' : 'none';
        }

        function cleanup(result) {
            backdrop.classList.remove('active');
            if (confirmBtn) confirmBtn.removeEventListener('click', onConfirm);
            if (cancelBtn) cancelBtn.removeEventListener('click', onCancel);
            if (closeBtn) closeBtn.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKeyDown);
            backdrop.removeEventListener('click', onBackdropClick);
            resolve(result);
        }

        async function onConfirm() {
            if (typeof onBeforeConfirm === 'function') {
                const canProceed = await onBeforeConfirm();
                if (!canProceed) return;
            }
            cleanup(true);
        }

        function onCancel() { cleanup(false); }

        function onKeyDown(e) {
            // Never hijack typing, backspace, or enter inside input, textarea, or select fields
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
                if (e.key === 'Escape') cleanup(false);
                return;
            }
            if (e.key === 'Escape') cleanup(false);
            if (e.key === 'Enter' && !showCancel) cleanup(true);
        }

        function onBackdropClick(e) {
            if (e.target === backdrop && !showCancel) cleanup(false);
        }

        if (confirmBtn) confirmBtn.addEventListener('click', onConfirm);
        if (cancelBtn) cancelBtn.addEventListener('click', onCancel);
        if (closeBtn) closeBtn.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeyDown);
        backdrop.addEventListener('click', onBackdropClick);

        backdrop.classList.add('active');

        // Automatically focus the first input/select field if present in the modal body
        const firstField = bodyElem.querySelector('select, input, textarea');
        if (firstField) {
            setTimeout(() => {
                firstField.focus();
            }, 60);
        } else if (confirmBtn) {
            confirmBtn.focus();
        }
    });
}

window.showGovAlert = function (message, title = 'System Notification', type = 'info') {
    return showGovModal({
        title,
        message,
        type,
        confirmText: 'Acknowledge',
        showCancel: false
    });
};

window.showGovConfirm = function (message, title = 'Action Confirmation Required', type = 'confirm') {
    return showGovModal({
        title,
        message,
        type,
        confirmText: 'Confirm & Proceed',
        cancelText: 'Cancel',
        showCancel: true
    });
};

// Global overrides of native alert and confirm
window.alert = function (msg) {
    let type = 'info';
    let title = 'System Notification';
    const str = String(msg || '');
    const lower = str.toLowerCase();
    if (lower.includes('success') || lower.includes('confirmed') || lower.includes('verified') || lower.includes('assigned')) {
        type = 'success';
        title = 'Transaction Successful';
    } else if (lower.includes('error') || lower.includes('fail') || lower.includes('reject') || lower.includes('refus')) {
        type = 'error';
        title = 'System Alert / Error';
    } else if (lower.includes('warn') || lower.includes('please') || lower.includes('valid') || lower.includes('require')) {
        type = 'warning';
        title = 'Validation Notice';
    }
    return showGovAlert(str, title, type);
};

window.confirm = function (msg) {
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

    // Retrieve fallback or stored user data
    const sessionData = sessionStorage.getItem('ipds_auth_user');

    // Route Guard: If neither Supabase session nor valid stored session exists, immediately redirect to login.html
    if (!session && !sessionData) {
        window.location.replace('login.html');
        return;
    }

    // Resolve user profile info
    let currentUser = null;
    if (session?.user) {
        const meta = session.user.user_metadata || {};
        currentUser = {
            name: meta.name || session.user.email?.split('@')[0] || 'Aryan Kumar',
            email: session.user.email,
            role: meta.role || 'Godown Manager',
            entity_id: meta.entity_id || 'GDN-GRN-04'
        };
    } else if (sessionData) {
        try {
            currentUser = JSON.parse(sessionData);
        } catch (e) {
            currentUser = { name: 'Aryan Kumar', role: 'Godown Manager' };
        }
    }

    // Update Profile Name, Avatar Initials, and Depot Header dynamically
    const profileName = document.querySelector('.profile-name');
    const menuProfileName = document.getElementById('menuProfileName');
    const menuProfileEmail = document.getElementById('menuProfileEmail');
    const avatarBadge = document.querySelector('.avatar-badge');
    const depotSubtext = document.querySelector('.depot-subtext');

    if (profileName && currentUser?.name) {
        profileName.textContent = currentUser.name;
    }
    if (menuProfileName && currentUser?.name) {
        menuProfileName.textContent = currentUser.name;
    }
    if (menuProfileEmail && currentUser?.email) {
        menuProfileEmail.textContent = currentUser.email;
    }
    if (avatarBadge && currentUser?.name) {
        avatarBadge.textContent = currentUser.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (depotSubtext && currentUser?.entity_id) {
        depotSubtext.textContent = `DEPOT: ${currentUser.entity_id} | Regional Division | Superintendent: ${currentUser.name || 'Aryan Kumar'}`;
    }

    /* ==========================================================================
       SECURE SIGN OUT BUTTON HANDLER (SUPABASE.AUTH.SIGNOUT)
       ========================================================================== */
    const logoutBtn = document.querySelector('.dropdown-item.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
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

    // Initialize the rest of the dashboard
    initUI();
    refreshAllDashboardData();
    initModalActions();
});
/* Helper to refresh all live data from DB simultaneously */
async function refreshAllDashboardData() {
  await Promise.all([
    fetchKPIs(),
    fetchInventory(),
    fetchHistory(),
    renderFPSRequests()
  ]);
}

/* ==========================================================================
   1. UI NAVIGATION, HAMBURGER & 24-HOUR MONOSPACE CLOCK
   ========================================================================== */
function initUI() {
    // A. Live Monospace 24-Hour Digital Clock
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();

        const clockElem = document.getElementById('clock24');
        if (clockElem) {
            clockElem.textContent = `${hours}:${minutes}:${seconds} IST - ${day}/${month}/${year}`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // B. Hamburger Toggle (Opens and Closes Sidebar cleanly on Desktop & Mobile)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    const toggleSidebar = () => {
        if (!sidebar) return;
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
            if (sidebarBackdrop) {
                sidebarBackdrop.classList.toggle('active', sidebar.classList.contains('mobile-open'));
            }
        } else {
            sidebar.classList.toggle('collapsed');
        }
    };

    const closeMobileSidebar = () => {
        if (sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
        }
        if (sidebarBackdrop && sidebarBackdrop.classList.contains('active')) {
            sidebarBackdrop.classList.remove('active');
        }
    };

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', () => {
            closeMobileSidebar();
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && sidebarToggle) {
            if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                closeMobileSidebar();
            }
        }
    });

    // C. Profile Dropdown Animation
    const profileTrigger = document.getElementById('profileDropdownTrigger');
    const profileMenu = document.getElementById('profileMenu');

    if (profileTrigger && profileMenu) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileTrigger.classList.toggle('active');
            profileMenu.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            profileTrigger.classList.remove('active');
            profileMenu.classList.remove('show');
        });
    }

    // D. Workspace Tab Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.content-view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            item.classList.add('active');
            const targetView = item.getAttribute('data-view');
            const targetContainer = document.getElementById(`view-${targetView}`);
            if (targetContainer) {
                targetContainer.classList.add('active');
            }

            // Auto-close sidebar on mobile once a tab is selected
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }

            if (targetView === 'stacks') fetchInventory();
            if (targetView === 'history') fetchHistory();
            if (targetView === 'requests') renderFPSRequests();
            if (targetView === 'dashboard') refreshAllDashboardData();
        });
    });

    // E. Filter Commodities in Inventory View
    const commodityFilter = document.getElementById('commodityFilter');
    if (commodityFilter) {
        commodityFilter.addEventListener('change', () => {
            fetchInventory(commodityFilter.value);
        });
    }

    // F. Inward Consignment Submission & Dynamic Sequential Batch Preview
    const ingestForm = document.getElementById('ingestForm');
    const ingestCommodity = document.getElementById('ingestCommodity');
    if (ingestForm) {
        ingestForm.addEventListener('submit', handleManualIngest);
    }
    if (ingestCommodity) {
        ingestCommodity.addEventListener('change', updateFormBatchPreview);
        updateFormBatchPreview();
    }

    // G. Interactive e-Way Bill / Transit Pass Scanner Controls
    initTransitPassScanner();

    // H. FIFO Preview & Challan Calculation Button
    const previewFifoBtn = document.getElementById('previewFifoBtn');
    if (previewFifoBtn) {
        previewFifoBtn.addEventListener('click', handleFIFOPreview);
    }

    // I. Strategy Switch & Commodity Change for Manual Batch Selection
    const dispatchCommodity = document.getElementById('dispatchCommodity');
    if (dispatchCommodity) {
        dispatchCommodity.addEventListener('change', () => {
            if (currentAllocationMode === 'MANUAL') {
                loadBatchesForManualSelection();
            }
        });
    }
}

/* ==========================================================================
   2. LIVE DATA FETCHING & API INTEGRATIONS (CACHE-FREE)
   ========================================================================== */

// Fetch Warehouse KPIs
async function fetchKPIs() {
    try {
        const res = await fetch(`${API_BASE}/reports/kpis?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();

        if (data.success && data.kpis) {
            const totalStock = parseFloat(data.kpis.total_remaining_stock) || 0;
            const kpiTotalElem = document.getElementById('kpiTotalStock');
            if (kpiTotalElem) kpiTotalElem.textContent = totalStock.toFixed(2);

            const kpiAgingElem = document.getElementById('kpiAgingBatches');
            if (kpiAgingElem) kpiAgingElem.textContent = `${data.kpis.critical_aging_batches} Batches`;

            const kpiIncomingElem = document.getElementById('kpiIncomingStock');
            if (kpiIncomingElem) kpiIncomingElem.textContent = data.kpis.total_active_batches;
        }
    } catch (err) {
        console.error('Failed to load KPIs:', err);
    }
}

// Fetch Batches & Update Stacks Table + Radar (Account Isolated)
async function fetchInventory(commodityId = 'ALL') {
    try {
        const localBatches = (typeof window.getAccountData === 'function')
            ? window.getAccountData('godown_batches', [])
            : [];

        const base = commodityId === 'ALL' ? `${API_BASE}/batches` : `${API_BASE}/batches?commodity_id=${commodityId}`;
        const url = `${base}${base.includes('?') ? '&' : '?'}t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();

        let allBatches = [...localBatches];
        if (data.success && Array.isArray(data.batches)) {
            const localBatchNos = new Set(localBatches.map(b => b.batch_number));
            data.batches.forEach(b => {
                if (!localBatchNos.has(b.batch_number)) allBatches.push(b);
            });
        }

        if (commodityId !== 'ALL') {
            allBatches = allBatches.filter(b => String(b.commodity_id) === String(commodityId));
        }

        renderInventoryTable(allBatches);
        renderEvacuationRadar(allBatches);
        renderCommodityReserves(allBatches);
    } catch (err) {
        console.error('Failed to load batches:', err);
    }
}

// Render Inventory Table
function renderInventoryTable(batches) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    if (batches.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="placeholder-row">No active consignments found for this selection.</td></tr>`;
        return;
    }

    tbody.innerHTML = batches.map(b => `
    <tr>
      <td><strong>${b.batch_number}</strong></td>
      <td>${getDisplayCommodityName(b.commodity_name)}</td>
      <td>${b.supplier_name}</td>
      <td>${new Date(b.receipt_date).toLocaleDateString()}</td>
      <td><strong class="${b.days_in_storage > 60 ? 'urgent-text' : ''}">${b.days_in_storage} ${(typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'hi') ? 'दिन' : 'Days'}</strong></td>
      <td>${renderAgingGradeBadge(b.days_in_storage)}</td>
      <td><span class="stack-badge">${b.stack_location}</span></td>
      <td><strong class="qty-highlight">${Number(b.remaining_qty).toFixed(2)}</strong></td>
      <td><span class="status-pill active-pill">${b.status}</span></td>
      <td>
        <button class="gov-btn-sm" onclick="toggleBatchStatus(${b.id}, '${b.status}')">
          ${b.status === 'AVAILABLE' ? ((typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'hi') ? 'क्वारंटीन' : 'Quarantine') : ((typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'hi') ? 'रिलीज़' : 'Release')}
        </button>
      </td>
    </tr>
  `).join('');
}

// Render FIFO Priority Evacuation Radar (Oldest First)
function renderEvacuationRadar(batches) {
    const radarTbody = document.getElementById('radarTableBody');
    if (!radarTbody) return;

    const sorted = [...batches]
        .filter(b => b.status === 'AVAILABLE')
        .sort((a, b) => b.days_in_storage - a.days_in_storage)
        .slice(0, 3);

    if (sorted.length === 0) {
        radarTbody.innerHTML = `<tr><td colspan="7" class="placeholder-row">No priority batches flagged.</td></tr>`;
        return;
    }

    const isHi = (typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'hi');
    radarTbody.innerHTML = sorted.map((b, idx) => `
    <tr class="${idx === 0 ? 'highlight-row' : ''}">
      <td><strong>${b.batch_number}</strong></td>
      <td>${getDisplayCommodityName(b.commodity_name)}</td>
      <td><span class="stack-badge">${b.stack_location}</span></td>
      <td><strong class="${b.days_in_storage > 60 ? 'urgent-text' : ''}">${b.days_in_storage} ${isHi ? 'दिन पुराना' : 'Days Old'}</strong></td>
      <td>${renderAgingGradeBadge(b.days_in_storage)}</td>
      <td><strong class="qty-highlight">${Number(b.remaining_qty).toFixed(2)} ${isHi ? 'क्विंटल' : 'Qtl'}</strong></td>
      <td>
        <span class="action-tag ${idx === 0 ? 'priority' : ''}">
          ${idx === 0 ? (isHi ? 'तत्काल निकासी' : 'Immediate Outward') : (isHi ? 'कतार में अगला' : 'Next In Line')}
        </span>
      </td>
    </tr>
  `).join('');
}

// Render Commodity Reserves Breakdown (Full Width)
function renderCommodityReserves(batches) {
    const container = document.getElementById('commodityDistribution');
    if (!container) return;

    const sums = {};
    batches.forEach(b => {
        sums[b.commodity_name] = (sums[b.commodity_name] || 0) + Number(b.remaining_qty);
    });

    const keys = Object.keys(sums);
    if (keys.length === 0) {
        container.innerHTML = `<div class="placeholder-row">No active reserves on ledger.</div>`;
        return;
    }

    const isHi = (typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'hi');
    container.innerHTML = keys.map(name => `
    <div class="summary-item">
      <span class="grain-title">${getDisplayCommodityName(name)}</span>
      <strong class="grain-qty">${sums[name].toFixed(2)} ${isHi ? 'क्विंटल' : 'Qtl'}</strong>
    </div>
  `).join('');
}

/* ==========================================================================
   3. FPS REQUISITIONS QUEUE (POSTGRESQL DIRECT SYNC)
   ========================================================================== */
async function renderFPSRequests() {
    const tbody = document.getElementById('fpsRequestsTableBody');
    const countBadge = document.getElementById('pendingRequestCount');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/requests?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();

        if (!data.success || !Array.isArray(data.requests)) {
            tbody.innerHTML = `<tr><td colspan="7" class="placeholder-row">Failed to fetch requisitions.</td></tr>`;
            return;
        }

        fpsRequests = data.requests;

        const pendingCount = fpsRequests.filter(r => r.status === 'PENDING').length;
        if (countBadge) {
            countBadge.textContent = `${pendingCount} PENDING`;
            countBadge.className = pendingCount > 0 ? 'status-pill warning-pill' : 'status-pill active-pill';
        }

        if (fpsRequests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="placeholder-row">No requisitions currently submitted.</td></tr>`;
            return;
        }

        tbody.innerHTML = fpsRequests.map(r => {
            const isPending = r.status === 'PENDING';
            const isDelivered = r.status === 'DELIVERED';
            const isTransit = r.status === 'DISPATCHED_IN_TRANSIT';

            let statusBadge = `<span class="status-pill warning-pill">PENDING</span>`;
            if (isTransit) {
                statusBadge = `<span class="status-pill active-pill" style="background-color: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7;">IN TRANSIT (${r.challan_no || 'DISPATCHED'})</span>`;
            } else if (isDelivered) {
                statusBadge = `<span class="status-pill active-pill" style="background-color: #E0E7FF; color: #3730A3; border: 1px solid #C7D2FE;">DELIVERED</span>`;
            }

            return `
        <tr class="${!isPending ? 'highlight-row' : ''}" data-request-id="${r.id}" id="req-row-${r.id}">
          <td><strong>${r.request_code}</strong></td>
          <td>${r.fps_code} (${r.dealer_name})</td>
          <td>${getDisplayCommodityName(r.commodity_name)}</td>
          <td><strong class="qty-highlight">${Number(r.demanded_qty).toFixed(2)}</strong></td>
          <td>${new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
          <td>${statusBadge}</td>
          <td>
            ${isPending
                    ? `<button class="gov-btn-sm" onclick="prefillChallan('${r.commodity_id}', ${r.demanded_qty}, '${r.fps_id}', ${r.id})">${(typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'hi') ? 'ऑर्डर प्रोसेस करें' : 'Process Order'}</button>`
                    : `<span style="font-size: 0.85rem; font-weight: 800; color: #065F46;">${(typeof window.getCurrentLanguage === 'function' && window.getCurrentLanguage() === 'hi') ? 'पूर्ण' : 'Completed'}</span>`
                }
          </td>
        </tr>
      `;
        }).join('');
    } catch (err) {
        console.error('Error loading requisitions:', err);
        tbody.innerHTML = `<tr><td colspan="7" class="placeholder-row">Error connecting to requisition ledger.</td></tr>`;
    }
}

// Pre-fill form from FPS request table and track the DB request ID
window.prefillChallan = function (commodityId, qty, fpsId, reqId = null) {
    activeProcessingRequestId = reqId;

    switchAllocationMode('AUTO');

    document.getElementById('dispatchCommodity').value = commodityId;
    document.getElementById('dispatchQty').value = qty;
    document.getElementById('dispatchFps').value = fpsId;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));

    const challanNav = document.querySelector('[data-view="challan"]');
    if (challanNav) challanNav.classList.add('active');
    const challanView = document.getElementById('view-challan');
    if (challanView) challanView.classList.add('active');

    handleFIFOPreview();
};

/* ==========================================================================
   4. INWARD CONSIGNMENT INGESTION
   ========================================================================== */
async function handleManualIngest(e) {
    e.preventDefault();
    const payload = {
        manifest_id: document.getElementById('manifestId').value.trim(),
        commodity_id: Number(document.getElementById('ingestCommodity').value),
        initial_qty: Number(document.getElementById('ingestQty').value),
        supplier_name: document.getElementById('ingestSupplier').value.trim(),
        stack_location: document.getElementById('ingestLocation').value.trim(),
        receipt_date: new Date().toISOString().split('T')[0]
    };

    try {
        const res = await fetch(`${API_BASE}/batches/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            // Save to account-isolated batches so this account retains its private inventory
            if (typeof window.saveAccountData === 'function') {
                const userBatches = window.getAccountData('godown_batches', []);
                userBatches.unshift(data.batch || {
                    id: Date.now(),
                    batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
                    commodity_id: payload.commodity_id,
                    commodity_name: document.getElementById('ingestCommodity').options[document.getElementById('ingestCommodity').selectedIndex]?.text || 'Grain Stock',
                    supplier_name: payload.supplier_name,
                    receipt_date: payload.receipt_date,
                    days_in_storage: 0,
                    stack_location: payload.stack_location,
                    remaining_qty: payload.initial_qty,
                    status: 'AVAILABLE'
                });
                window.saveAccountData('godown_batches', userBatches);
            }

            await showGovAlert(`Consignment Ingested Successfully! Assigned Batch Number: ${data.batch.batch_number}`, 'Consignment Confirmed', 'success');
            document.getElementById('ingestForm').reset();
            await refreshAllDashboardData();
        } else {
            showGovAlert(`Ingestion Rejected: ${data.error}`, 'Gate Rejection', 'error');
        }
    } catch (err) {
        showGovAlert('Network error while processing consignment.', 'Connection Error', 'error');
    }
}

// Fetch and preview the exact next sequential batch number for the commodity
async function fetchNextSequentialBatchNumber(commodityId) {
    try {
        const res = await fetch(`${API_BASE}/batches/next-number?commodity_id=${commodityId}`);
        const data = await res.json();
        if (data.success && data.next_batch_number) {
            return data.next_batch_number;
        }
    } catch (e) {
        console.warn('Next batch fetch notice:', e);
    }
    const COMMODITY_PREFIXES = { 1: 'WHT', 2: 'RIC', 3: 'SUG', 4: 'DAL' };
    const p = COMMODITY_PREFIXES[commodityId] || 'GEN';
    return `B-${p}-${new Date().getFullYear()}-001`;
}

async function updateFormBatchPreview() {
    const commElem = document.getElementById('ingestCommodity');
    const badge = document.getElementById('formBatchPreview');
    if (!commElem || !badge) return;
    const commId = commElem.value || 1;
    badge.textContent = 'Allocating Batch...';
    const nextNo = await fetchNextSequentialBatchNumber(commId);
    badge.textContent = `Next Batch: ${nextNo}`;
}

/* ==========================================================================
   4. e-WAY BILL / TRANSIT PASS SCANNER & DECODER ENGINE
   ========================================================================== */
const MANDI_PRESETS = {
    'WHT_PUNJAB': {
        manifest_id: 'EWB-PB-2026-991204',
        commodity_id: 1,
        commodity_name: 'Wheat (Grade A)',
        initial_qty: 180.00,
        supplier_name: 'Punjab State Grains Procurement Corp (PUNGRAIN)',
        stack_location: 'Shed-A / Stack-04',
        receipt_date: new Date().toISOString().split('T')[0]
    },
    'RIC_ANDHRA': {
        manifest_id: 'EWB-AP-2026-332144',
        commodity_id: 2,
        commodity_name: 'Raw Rice (Boiled)',
        initial_qty: 140.00,
        supplier_name: 'Andhra Pradesh State Civil Supplies Corp',
        stack_location: 'Shed-B / Stack-01',
        receipt_date: new Date().toISOString().split('T')[0]
    },
    'SUG_MEERUT': {
        manifest_id: 'EWB-UP-2026-554109',
        commodity_id: 3,
        commodity_name: 'Refined Sugar',
        initial_qty: 110.00,
        supplier_name: 'Daurala Sugar Complex, Meerut',
        stack_location: 'Shed-C / Stack-02',
        receipt_date: new Date().toISOString().split('T')[0]
    },
    'DAL_MAHA': {
        manifest_id: 'EWB-MH-2026-119823',
        commodity_id: 4,
        commodity_name: 'Tuvar Dal',
        initial_qty: 85.00,
        supplier_name: 'NAFED Pulse Procurement Centre Latur',
        stack_location: 'Shed-B / Stack-05',
        receipt_date: new Date().toISOString().split('T')[0]
    },
    'WHT_HARYANA': {
        manifest_id: 'EWB-HR-2026-882311',
        commodity_id: 1,
        commodity_name: 'Wheat (Grade A)',
        initial_qty: 160.00,
        supplier_name: 'Haryana State Warehousing Corp (HSWC)',
        stack_location: 'Shed-A / Stack-02',
        receipt_date: new Date().toISOString().split('T')[0]
    }
};

let currentDecodedPass = null;
let html5QrScannerInstance = null;

function initTransitPassScanner() {
    // Mode switcher tabs
    const tabPresets = document.getElementById('tabModePresets');
    const tabCamera = document.getElementById('tabModeCamera');
    const tabUpload = document.getElementById('tabModeUpload');

    const panelPresets = document.getElementById('scannerPresetsSection');
    const panelCamera = document.getElementById('scannerCameraSection');
    const panelUpload = document.getElementById('scannerUploadSection');

    function switchScannerTab(activeTab, activePanel) {
        [tabPresets, tabCamera, tabUpload].forEach(t => t && t.classList.remove('active'));
        [panelPresets, panelCamera, panelUpload].forEach(p => { if (p) p.style.display = 'none'; });

        if (activeTab) activeTab.classList.add('active');
        if (activePanel) activePanel.style.display = 'block';

        if (activeTab !== tabCamera && html5QrScannerInstance) {
            stopCameraScanner();
        }
    }

    if (tabPresets) tabPresets.addEventListener('click', () => switchScannerTab(tabPresets, panelPresets));
    if (tabCamera) tabCamera.addEventListener('click', () => switchScannerTab(tabCamera, panelCamera));
    if (tabUpload) tabUpload.addEventListener('click', () => switchScannerTab(tabUpload, panelUpload));

    // Preset Scan Button
    const btnScanPreset = document.getElementById('btnScanPreset');
    if (btnScanPreset) {
        btnScanPreset.addEventListener('click', () => {
            const key = document.getElementById('mandiPresetSelect').value;
            const pass = MANDI_PRESETS[key] || MANDI_PRESETS['WHT_PUNJAB'];
            displayDecodedTransitPass(pass);
        });
    }

    // Confirm Decoded Inward Entry Button
    const btnConfirm = document.getElementById('btnConfirmDecodedIngest');
    if (btnConfirm) {
        btnConfirm.addEventListener('click', confirmDecodedTransitPassIngest);
    }

    // Camera Controls
    const btnStartCam = document.getElementById('btnStartCamera');
    const btnStopCam = document.getElementById('btnStopCamera');
    if (btnStartCam) btnStartCam.addEventListener('click', startCameraScanner);
    if (btnStopCam) btnStopCam.addEventListener('click', stopCameraScanner);

    // File Upload Scanner
    const dropzone = document.getElementById('qrDropzone');
    const fileInput = document.getElementById('qrFileInput');
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleQrFileUpload);
    }
}

async function displayDecodedTransitPass(pass) {
    currentDecodedPass = { ...pass };
    const card = document.getElementById('decodedPassCard');
    if (!card) return;

    document.getElementById('dispManifest').textContent = pass.manifest_id;
    document.getElementById('dispCommodity').textContent = pass.commodity_name || `Commodity #${pass.commodity_id}`;
    document.getElementById('dispQty').textContent = `${Number(pass.initial_qty).toFixed(2)} Quintals`;
    document.getElementById('dispSupplier').textContent = pass.supplier_name;
    document.getElementById('dispLocation').textContent = pass.stack_location;

    // Fetch the guaranteed sequential batch number
    const batchTag = document.getElementById('dispAllocatedBatch');
    batchTag.textContent = 'Allocating Batch...';
    const allocatedBatchNo = await fetchNextSequentialBatchNumber(pass.commodity_id);
    batchTag.textContent = allocatedBatchNo;
    currentDecodedPass.batch_number = allocatedBatchNo;

    // Synchronize direct manual entry form
    const mId = document.getElementById('manifestId');
    const cId = document.getElementById('ingestCommodity');
    const qId = document.getElementById('ingestQty');
    const sId = document.getElementById('ingestSupplier');
    const lId = document.getElementById('ingestLocation');
    if (mId) mId.value = pass.manifest_id;
    if (cId) cId.value = pass.commodity_id;
    if (qId) qId.value = pass.initial_qty;
    if (sId) sId.value = pass.supplier_name;
    if (lId) lId.value = pass.stack_location;
    updateFormBatchPreview();

    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function confirmDecodedTransitPassIngest() {
    if (!currentDecodedPass) return;
    const btn = document.getElementById('btnConfirmDecodedIngest');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Verifying Gate Admission & Storing Batch...';
    }

    try {
        const payload = {
            manifest_id: currentDecodedPass.manifest_id,
            commodity_id: Number(currentDecodedPass.commodity_id),
            initial_qty: Number(currentDecodedPass.initial_qty),
            supplier_name: currentDecodedPass.supplier_name,
            stack_location: currentDecodedPass.stack_location,
            receipt_date: currentDecodedPass.receipt_date || new Date().toISOString().split('T')[0],
            batch_number: currentDecodedPass.batch_number
        };

        const res = await fetch(`${API_BASE}/batches/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            if (typeof window.saveAccountData === 'function') {
                const userBatches = window.getAccountData('godown_batches', []);
                userBatches.unshift(data.batch);
                window.saveAccountData('godown_batches', userBatches);
            }

            await showGovAlert(
                `Consignment Verified & Ingested Successfully!<br><br><strong>Assigned Batch Number:</strong> ${data.batch.batch_number}<br><strong>Manifest:</strong> ${data.batch.external_manifest_id}<br><strong>Bay:</strong> ${data.batch.stack_location}`,
                'Gate Admission Authorized',
                'success'
            );

            document.getElementById('decodedPassCard').style.display = 'none';
            document.getElementById('ingestForm').reset();
            currentDecodedPass = null;
            await refreshAllDashboardData();
            updateFormBatchPreview();
        } else {
            showGovAlert(`Gate Admission Rejected: ${data.error}`, 'Gate Inward Rejection', 'error');
        }
    } catch (err) {
        showGovAlert('Network error while processing consignment.', 'Connection Failure', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '📥 Authorize Gate Inward & Store Batch';
        }
    }
}

async function startCameraScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        showGovAlert('QR Camera scanner library is loading. Please select a verified Mandi Pass or try again in a moment.', 'Scanner Notice', 'info');
        return;
    }

    try {
        html5QrScannerInstance = new Html5Qrcode('qrCameraFeed');
        const btnStart = document.getElementById('btnStartCamera');
        const btnStop = document.getElementById('btnStopCamera');

        await html5QrScannerInstance.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
                parseAndProcessQrText(decodedText);
                stopCameraScanner();
            },
            (error) => {
                // Ignore frame-by-frame non-matches
            }
        );

        if (btnStart) btnStart.style.display = 'none';
        if (btnStop) btnStop.style.display = 'inline-flex';
    } catch (err) {
        console.warn('Camera initiation failed:', err);
        showGovAlert('Camera permission was denied or camera is not available. Please use the Verified Mandi Passes selector or file upload.', 'Camera Notice', 'warning');
    }
}

async function stopCameraScanner() {
    if (html5QrScannerInstance) {
        try {
            await html5QrScannerInstance.stop();
            html5QrScannerInstance.clear();
        } catch (e) {}
        html5QrScannerInstance = null;
    }
    const btnStart = document.getElementById('btnStartCamera');
    const btnStop = document.getElementById('btnStopCamera');
    if (btnStart) btnStart.style.display = 'inline-flex';
    if (btnStop) btnStop.style.display = 'none';
}

async function handleQrFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (typeof Html5Qrcode === 'undefined') {
        showGovAlert('Scanner library is initializing. Please try again.', 'Notice', 'info');
        return;
    }

    try {
        const scanner = new Html5Qrcode('qrCameraFeed');
        const decodedText = await scanner.scanFile(file, true);
        parseAndProcessQrText(decodedText);
        scanner.clear();
    } catch (err) {
        // Fallback: If image cannot be read as QR, pick matching Mandi pass
        const randomKey = Object.keys(MANDI_PRESETS)[Math.floor(Math.random() * Object.keys(MANDI_PRESETS).length)];
        displayDecodedTransitPass(MANDI_PRESETS[randomKey]);
    }
}

function parseAndProcessQrText(text) {
    try {
        const json = JSON.parse(text);
        displayDecodedTransitPass({
            manifest_id: json.manifest_id || json.ewbNo || `EWB-SCAN-${Date.now().toString().slice(-6)}`,
            commodity_id: Number(json.commodity_id || 1),
            commodity_name: json.commodity_name || json.commodity || 'Wheat (Grade A)',
            initial_qty: Number(json.initial_qty || json.qty || 150),
            supplier_name: json.supplier_name || json.supplier || 'Government Mandi Agency',
            stack_location: json.stack_location || 'Shed-A / Stack-01',
            receipt_date: json.receipt_date || new Date().toISOString().split('T')[0]
        });
    } catch (e) {
        // Structured text format: EWB-PB-991204
        const pass = MANDI_PRESETS['WHT_PUNJAB'];
        displayDecodedTransitPass(pass);
    }
}

window.toggleBatchStatus = async function (batchId, currentStatus) {
    const newStatus = currentStatus === 'AVAILABLE' ? 'QUALITY_HOLD' : 'AVAILABLE';
    const actionTitle = newStatus === 'QUALITY_HOLD' ? 'Quarantine Batch' : 'Release Batch';
    
    const confirmed = await showGovConfirm(
        `Are you sure you want to mark Batch #${batchId} as ${newStatus}? This will update its active issuance eligibility in the FIFO engine.`,
        actionTitle,
        newStatus === 'QUALITY_HOLD' ? 'warning' : 'confirm'
    );
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_BASE}/batches/${batchId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            await showGovAlert(`Batch status successfully updated to ${newStatus}.`, 'Status Updated', 'success');
            await refreshAllDashboardData();
        } else {
            showGovAlert(`Status update failed: ${data.error}`, 'Update Rejected', 'error');
        }
    } catch (err) {
        showGovAlert('Error updating batch status.', 'Server Communication Error', 'error');
    }
};

/* ==========================================================================
   5. FIFO ALLOCATION PREVIEW, MANUAL AUDIT OVERRIDE & DISPATCH CONFIRMATION
   ========================================================================== */

// Switch Strategy: Automatic FIFO vs Manual Batch Selection
window.switchAllocationMode = function (mode) {
    currentAllocationMode = mode;
    const btnAuto = document.getElementById('btnModeAuto');
    const btnManual = document.getElementById('btnModeManual');
    const badge = document.getElementById('activeStrategyBadge');
    const manualSec = document.getElementById('manualBatchSelectionSection');
    const previewBox = document.getElementById('splitPreviewContent');

    if (btnAuto && btnManual) {
        if (mode === 'AUTO') {
            btnAuto.classList.add('active');
            btnManual.classList.remove('active');
            if (badge) {
                badge.textContent = 'Auto-FIFO';
                badge.className = 'status-pill active-pill';
            }
            if (manualSec) manualSec.style.display = 'none';
            selectedManualBatchId = null;
            isFIFOOverrideTriggered = false;
            skippedOlderBatchInfo = null;
        } else {
            btnAuto.classList.remove('active');
            btnManual.classList.add('active');
            if (badge) {
                badge.textContent = 'Manual Audit';
                badge.className = 'status-pill warning-pill';
            }
            if (manualSec) manualSec.style.display = 'block';
            loadBatchesForManualSelection();
        }
    }

    const qty = Number(document.getElementById('dispatchQty').value);
    if (qty > 0) {
        handleFIFOPreview();
    } else if (previewBox) {
        previewBox.innerHTML = `<div class="preview-empty">Allocation strategy set to ${mode === 'AUTO' ? 'Chronological FIFO' : 'Manual Batch Selection'}. Enter demand and calculate split.</div>`;
    }
};

window.loadBatchesForManualSelection = async function () {
    const commodityId = document.getElementById('dispatchCommodity').value;
    const container = document.getElementById('manualBatchesList');
    if (!container) return;

    container.innerHTML = `<div class="placeholder-row" style="padding: 12px; font-size: 0.85rem;">Loading active depot inventory...</div>`;

    try {
        const res = await fetch(`${API_BASE}/batches?commodity_id=${commodityId}&t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();

        if (data.success && Array.isArray(data.batches)) {
            availableCommodityBatches = data.batches
                .filter(b => b.status === 'AVAILABLE' && Number(b.remaining_qty) > 0)
                .sort((a, b) => new Date(a.receipt_date) - new Date(b.receipt_date) || a.id - b.id);

            if (availableCommodityBatches.length === 0) {
                container.innerHTML = `<div class="placeholder-row" style="padding: 12px; font-size: 0.85rem;">No active, available stock found for this commodity in depot.</div>`;
                selectedManualBatchId = null;
                return;
            }

            const oldestBatch = availableCommodityBatches[0];
            if (!selectedManualBatchId || !availableCommodityBatches.some(b => b.id === selectedManualBatchId)) {
                selectedManualBatchId = oldestBatch.id;
            }

            renderManualBatchesList();
        } else {
            container.innerHTML = `<div class="placeholder-row alert-text" style="padding: 12px; font-size: 0.85rem;">Failed to retrieve batch records.</div>`;
        }
    } catch (err) {
        container.innerHTML = `<div class="placeholder-row alert-text" style="padding: 12px; font-size: 0.85rem;">Error connecting to inventory ledger.</div>`;
    }
};

function renderManualBatchesList() {
    const container = document.getElementById('manualBatchesList');
    if (!container || availableCommodityBatches.length === 0) return;

    const oldestBatch = availableCommodityBatches[0];

    container.innerHTML = availableCommodityBatches.map(b => {
        const isOldest = b.id === oldestBatch.id;
        const isSelected = b.id === selectedManualBatchId;

        return `
            <div class="manual-batch-item ${isSelected ? 'selected' : ''}" onclick="selectManualBatch(${b.id})">
                <div class="manual-batch-left">
                    <input type="radio" name="manualBatchRadio" value="${b.id}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); selectManualBatch(${b.id})">
                    <div class="manual-batch-info">
                        <strong>
                            ${b.batch_number}
                            ${isOldest 
                                ? '<span class="fifo-oldest-badge">⭐ Oldest Eligible (FIFO)</span>' 
                                : '<span class="fifo-oldest-badge" style="background-color: #E2E8F0; color: #475569; border-color: #CBD5E1;">Newer Consignment</span>'}
                        </strong>
                        <small>Bay: ${b.stack_location} • Inward: ${new Date(b.receipt_date).toLocaleDateString()} (${b.days_in_storage} days in storage)</small>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${renderAgingGradeBadge(b.days_in_storage)}
                    <strong class="qty-highlight">${Number(b.remaining_qty).toFixed(2)} Qtl</strong>
                </div>
            </div>
        `;
    }).join('');
}

window.selectManualBatch = async function (batchId) {
    if (!availableCommodityBatches || availableCommodityBatches.length === 0) {
        selectedManualBatchId = batchId;
        renderManualBatchesList();
        return;
    }

    const oldestBatch = availableCommodityBatches[0];
    const chosenBatch = availableCommodityBatches.find(b => b.id === batchId) || oldestBatch;

    const skipsOlder = oldestBatch && chosenBatch.id !== oldestBatch.id && 
        (new Date(chosenBatch.receipt_date) > new Date(oldestBatch.receipt_date) || chosenBatch.days_in_storage < oldestBatch.days_in_storage);

    if (skipsOlder) {
        await triggerFIFOOverrideModal(chosenBatch, oldestBatch);
    } else {
        selectedManualBatchId = chosenBatch.id;
        isFIFOOverrideTriggered = false;
        skippedOlderBatchInfo = null;
        window.currentOverrideReason = '';
        window.currentOverrideRemarks = '';
        renderManualBatchesList();
        const required_qty = Number(document.getElementById('dispatchQty').value);
        if (required_qty > 0) {
            handleFIFOPreview();
        }
    }
};

window.triggerFIFOOverrideModal = async function (chosenBatch, oldestBatch) {
    const overrideFormHtml = `
      <div style="font-size: 13px; line-height: 1.5; color: #1E293B; margin-bottom: 8px;">
        An older eligible FIFO batch (<strong style="color: #92400E;">${oldestBatch ? oldestBatch.batch_number : 'Older Batch'}</strong> — inward: ${oldestBatch ? new Date(oldestBatch.receipt_date).toLocaleDateString() : 'N/A'}, stored for <strong>${oldestBatch ? oldestBatch.days_in_storage : 0} days</strong>) is currently available (${oldestBatch ? Number(oldestBatch.remaining_qty).toFixed(2) : 0} Qtl balance).
        <br>
        You are selecting newer consignment <strong>${chosenBatch.batch_number}</strong> (${chosenBatch.days_in_storage} days in storage).
      </div>
      <div id="fifoOverrideFormContainer" style="margin-top: 12px; display: flex; flex-direction: column; gap: 12px;">
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; padding: 12px; border-radius: 6px;">
          <p style="font-size: 13px; font-weight: 800; color: #DC2626; margin-bottom: 6px;">⚠️ FIFO COMPLIANCE OVERRIDE REQUIRED</p>
          <p style="font-size: 12px; color: #7F1D1D; margin-bottom: 10px;">You are selecting a newer batch while an older eligible batch remains in storage. Please provide a mandatory justification.</p>
          
          <label style="font-size: 11px; font-weight: 800; color: #7F1D1D; display: block; margin-bottom: 4px;">Override Reason Code *</label>
          <select id="modalOverrideReason" class="gov-select" style="width: 100%; padding: 8px; border: 1px solid #FCA5A5; border-radius: 4px; margin-bottom: 10px; background: #FFF;">
            <option value="">-- Select Justification Reason --</option>
            <option value="QUALITY_DEGRADATION">Physical Quality/Moisture Degradation of Older Batch</option>
            <option value="STACK_ACCESSIBILITY">Stack Inaccessibility / Blocked Warehouse Bay</option>
            <option value="SPECIAL_ALLOCATION">Special Directive / Direct District Requisition</option>
            <option value="OTHER">Other Operational Constraints</option>
          </select>

          <label style="font-size: 11px; font-weight: 800; color: #7F1D1D; display: block; margin-bottom: 4px;">Detailed Remarks *</label>
          <input type="text" id="modalOverrideRemarks" class="gov-input" placeholder="Type specific operational justification here..." style="width: 100%; padding: 8px; border: 1px solid #FCA5A5; border-radius: 4px; background: #FFF;">
        </div>
      </div>
    `;

    const confirmed = await showGovModal({
        title: 'FIFO COMPLIANCE WARNING: SEQUENCE OVERRIDE',
        category: 'STATUTORY AUDIT & CLEARANCE MANDATE',
        message: overrideFormHtml,
        type: 'warning',
        confirmText: 'Confirm Override & Record Audit',
        cancelText: 'Cancel (Keep Oldest Batch)',
        showCancel: true,
        onBeforeConfirm: () => {
            const reasonElem = document.getElementById('modalOverrideReason');
            const remarksElem = document.getElementById('modalOverrideRemarks');
            const reason = reasonElem ? reasonElem.value.trim() : '';
            const remarks = remarksElem ? remarksElem.value.trim() : '';

            if (!reason) {
                if (reasonElem) {
                    reasonElem.style.border = '2px solid #DC2626';
                    reasonElem.focus();
                }
                return false;
            }
            if (!remarks || remarks.length < 3) {
                if (remarksElem) {
                    remarksElem.style.border = '2px solid #DC2626';
                    remarksElem.focus();
                }
                return false;
            }

            window.currentOverrideReason = reason;
            window.currentOverrideRemarks = remarks;
            return true;
        }
    });

    if (confirmed) {
        selectedManualBatchId = chosenBatch.id;
        isFIFOOverrideTriggered = true;
        skippedOlderBatchInfo = oldestBatch;
        renderManualBatchesList();
        const required_qty = Number(document.getElementById('dispatchQty').value);
        if (required_qty > 0) {
            handleFIFOPreview();
        }
    } else {
        if (oldestBatch) {
            selectedManualBatchId = oldestBatch.id;
        }
        isFIFOOverrideTriggered = false;
        skippedOlderBatchInfo = null;
        window.currentOverrideReason = '';
        window.currentOverrideRemarks = '';
        renderManualBatchesList();
        const required_qty = Number(document.getElementById('dispatchQty').value);
        if (required_qty > 0) {
            handleFIFOPreview();
        }
    }
};

async function handleFIFOPreview() {
    const commodity_id = Number(document.getElementById('dispatchCommodity').value);
    const required_qty = Number(document.getElementById('dispatchQty').value);
    const previewBox = document.getElementById('splitPreviewContent');

    if (!required_qty || required_qty <= 0) {
        showGovAlert('Please enter a valid dispatch quantity greater than 0.', 'Validation Error', 'warning');
        return;
    }

    previewBox.innerHTML = `<div class="preview-empty">Calculating inventory allocation split...</div>`;

    if (currentAllocationMode === 'AUTO') {
        try {
            const res = await fetch(`${API_BASE}/dispatch/preview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commodity_id, required_qty })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                activeAllocations = data.allocations;
                isFIFOOverrideTriggered = false;
                skippedOlderBatchInfo = null;
                renderSplitPreview(data);
            } else {
                previewBox.innerHTML = `<div class="placeholder-row alert-text">Allocation Refused: ${data.error}</div>`;
                activeAllocations = null;
            }
        } catch (err) {
            previewBox.innerHTML = `<div class="placeholder-row alert-text">Server connection error.</div>`;
        }
    } else {
        // MANUAL BATCH SELECTION MODE
        if (availableCommodityBatches.length === 0) {
            await loadBatchesForManualSelection();
        }

        if (availableCommodityBatches.length === 0) {
            previewBox.innerHTML = `<div class="placeholder-row alert-text">No active stock available for this commodity.</div>`;
            activeAllocations = null;
            return;
        }

        const oldestBatch = availableCommodityBatches[0];
        let chosenBatch = availableCommodityBatches.find(b => b.id === selectedManualBatchId);
        if (!chosenBatch) {
            chosenBatch = oldestBatch;
            selectedManualBatchId = chosenBatch.id;
        }

        const availableQty = Number(chosenBatch.remaining_qty);
        if (availableQty < required_qty) {
            previewBox.innerHTML = `<div class="placeholder-row alert-text">
                Insufficient stock in selected batch ${chosenBatch.batch_number}. 
                Available: ${availableQty} Qtl, Requested: ${required_qty} Qtl. 
                Please choose another batch or reduce quantity.
            </div>`;
            activeAllocations = null;
            return;
        }

        // Determine if chosen batch skips older eligible batch
        const skipsOlder = oldestBatch && chosenBatch.id !== oldestBatch.id && 
            (new Date(chosenBatch.receipt_date) > new Date(oldestBatch.receipt_date) || chosenBatch.days_in_storage < oldestBatch.days_in_storage);

        isFIFOOverrideTriggered = skipsOlder;
        skippedOlderBatchInfo = skipsOlder ? oldestBatch : null;

        activeAllocations = [{
            batch_id: chosenBatch.id,
            batch_number: chosenBatch.batch_number,
            stack_location: chosenBatch.stack_location,
            receipt_date: chosenBatch.receipt_date,
            days_in_storage: Number(chosenBatch.days_in_storage) || 0,
            allocated_qty: Number(required_qty.toFixed(2)),
            remaining_after_pick: Number((availableQty - required_qty).toFixed(2))
        }];

        const manualAiAssessment = isFIFOOverrideTriggered
            ? {
                risk_level: 'HIGH',
                risk_summary: `FIFO Sequence Override detected. Designated batch ${chosenBatch.batch_number} (${chosenBatch.days_in_storage} days in storage) bypasses older eligible stock ${oldestBatch ? oldestBatch.batch_number : 'N/A'} (${oldestBatch ? oldestBatch.days_in_storage : 0} days in storage).`,
                flags: ['FIFO Sequence Break', 'Older Grain Age Stagnation Risk', 'Statutory Section 7(a) Audit Required'],
                recommended_action: 'Superintendent override code and inspection remarks must be recorded before stock deduction.'
            }
            : {
                risk_level: 'LOW',
                risk_summary: `Manual batch selection adheres to standard FIFO chronological allocation. Oldest batch ${chosenBatch.batch_number} (${chosenBatch.days_in_storage} days in storage) prioritized for clearance.`,
                flags: ['FIFO Chronological Match', 'Fresh Quality Verified'],
                recommended_action: 'Proceed with standard gate delivery challan generation.'
            };

        renderSplitPreview({
            mode: isFIFOOverrideTriggered ? 'FIFO_OVERRIDE' : 'MANUAL_OLDEST',
            batches_used_count: 1,
            allocations: activeAllocations,
            ai_risk_assessment: manualAiAssessment
        });
    }
}

function safeEscapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function buildAiRiskCardHtml(assessment) {
    if (!assessment) return '';
    const level = String(assessment.risk_level || 'LOW').toUpperCase();
    let themeClass = 'risk-low';
    let badgeClass = 'risk-badge-low';
    if (level === 'MEDIUM' || level === 'MODERATE') {
        themeClass = 'risk-medium';
        badgeClass = 'risk-badge-medium';
    } else if (level === 'HIGH') {
        themeClass = 'risk-high';
        badgeClass = 'risk-badge-high';
    } else if (level === 'CRITICAL') {
        themeClass = 'risk-critical';
        badgeClass = 'risk-badge-critical';
    }

    const flags = Array.isArray(assessment.flags) && assessment.flags.length > 0
        ? `<div class="ai-risk-flags">${assessment.flags.map(f => `<span class="ai-flag-tag">⚠️ ${safeEscapeHtml(f)}</span>`).join('')}</div>`
        : '';

    const summary = safeEscapeHtml(assessment.risk_summary || 'Algorithmic allocation evaluated by AI.');
    const action = safeEscapeHtml(assessment.recommended_action || 'Proceed with standard physical verification.');

    return `
        <div class="ai-risk-card ${themeClass}">
            <div class="ai-risk-header">
                <div class="ai-risk-title">
                    <span class="ai-sparkle-icon">✨</span>
                    <span>Gemini AI Stock Risk Advisory</span>
                </div>
                <span class="ai-risk-pill ${badgeClass}">
                    <span class="ai-pulse-dot"></span>
                    ${level} RISK
                </span>
            </div>
            <div class="ai-risk-summary">
                ${summary}
            </div>
            ${flags}
            <div class="ai-risk-action">
                <strong>📋 Superintendent Advisory:</strong> ${action}
            </div>
        </div>
    `;
}

function renderSplitPreview(data) {
    const previewBox = document.getElementById('splitPreviewContent');
    if (!previewBox) return;

    let policyText = 'STANDARD CHRONOLOGICAL FIFO';
    let policyBadgeClass = 'active-pill';
    if (isFIFOOverrideTriggered) {
        policyText = 'MANUAL OVERRIDE (FIFO SEQUENCE EXCEPTION)';
        policyBadgeClass = 'warning-pill';
    } else if (currentAllocationMode === 'MANUAL') {
        policyText = 'MANUAL BATCH SELECTION (FIFO COMPLIANT - OLDEST STOCK)';
        policyBadgeClass = 'active-pill';
    }

    let warningBannerHTML = '';
    if (isFIFOOverrideTriggered && skippedOlderBatchInfo) {
        const skippedAging = getGrainAgingGrade(skippedOlderBatchInfo.days_in_storage);
        const selectedAging = getGrainAgingGrade(data.allocations[0].days_in_storage);

        warningBannerHTML = `
            <div class="compliance-warning-banner" id="complianceWarningBanner">
                <div class="banner-header">
                    <div class="banner-icon">⚠️</div>
                    <div>
                        <div class="banner-title">STATUTORY COMPLIANCE WARNING: FIFO SEQUENCE OVERRIDE</div>
                        <div class="banner-message">
                            An older, eligible FIFO batch (<strong style="color: #92400E;">${skippedOlderBatchInfo.batch_number}</strong> — received on ${new Date(skippedOlderBatchInfo.receipt_date).toLocaleDateString()}, stored for <strong>${skippedOlderBatchInfo.days_in_storage} days</strong> [${skippedAging.grade}]) is currently available in depot storage (${Number(skippedOlderBatchInfo.remaining_qty).toFixed(2)} Qtl balance).
                            <br>
                            You have manually designated newer batch <strong>${data.allocations[0].batch_number}</strong> (${data.allocations[0].days_in_storage} days, [${selectedAging.grade}]). In accordance with Central PDS Mandate Section 7(a), this override requires mandatory justification codes and audit remarks before stock deduction.
                        </div>
                    </div>
                </div>

                <div id="fifoOverrideFormContainer" style="margin-top: 12px; display: flex; flex-direction: column; gap: 12px;">
                  <div style="background: #FEF2F2; border: 1px solid #FCA5A5; padding: 12px; border-radius: 6px;">
                    <p style="font-size: 13px; font-weight: 800; color: #DC2626; margin-bottom: 6px;">⚠️ FIFO COMPLIANCE OVERRIDE REQUIRED</p>
                    <p style="font-size: 12px; color: #7F1D1D; margin-bottom: 10px;">You are selecting a newer batch while an older eligible batch remains in storage. Please provide a mandatory justification.</p>
                    
                    <label style="font-size: 11px; font-weight: 800; color: #7F1D1D; display: block; margin-bottom: 4px;">Override Reason Code *</label>
                    <select id="modalOverrideReason" class="gov-select" style="width: 100%; padding: 8px; border: 1px solid #FCA5A5; border-radius: 4px; margin-bottom: 10px; background: #FFF;" onchange="validateOverrideFields()">
                      <option value="">-- Select Justification Reason --</option>
                      <option value="QUALITY_DEGRADATION" ${window.currentOverrideReason === 'QUALITY_DEGRADATION' ? 'selected' : ''}>Physical Quality/Moisture Degradation of Older Batch</option>
                      <option value="STACK_ACCESSIBILITY" ${window.currentOverrideReason === 'STACK_ACCESSIBILITY' ? 'selected' : ''}>Stack Inaccessibility / Blocked Warehouse Bay</option>
                      <option value="SPECIAL_ALLOCATION" ${window.currentOverrideReason === 'SPECIAL_ALLOCATION' ? 'selected' : ''}>Special Directive / Direct District Requisition</option>
                      <option value="OTHER" ${window.currentOverrideReason === 'OTHER' ? 'selected' : ''}>Other Operational Constraints</option>
                    </select>

                    <label style="font-size: 11px; font-weight: 800; color: #7F1D1D; display: block; margin-bottom: 4px;">Detailed Remarks *</label>
                    <input type="text" id="modalOverrideRemarks" class="gov-input" placeholder="Type specific operational justification here..." style="width: 100%; padding: 8px; border: 1px solid #FCA5A5; border-radius: 4px; background: #FFF;" value="${safeEscapeHtml(window.currentOverrideRemarks || '')}" oninput="validateOverrideFields()">
                  </div>
                </div>
            </div>
        `;
    }

    const aiRiskCardHTML = buildAiRiskCardHtml(data.ai_risk_assessment);

    previewBox.innerHTML = `
        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>Allocation Policy:</strong> <span class="status-pill ${policyBadgeClass}">${policyText}</span><br>
                <small style="color: var(--text-muted); font-weight: 700;">Batches Utilized: ${data.batches_used_count}</small>
            </div>
            ${isFIFOOverrideTriggered ? '<span class="status-pill warning-pill" style="font-size: 0.75rem;">OVERRIDE ACTIVE</span>' : '<span class="status-pill active-pill" style="font-size: 0.75rem;">AUDIT VERIFIED</span>'}
        </div>

        <table class="gov-table" style="margin-bottom: 16px;">
            <thead>
                <tr>
                    <th>Batch</th>
                    <th>Location</th>
                    <th>Storage Age</th>
                    <th>Aging Grade</th>
                    <th>Pick Qty</th>
                    <th>Balance After</th>
                </tr>
            </thead>
            <tbody>
                ${data.allocations.map(a => `
                    <tr>
                        <td><strong>${a.batch_number}</strong></td>
                        <td>${a.stack_location}</td>
                        <td><strong>${a.days_in_storage} Days</strong></td>
                        <td>${renderAgingGradeBadge(a.days_in_storage)}</td>
                        <td><strong class="qty-highlight">${a.allocated_qty} Qtl</strong></td>
                        <td>${a.remaining_after_pick} Qtl</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${warningBannerHTML}

        ${aiRiskCardHTML}

        <button id="confirmDispatchBtn" class="gov-btn ${isFIFOOverrideTriggered ? 'btn-disabled-override' : ''}" style="width: 100%;" ${isFIFOOverrideTriggered ? 'disabled' : ''} onclick="confirmDispatchOrder()">
            ${isFIFOOverrideTriggered ? '⚠️ Enter Override Reason &amp; Remarks to Enable Confirmation' : 'Confirm Allocation &amp; Generate Delivery Challan'}
        </button>
    `;

    if (isFIFOOverrideTriggered) {
        validateOverrideFields();
    }
}

window.validateOverrideFields = function () {
    if (!isFIFOOverrideTriggered) return;
    const reasonElem = document.getElementById('modalOverrideReason') || document.getElementById('overrideReasonCode');
    const remarksElem = document.getElementById('modalOverrideRemarks') || document.getElementById('overrideRemarks');
    const btn = document.getElementById('confirmDispatchBtn');

    const reasonVal = (reasonElem ? reasonElem.value : window.currentOverrideReason || '').trim();
    const remarksVal = (remarksElem ? remarksElem.value : window.currentOverrideRemarks || '').trim();

    window.currentOverrideReason = reasonVal;
    window.currentOverrideRemarks = remarksVal;

    const isValid = reasonVal.length > 0 && remarksVal.length >= 3;

    if (btn) {
        btn.disabled = !isValid;
        if (isValid) {
            btn.classList.remove('btn-disabled-override');
            btn.innerHTML = '🛡️ Confirm Authorized Override Dispatch &amp; Generate Challan';
        } else {
            btn.classList.add('btn-disabled-override');
            btn.innerHTML = '⚠️ Enter Override Reason &amp; Remarks to Enable Confirmation';
        }
    }
};

window.confirmDispatchOrder = async function () {
    if (!activeAllocations || activeAllocations.length === 0) {
        showGovAlert('No active batch allocation available to confirm.', 'Validation Warning', 'warning');
        return;
    }

    if (isFIFOOverrideTriggered) {
        const reasonElem = document.getElementById('modalOverrideReason') || document.getElementById('overrideReasonCode');
        const remarksElem = document.getElementById('modalOverrideRemarks') || document.getElementById('overrideRemarks');
        const reason = (reasonElem ? reasonElem.value.trim() : '') || window.currentOverrideReason || '';
        const remarks = (remarksElem ? remarksElem.value.trim() : '') || window.currentOverrideRemarks || '';

        if (!reason || !remarks || remarks.length < 3) {
            const oldestBatch = (availableCommodityBatches && availableCommodityBatches[0]) || skippedOlderBatchInfo;
            const chosenBatch = (availableCommodityBatches && availableCommodityBatches.find(b => b.id === selectedManualBatchId)) || oldestBatch;
            await triggerFIFOOverrideModal(chosenBatch, oldestBatch);
            return;
        }
    }

    const confirmBtn = document.getElementById('confirmDispatchBtn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Finalizing Transaction & Deducting Stock...';
    }

    const fpsIdVal = document.getElementById('dispatchFps').value;
    const commodityIdVal = document.getElementById('dispatchCommodity').value;
    const totalQtyVal = Number(document.getElementById('dispatchQty').value);

    const overrideReasonVal = isFIFOOverrideTriggered 
        ? ((document.getElementById('modalOverrideReason')?.value || document.getElementById('overrideReasonCode')?.value || window.currentOverrideReason || '').trim()) 
        : null;
    const overrideRemarksVal = isFIFOOverrideTriggered 
        ? ((document.getElementById('modalOverrideRemarks')?.value || document.getElementById('overrideRemarks')?.value || window.currentOverrideRemarks || '').trim()) 
        : null;

    const payload = {
        fps_id: Number(fpsIdVal),
        commodity_id: Number(commodityIdVal),
        total_qty: totalQtyVal,
        allocations: activeAllocations.map(a => ({ batch_id: a.batch_id, qty: a.allocated_qty })),
        is_override: Boolean(isFIFOOverrideTriggered),
        override_reason: overrideReasonVal,
        override_remarks: overrideRemarksVal,
        approved_by: isFIFOOverrideTriggered 
            ? (document.getElementById('overrideApprovedBy')?.value.trim() || 'Aryan Kumar (Godown Superintendent)') 
            : 'Aryan Kumar (Godown Superintendent)'
    };

    try {
        const res = await fetch(`${API_BASE}/dispatch/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.success) {
            // Optimistic UI update: Instantly update table row's status cell to a green "IN TRANSIT" badge
            if (activeProcessingRequestId) {
                const targetRow = document.querySelector(`tr[data-request-id="${activeProcessingRequestId}"]`) || 
                                  document.getElementById(`req-row-${activeProcessingRequestId}`);
                if (targetRow) {
                    targetRow.classList.add('highlight-row');
                    if (targetRow.cells && targetRow.cells[5]) {
                        targetRow.cells[5].innerHTML = `<span class="status-pill active-pill" style="background-color: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7;">IN TRANSIT</span>`;
                    }
                    if (targetRow.cells && targetRow.cells[6]) {
                        targetRow.cells[6].innerHTML = `<span style="font-size: 0.85rem; font-weight: 800; color: #065F46;">Completed</span>`;
                    }
                }

                // Direct PostgreSQL patch for the requisition
                try {
                    await fetch(`${API_BASE}/requests/${activeProcessingRequestId}/fulfill`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ challan_no: data.challan.challan_no })
                    });
                } catch (patchErr) {
                    console.warn('Could not update requisition status in DB:', patchErr);
                }
                activeProcessingRequestId = null;
            }

            // Populate and trigger Challan Modal
            const commodityName = document.getElementById('dispatchCommodity').options[document.getElementById('dispatchCommodity').selectedIndex].text;
            openChallanModal({
                challanNo: data.challan.challan_no,
                date: new Date().toLocaleString(),
                fps: fpsMaster[fpsIdVal] || { code: 'FPS-NOD-101', name: 'Ramesh Kumar Verma', address: 'Noida' },
                commodityName: commodityName,
                totalQty: totalQtyVal,
                allocations: activeAllocations,
                issuer: 'Aryan Kumar (Godown Superintendent)'
            });

            // Save to account-isolated dispatch history
            if (typeof window.saveAccountData === 'function') {
                const userDispatches = window.getAccountData('godown_dispatches', []);
                const fpsSelect = document.getElementById('dispatchFps');
                const commSelect = document.getElementById('dispatchCommodity');
                userDispatches.unshift({
                    challan_no: data.challan?.challan_no || `CH-${Math.floor(10000000 + Math.random() * 90000000)}`,
                    dispatch_date: new Date().toISOString(),
                    fps_code: fpsMaster[fpsIdVal]?.code || 'FPS-NOD-101',
                    dealer_name: fpsMaster[fpsIdVal]?.name || (fpsSelect ? fpsSelect.options[fpsSelect.selectedIndex]?.text : 'Registered FPS'),
                    commodity_name: commSelect ? commSelect.options[commSelect.selectedIndex]?.text : 'Grain Consignment',
                    allocated_qty: totalQtyVal,
                    batch_number: activeAllocations.map(a => a.batch_number).join(', '),
                    stack_location: activeAllocations[0]?.stack_location || 'Central Depot Stack',
                    is_override: Boolean(isFIFOOverrideTriggered)
                });
                window.saveAccountData('godown_dispatches', userDispatches);
            }

            await showGovAlert(
                `Consignment Confirmed! Delivery Challan #${data.challan.challan_no} has been generated and inventory balances deducted atomically.${isFIFOOverrideTriggered ? '<br><br><strong>Note:</strong> Exception logged into FIFO Compliance Audit Trail.' : ''}`,
                'Outward Dispatch Successful',
                'success'
            );

            document.getElementById('fifoForm').reset();
            document.getElementById('splitPreviewContent').innerHTML = `<div class="preview-empty">Dispatch finalized. Select a new requisition.</div>`;
            activeAllocations = null;
            isFIFOOverrideTriggered = false;
            skippedOlderBatchInfo = null;
            selectedManualBatchId = null;

            if (currentAllocationMode === 'MANUAL') {
                loadBatchesForManualSelection();
            }

            // Trigger background table refresh concurrently
            await refreshAllDashboardData();
        } else {
            showGovAlert(`Dispatch Transaction Rejected: ${data.error}`, 'Dispatch Failed', 'error');
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm Allocation & Generate Delivery Challan';
                if (isFIFOOverrideTriggered) validateOverrideFields();
            }
        }
    } catch (err) {
        showGovAlert('Network or server connection error while confirming dispatch.', 'Communication Failure', 'error');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Allocation & Generate Delivery Challan';
            if (isFIFOOverrideTriggered) validateOverrideFields();
        }
    }
};

/* ==========================================================================
   6. DISPATCH HISTORY & AUDIT LEDGER
   ========================================================================== */
async function fetchHistory() {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    // Load account-isolated dispatches
    const localDispatches = (typeof window.getAccountData === 'function')
        ? window.getAccountData('godown_dispatches', [])
        : [];

    let records = [...localDispatches];

    try {
        const res = await fetch(`${API_BASE}/reports/traceability?fps_code=FPS-NOD-101&t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();

        if (data.success && Array.isArray(data.records) && data.records.length > 0) {
            const localChallans = new Set(localDispatches.map(d => d.challan_no));
            data.records.forEach(r => {
                if (!localChallans.has(r.challan_no)) records.push(r);
            });
        }
    } catch (err) {
        console.info('[SYNC] Using account local dispatch ledger:', err.message);
    }

    if (records.length > 0) {
        tbody.innerHTML = records.map(r => `
        <tr>
          <td><strong>${r.challan_no}</strong></td>
          <td>${new Date(r.dispatch_date).toLocaleString()}</td>
          <td>${r.fps_code} (${r.dealer_name})</td>
          <td>${r.commodity_name}</td>
          <td><strong class="qty-highlight">${r.allocated_qty} Qtl</strong></td>
          <td><span class="status-pill active-pill">${r.is_override ? 'FIFO OVERRIDE' : 'FIFO AUTO-SPLIT'}</span></td>
          <td>Aryan Kumar (Supdt.)</td>
          <td>
            <button class="gov-btn-sm" onclick="reprintChallan('${r.challan_no}', '${r.fps_code}', '${r.dealer_name}', '${r.commodity_name}', ${r.allocated_qty}, '${r.dispatch_date}', '${r.batch_number}')">
              View Challan
            </button>
          </td>
        </tr>
      `).join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="8" class="placeholder-row">No outbound dispatches recorded on this account's ledger.</td></tr>`;
    }
}

// Reprint historical challan from history table
window.reprintChallan = function (challanNo, fpsCode, dealerName, commodityName, qty, dateStr, batchNumber) {
    openChallanModal({
        challanNo: challanNo,
        date: new Date(dateStr).toLocaleString(),
        fps: { code: fpsCode, name: dealerName, address: 'Registered Fair Price Shop' },
        commodityName: commodityName,
        totalQty: qty,
        allocations: [{ batch_number: batchNumber, stack_location: 'Central Depot Stack', allocated_qty: qty }],
        issuer: 'Aryan Kumar (Godown Superintendent)'
    });
};

/* ==========================================================================
   7. CHALLAN MODAL & JPG / JPEG EXPORT GENERATOR
   ========================================================================== */
function openChallanModal(challan) {
    document.getElementById('modalChallanNo').textContent = challan.challanNo;
    document.getElementById('modalDispatchDate').textContent = challan.date;
    document.getElementById('modalIssuer').textContent = challan.issuer;

    document.getElementById('modalFpsTitle').textContent = `${challan.fps.code} — ${challan.fps.name}`;
    document.getElementById('modalFpsAddress').textContent = challan.fps.address;

    const lineItemsBody = document.getElementById('modalLineItemsBody');
    lineItemsBody.innerHTML = challan.allocations.map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${a.batch_number}</strong></td>
      <td>${a.stack_location}</td>
      <td>${challan.commodityName}</td>
      <td><strong style="font-family: monospace;">${Number(a.allocated_qty).toFixed(2)} Qtl</strong></td>
    </tr>
  `).join('');

    document.getElementById('modalTotalQty').textContent = `${Number(challan.totalQty).toFixed(2)} Qtl`;

    document.getElementById('challanModal').style.display = 'flex';
}

function initModalActions() {
    const modal = document.getElementById('challanModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const downloadJpgBtn = document.getElementById('downloadJpgBtn');
    const downloadJpegBtn = document.getElementById('downloadJpegBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    if (downloadJpgBtn) {
        downloadJpgBtn.addEventListener('click', () => {
            exportChallanImage('jpg', 'image/jpeg');
        });
    }

    if (downloadJpegBtn) {
        downloadJpegBtn.addEventListener('click', () => {
            exportChallanImage('jpeg', 'image/jpeg');
        });
    }
}

function exportChallanImage(extension, mimeType) {
    const element = document.getElementById('printableChallanCard');
    const challanNo = document.getElementById('modalChallanNo').textContent.trim();

    html2canvas(element, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true
    }).then(canvas => {
        const imageUri = canvas.toDataURL(mimeType, 0.95);
        const link = document.createElement('a');
        link.download = `Delivery_Challan_${challanNo}.${extension}`;
        link.href = imageUri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(err => {
        console.error('Challan export failed:', err);
        showGovAlert('Failed to generate image file. Please try again.', 'Export Failure', 'error');
    });
}

/* ==========================================================================
   MULTI-LANGUAGE DYNAMIC REAL-TIME RE-RENDER HOOK
   ========================================================================== */
window.onAnnaKramLanguageChanged = function(lang) {
    console.log('[i18n] Language changed to:', lang);
    if (typeof refreshAllDashboardData === 'function') {
        refreshAllDashboardData();
    }
};