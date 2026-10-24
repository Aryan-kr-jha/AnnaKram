// public/i18n.js - Centralized Multi-Language Translation System for AnnaKram iPDS
// Supports seamless English (EN) and Hindi (हिन्दी) switching across all portals

const ANNAKRAM_I18N = {
  en: {
    // Brand & General
    brandName: "AnnaKram",
    deptTitle: "DEPARTMENT OF FOOD & PUBLIC DISTRIBUTION",
    depotSubtext: "DEPOT-GRN-04: Greater Noida Central Buffer Godown | Regional Depot: Meerut Division",
    fpsLicenseSubtext: "FPS-NOD-101 • Sector 12, Noida",
    fpsPortalTitle: "FPS OWNER PORTAL",
    govCloudSecure: "Gov-Cloud Secure",
    profileOverview: "Profile Overview",
    settings: "Settings",
    signOut: "Sign Out",
    godownSuperintendent: "Godown Superintendent",
    fpsDealer: "FPS Dealer",
    acknowledge: "Acknowledge",
    cancel: "Cancel",
    confirmAndProceed: "Confirm & Proceed",
    systemNotice: "System Notification",

    // Central Godown Navigation
    navCentralDashboard: "Central Dashboard",
    navStackBays: "Warehouse",
    navIndentRequisitions: "FPS Requests",
    navActiveBatches: "e-Way Bill Scanner",
    navFifoDispatch: "FIFO Outward Dispatch",
    navDeliveryChallans: "Challan Generator",
    navCompliance: "Dispatch History",

    // Central Godown KPIs
    kpiTotalDepotStock: "TOTAL BUFFER STOCK",
    kpiStorageLimit: "INCOMING STOCK",
    kpiWarehouseOccupancy: "Warehouse Bay Occupancy",
    kpiOldestBatch: "Oldest Eligible Batch",
    kpiAgingAlert: "EXTENDED STORAGE NOTICE",
    kpiPendingIndents: "SERVING FPS OUTLETS",
    kpiInTransit: "In-Transit Deliveries",

    // Commodity Names
    commWheat: "Wheat (Grade A)",
    commRice: "Raw Rice (Boiled)",
    commSugar: "Refined Sugar",
    commDal: "Tuvar Dal",

    // Godown Gate Scanner & Stock Ingestion
    scanTitle: "Automated QR Manifest Decoder & Gate Scanner",
    scanSubtitle: "Scan verified FCI / State Civil Supplies Mandi Transit Pass or Upload QR File",
    tabPresets: "Verified Mandi Passes",
    tabCamera: "Live Camera",
    tabUpload: "Upload QR File",
    mandiSelectHint: "Select Verified State Government Consignment Pass:",
    startCamera: "Start Camera Scanner",
    stopCamera: "Stop Camera Stream",
    dropzoneText: "Click or Drag & Drop Mandi Consignment QR Code Image",
    dropzoneSubtext: "Supports PNG, JPG, WEBP e-Way Bill slips",
    manualIngestionTitle: "Physical Consignment Stock Inward Form",
    manualIngestionSubtitle: "Manual inward verification with automatic deterministic batch number allocation",
    lblCommodity: "Commodity Type",
    lblSupplier: "Supplier / Mandi Agency",
    lblStackLocation: "Stack Bay Location",
    lblNetQty: "Net Quantity Received (Quintals)",
    lblReceiptDate: "Consignment Receipt Date",
    lblAllocatedBatch: "Allocated Batch Number",
    btnIngestStock: "Ingest Consignment to Stock Batches",

    // Godown FIFO Dispatch
    dispatchTitle: "FIFO Allocation & Outward Challan Generation",
    dispatchSubtitle: "Central PDS statutory chronological grain dispatch system",
    lblTargetFps: "Select Target Fair Price Shop",
    lblDispatchCommodity: "Commodity Required",
    lblDispatchQty: "Required Dispatch Quantity (Quintals)",
    lblAllocationMode: "Allocation Mode",
    modeAutoFifo: "Automatic FIFO Sequence (Central Mandate)",
    modeManualBatch: "Manual Batch Selection (Audited Override)",
    btnCalculateFifo: "Calculate FIFO Allocation Split",
    btnConfirmDispatch: "Confirm Allocation & Generate Delivery Challan",
    aiAdvisoryTitle: "Gemini AI Stock Risk Advisory",
    aiAdvisoryAction: "Superintendent Advisory:",

    // Godown Stacks & Batches
    batchesTitle: "Depot Batch Register & Storage Age Ledger",
    colBatchNo: "Batch No.",
    colLocation: "Stack Location",
    colStorageAge: "Storage Age",
    colAgingGrade: "Quality Grade",
    colAvailableStock: "Available Balance",
    colStatus: "Depot Status",
    colInitialQty: "Initial Received",
    colSupplier: "Source Agency",

    // Central Godown Overview & Radar
    radarTitle: "FIFO PRIORITY EVACUATION RADAR",
    radarSubtitle: "Oldest Active Stacks Requiring Immediate Outward Priority",
    badgeRotationMandated: "ROTATION MANDATED",
    colBatchId: "Batch Identifier",
    colCommodity: "Commodity",
    colStackLocation: "Stack Location",
    colStorageDuration: "Storage Duration",
    colRemainingQty: "Remaining Qty",
    colMandatedAction: "Mandated Action",
    commDistributionTitle: "COMMODITY RESERVE DISTRIBUTION (DEPOT TOTALS)",
    commDistributionSubtitle: "Current Real-Time Storage Breakdown by Grain Type",
    
    // Warehouse Stacks View
    stacksInventoryTitle: "WAREHOUSE STACKS INVENTORY",
    lblFilterGrain: "Filter Grain Type:",
    optAllCommodities: "All Commodities",
    colDaysStored: "Days Stored",
    colReceiptDate: "Receipt Date",
    colBalanceQtl: "Balance (Qtl)",
    colCurrentStatus: "Current Status",
    colQualityAction: "Quality Action",

    // FPS Requests View
    fpsRequestsTitle: "FAIR PRICE SHOP (FPS) REQUISITION QUEUE",
    fpsRequestsSubtitle: "Dealer Indents Received for Depot Fulfillment",
    colRequestId: "Request ID",
    colFpsOutlet: "FPS Outlet & Dealer",
    colCommodityRequested: "Commodity Requested",
    colDemandedQty: "Demanded (Qtl)",
    colFilingDate: "Filing Date",
    colQuickAction: "Quick Action",

    // Scanner & Gate Inward
    scannerGateTitle: "e-WAY BILL & MANDI TRANSIT PASS GATE INWARD",
    scannerSubhead: "Electronic Transit Pass Scanner",
    gateScannerActive: "GATE SCANNER ACTIVE",
    scannerDesc: "Scan the official GST e-Way Bill QR code from arrival trucks. Consignments are verified before gate admission.",
    lblSelectMandiPass: "Select Incoming Mandi Transit Pass:",
    btnScanPreset: "🔍 Scan & Decode Selected Transit Pass",
    btnStartCamera: "Turn On Camera",
    btnStopCamera: "Stop Camera",
    dropzoneTitle: "Drop e-Way Bill QR Image or Click to Browse",
    ewbVerified: "E-WAY BILL VERIFIED",
    btnConfirmDecoded: "📥 Authorize Gate Inward & Store Batch",
    directInwardTitle: "Direct Inward Entry",
    lblEwayBillNo: "e-Way Bill Number",
    lblWeightQtl: "Weight (Quintals)",
    lblSupplierAgency: "Supplier / Mandi Agency",
    lblAssignedStackBay: "Assigned Stack Bay",
    btnConfirmConsignment: "Confirm Consignment",

    // Challan Generator
    challanGenTitle: "CHALLAN GENERATOR & FIFO ALLOCATION ENGINE",
    dispatchParamsTitle: "Dispatch Requisition Parameters",
    allocationStrategy: "Allocation Strategy",
    btnChronologicalFifo: "⚡ Chronological FIFO",
    btnManualBatchSelection: "⚙️ Manual Batch Selection",
    lblSelectComm: "Select Commodity",
    lblDestFps: "Destination FPS Outlet",
    lblRequiredDispatchQty: "Required Dispatch Quantity (Quintals)",
    lblSelectBatchToIssue: "Select Inventory Batch to Issue:",
    sortedByArrival: "Sorted by Arrival Date",
    splitPreviewTitle: "FIFO Allocation Split Preview",
    splitPreviewEmpty: "Enter required grain demand and calculate the FIFO split to inspect multi-batch allocation details.",

    // History View
    historyTitle: "OUTWARD DISPATCH HISTORY & AUDIT LEDGER",
    colDeliveryChallan: "Delivery Challan",
    colDateTime: "Date & Time",
    colRecipientFps: "Recipient FPS",
    colIssuedQty: "Issued Qty (Qtl)",
    colAuthorizedOfficer: "Authorized Officer",
    colChallanAction: "Challan Action",

    // FPS Owner Navigation & Views
    navFpsDashboard: "Dashboard",
    navFpsRequisitions: "Requisitions",
    navFpsInventory: "Shop Inventory",
    navFpsReturns: "Return Stock",

    // FPS KPIs
    kpiPendingApproval: "PENDING APPROVAL",
    kpiPendingApprovalSub: "Awaiting Godown Action",
    kpiFpsTransit: "IN TRANSIT",
    kpiFpsTransitSub: "Dispatched & Arriving",
    kpiFpsDelivered: "TOTAL DELIVERED",
    kpiFpsDeliveredSub: "Successfully Received",

    // FPS Indent Form
    indentTitle: "Submit Stock Indent",
    indentSubtitle: "Request monthly quota replenishment from Central Godown.",
    lblUrgency: "Urgency Level",
    optRoutineQuota: "Routine Monthly Quota",
    optEmergencyQuota: "Emergency Depletion",
    lblReqMonth: "Requirement Month",
    subheadCommodities: "COMMODITY QUANTITIES (Quintals)",
    lblAdditionalRemarks: "Additional Remarks",
    btnClear: "Clear",
    btnSubmitIndent: "Submit Requisition",

    // FPS Shop Inventory
    shopInventoryTitle: "Shop Floor Inventory (Live Sync)",
    shopInventorySubtitle: "Real-time physical stock calculated automatically from delivered consignments minus returns.",
    btnReturnLeftoverTop: "🔄 Return Leftover Stock to Godown",
    colCommodityType: "Commodity Type",
    colAvailableNet: "Available Quantity (Net On-Floor)",
    colReverseLogistics: "Reverse Logistics Action",
    btnReturnToGodownAction: "🔄 Return to Godown",
    noFloorBalance: "No floor balance",

    // FPS Return Leftover Stock View
    returnStockTitle: "Reverse Logistics: Return Leftover Stock",
    returnStockSubtitle: "Dispatch unutilized monthly quota, excess buffer, or aging stock back to Central Warehousing Godown.",
    badgeRgp: "REVERSE GATE PASS (RGP)",
    lblSelectReturnComm: "Select Commodity to Return",
    chooseCommPrompt: "-- Choose Commodity Available on Floor --",
    lblReturnQty: "Return Quantity (Quintals)",
    lblReturnReason: "Statutory Reason for Return",
    optMonthSurplus: "End-of-Month Unutilized Quota Surplus",
    optMoistureDamage: "Moisture / Quality Degradation (Lab Testing)",
    optDepotRenovation: "Depot Maintenance / Space Reallocation",
    optQuotaAdjustment: "Administrative Quota Re-alignment",
    optDamagedBags: "Transit Damage / Bag Tearing (Gate Inspection)",
    optOtherReason: "Other Operational Rationale (Specify in remarks)",
    lblVehicleCarrier: "Transport Vehicle / Carrier Details",
    lblReceivingBay: "Receiving Godown Bay",
    lblDealerRemarks: "Dealer Manifest Remarks",
    btnSubmitReturnPass: "🔄 Transmit Return & Generate Gate Pass",
    returnsLedgerTitle: "Reverse Consignment & Return Gate Pass Ledger",
    returnsLedgerSubtitle: "Complete historical audit log of all stock returned to the Central Godown.",
    colGatePass: "Gate Pass (RGP)",
    colDateTime: "Date & Time",
    colReturnReason: "Reason Code",
    colGodownStatus: "Godown Status",
    colChallanAction: "Challan Action",
    btnViewGatePass: "📄 View Gate Pass",
    statusIngestedAtGodown: "INGESTED AT GODOWN",

    // Return Calculator Card
    calcCurrShopStock: "Current Available Shop Stock:",
    calcReturningToGodown: "Returning to Central Godown:",
    calcNetShopBalance: "Net Balance Remaining in Shop:"
  },

  hi: {
    // Brand & General
    brandName: "अन्नक्रम",
    deptTitle: "खाद्य एवं सार्वजनिक वितरण विभाग",
    depotSubtext: "डिपो-GRN-04: ग्रेटर नोएडा केंद्रीय बफर गोदाम | क्षेत्रीय डिपो: मेरठ मंडल",
    fpsLicenseSubtext: "FPS-NOD-101 • सेक्टर 12, नोएडा",
    fpsPortalTitle: "उचित दर विक्रेता (FPS) पोर्टल",
    govCloudSecure: "सरकारी क्लाउड सुरक्षित",
    profileOverview: "प्रोफ़ाइल विवरण",
    settings: "सेटिंग्स",
    signOut: "लॉग आउट",
    godownSuperintendent: "गोदाम अधीक्षक",
    fpsDealer: "उचित दर राशन डीलर",
    acknowledge: "स्वीकार करें",
    cancel: "रद्द करें",
    confirmAndProceed: "पुष्टि करें एवं आगे बढ़ें",
    systemNotice: "प्रणाली अधिसूचना",

    // Central Godown Navigation
    navCentralDashboard: "केंद्रीय डैशबोर्ड",
    navStackBays: "गोदाम",
    navIndentRequisitions: "एफपीएस अनुरोध",
    navActiveBatches: "ई-वे बिल स्कैनर",
    navFifoDispatch: "FIFO निकासी डिस्पैच",
    navDeliveryChallans: "चालान जनरेटर",
    navCompliance: "डिस्पैच इतिहास",

    // Central Godown KPIs
    kpiTotalDepotStock: "कुल बफर स्टॉक",
    kpiStorageLimit: "आवक स्टॉक",
    kpiWarehouseOccupancy: "वेयरहाउस ऑक्यूपेंसी दर",
    kpiOldestBatch: "सर्वप्रथम निकासी योग्य बैच",
    kpiAgingAlert: "विस्तारित भंडारण सूचना",
    kpiPendingIndents: "सेवा प्रदाता FPS केंद्र",
    kpiInTransit: "मार्गस्थ प्रेषण (ट्रांजिट)",

    // Commodity Names
    commWheat: "गेहूं (ग्रेड ए)",
    commRice: "कच्चा चावल (उसना/उबला)",
    commSugar: "रिफाइंड चीनी",
    commDal: "तूर / अरहर दाल",

    // Godown Gate Scanner & Stock Ingestion
    scanTitle: "स्वचालित ई-वे बिल / क्यूआर स्कैनर",
    scanSubtitle: "भारतीय खाद्य निगम (FCI) एवं राज्य नागरिक आपूर्ति पास स्कैन या अपलोड करें",
    tabPresets: "सत्यापित मंडी पास",
    tabCamera: "लाइव कैमरा",
    tabUpload: "क्यूआर फाइल अपलोड",
    mandiSelectHint: "सत्यापित राज्य सरकारी मंडी आवक पास चुनें:",
    startCamera: "कैमरा स्कैनर शुरू करें",
    stopCamera: "कैमरा बंद करें",
    dropzoneText: "मंडी ई-वे बिल क्यूआर कोड इमेज चुनें या ड्रैग करें",
    dropzoneSubtext: "PNG, JPG, WEBP ई-वे बिल फॉर्मेट समर्थित",
    manualIngestionTitle: "भौतिक खाद्यान्न आवक प्रविष्टि",
    manualIngestionSubtitle: "स्वचालित क्रमिक बैच आवंटन के साथ आधिकारिक स्टॉक आवक पंजीकरण",
    lblCommodity: "खाद्यान्न का प्रकार",
    lblSupplier: "आपूर्तिकर्ता / खरीद एजेंसी",
    lblStackLocation: "स्टैक / शेड भंडारण स्थान",
    lblNetQty: "प्राप्त शुद्ध मात्रा (क्विंटल में)",
    lblReceiptDate: "आवक रसीद दिनांक",
    lblAllocatedBatch: "आवंटित क्रमिक बैच संख्या",
    btnIngestStock: "गोदाम स्टॉक में आवक दर्ज करें",

    // Godown FIFO Dispatch
    dispatchTitle: "FIFO स्टॉक आवंटन एवं निकासी चालान",
    dispatchSubtitle: "केंद्रीय सार्वजनिक वितरण प्रणाली वैधानिक कालानुक्रमिक खाद्यान्न प्रेषण",
    lblTargetFps: "लक्षित उचित दर दुकान (FPS) चुनें",
    lblDispatchCommodity: "आवश्यक खाद्यान्न",
    lblDispatchQty: "आवश्यक डिस्पैच मात्रा (क्विंटल में)",
    lblAllocationMode: "स्टॉक आवंटन मोड",
    modeAutoFifo: "स्वचालित FIFO कालानुक्रम (केंद्रीय नियम)",
    modeManualBatch: "मैन्युअल बैच चयन (ऑडिट अपवाद)",
    btnCalculateFifo: "FIFO आवंटन विभाजन की गणना करें",
    btnConfirmDispatch: "आवंटन की पुष्टि करें एवं डिलीवरी चालान जारी करें",
    aiAdvisoryTitle: "जेमिनी AI स्टॉक जोखिम परामर्श",
    aiAdvisoryAction: "अधीक्षक परामर्श निर्देश:",

    // Godown Stacks & Batches
    batchesTitle: "डिपो बैच रजिस्टर एवं भंडारण आयु लेज़र",
    colBatchNo: "बैच नं.",
    colLocation: "स्टैक स्थान",
    colStorageAge: "भंडारण अवधि",
    colAgingGrade: "गुणवत्ता ग्रेड",
    colAvailableStock: "उपलब्ध शेष",
    colStatus: "डिपो स्थिति",
    colInitialQty: "कुल प्राप्त मात्रा",
    colSupplier: "स्त्रोत एजेंसी",

    // Central Godown Overview & Radar
    radarTitle: "FIFO प्राथमिकता निकासी रडार",
    radarSubtitle: "तत्काल प्राथमिकता से निकासी योग्य सबसे पुराने सक्रिय खाद्यान्न स्टैक",
    badgeRotationMandated: "निकासी अनिवार्य",
    colBatchId: "बैच पहचान संख्या",
    colCommodity: "खाद्यान्न प्रकार",
    colStackLocation: "स्टैक स्थान",
    colStorageDuration: "भंडारण अवधि",
    colRemainingQty: "अवशेष मात्रा",
    colMandatedAction: "अनिवार्य कार्रवाई",
    commDistributionTitle: "खाद्यान्न आरक्षित वितरण (डिपो कुल)",
    commDistributionSubtitle: "अनाज के प्रकार के अनुसार वर्तमान रीयल-टाइम भंडारण विवरण",

    // Warehouse Stacks View
    stacksInventoryTitle: "वेयरहाउस स्टैक इन्वेंटरी रजिस्टर",
    lblFilterGrain: "अनाज प्रकार फ़िल्टर करें:",
    optAllCommodities: "सभी खाद्यान्न",
    colDaysStored: "भंडारण दिवस",
    colReceiptDate: "आवक दिनांक",
    colBalanceQtl: "शेष मात्रा (क्विंटल)",
    colCurrentStatus: "वर्तमान स्थिति",
    colQualityAction: "गुणवत्ता कार्रवाई",

    // FPS Requests View
    fpsRequestsTitle: "उचित दर दुकान (FPS) मांग पत्र कतार",
    fpsRequestsSubtitle: "डिपो आपूर्ति हेतु प्राप्त राशन डीलर मांग पत्र",
    colRequestId: "मांग पत्र सं.",
    colFpsOutlet: "FPS दुकान एवं डीलर",
    colCommodityRequested: "मांग किया गया खाद्यान्न",
    colDemandedQty: "मांग मात्रा (क्विंटल)",
    colFilingDate: "आवेदन दिनांक",
    colQuickAction: "त्वरित कार्रवाई",

    // Scanner & Gate Inward
    scannerGateTitle: "ई-वे बिल एवं मंडी ट्रांजिट पास गेट आवक",
    scannerSubhead: "इलेक्ट्रॉनिक ट्रांजिट पास स्कैनर",
    gateScannerActive: "गेट स्कैनर सक्रिय",
    scannerDesc: "आवक ट्रकों से आधिकारिक जीएसटी ई-वे बिल क्यूआर कोड स्कैन करें। गेट प्रवेश से पूर्व खेप का सत्यापन किया जाता है।",
    lblSelectMandiPass: "आवक मंडी ट्रांजिट पास चुनें:",
    btnScanPreset: "🔍 चयनित ट्रांजिट पास को स्कैन एवं डिकोड करें",
    btnStartCamera: "कैमरा चालू करें",
    btnStopCamera: "कैमरा बंद करें",
    dropzoneTitle: "ई-वे बिल क्यूआर इमेज यहाँ डालें या फ़ाइल चुनें",
    ewbVerified: "ई-वे बिल सत्यापित",
    btnConfirmDecoded: "📥 गेट आवक अधिकृत करें एवं बैच सुरक्षित करें",
    directInwardTitle: "प्रत्यक्ष आवक प्रविष्टि",
    lblEwayBillNo: "ई-वे बिल संख्या",
    lblWeightQtl: "मात्रा (क्विंटल में)",
    lblSupplierAgency: "आपूर्तिकर्ता / मंडी एजेंसी",
    lblAssignedStackBay: "आवंटित स्टैक बे",
    btnConfirmConsignment: "खेप आवक की पुष्टि करें",

    // Challan Generator
    challanGenTitle: "चालान जनरेटर एवं FIFO आवंटन प्रणाली",
    dispatchParamsTitle: "प्रेषण मांग मापदंड",
    allocationStrategy: "आवंटन रणनीति",
    btnChronologicalFifo: "⚡ कालानुक्रमिक FIFO",
    btnManualBatchSelection: "⚙️ मैन्युअल बैच चयन",
    lblSelectComm: "खाद्यान्न चुनें",
    lblDestFps: "गंतव्य उचित दर दुकान",
    lblRequiredDispatchQty: "आवश्यक डिस्पैच मात्रा (क्विंटल में)",
    lblSelectBatchToIssue: "जारी करने हेतु इन्वेंटरी बैच चुनें:",
    sortedByArrival: "आगमन दिनांक अनुसार व्यवस्थित",
    splitPreviewTitle: "FIFO आवंटन विभाजन पूर्वावलोकन",
    splitPreviewEmpty: "आवश्यक अनाज मांग दर्ज करें और बहु-बैच आवंटन विवरण देखने के लिए FIFO विभाजन की गणना करें।",

    // History View
    historyTitle: "निकासी डिस्पैच इतिहास एवं ऑडिट लेज़र",
    colDeliveryChallan: "डिलीवरी चालान",
    colDateTime: "दिनांक एवं समय",
    colRecipientFps: "प्राप्तकर्ता FPS",
    colIssuedQty: "जारी मात्रा (क्विंटल)",
    colAuthorizedOfficer: "अधिकृत अधिकारी",
    colChallanAction: "चालान कार्रवाई",

    // FPS Owner Navigation & Views
    navFpsDashboard: "डैशबोर्ड",
    navFpsRequisitions: "मांग पत्र (इंडेंट)",
    navFpsInventory: "दुकान का स्टॉक",
    navFpsReturns: "गोदाम को वापसी",

    // FPS KPIs
    kpiPendingApproval: "स्वीकृति हेतु लंबित",
    kpiPendingApprovalSub: "गोदाम कार्रवाई की प्रतीक्षा",
    kpiFpsTransit: "मार्गस्थ (ट्रांजिट)",
    kpiFpsTransitSub: "गोदाम से रवाना / आ रहा है",
    kpiFpsDelivered: "कुल प्राप्त स्टॉक",
    kpiFpsDeliveredSub: "सफलतापूर्वक प्राप्त एवं सत्यापित",

    // FPS Indent Form
    indentTitle: "मासिक राशन कोटा मांग पत्र प्रस्तुत करें",
    indentSubtitle: "केंद्रीय गोदाम से मासिक कोटे के पुनर्भरण का अनुरोध करें।",
    lblUrgency: "प्राथमिकता / तात्कालिकता स्तर",
    optRoutineQuota: "नियमित मासिक कोटा आवंटन",
    optEmergencyQuota: "आपातकालीन स्टॉक समाप्ति",
    lblReqMonth: "आवश्यकता का महीना",
    subheadCommodities: "खाद्यान्न मात्राएं (क्विंटल में)",
    lblAdditionalRemarks: "अतिरिक्त टिप्पणी / विशेष निर्देश",
    btnClear: "साफ़ करें",
    btnSubmitIndent: "मांग पत्र प्रेषित करें",

    // FPS Shop Inventory
    shopInventoryTitle: "दुकान का वास्तविक भौतिक स्टॉक (लाइव सिंक)",
    shopInventorySubtitle: "गोदाम से प्राप्त कुल खाद्यान्न में से लौटाई गई मात्रा घटाकर स्वचालित गणना।",
    btnReturnLeftoverTop: "🔄 गोदाम को अधिशेष स्टॉक लौटाएं",
    colCommodityType: "खाद्यान्न का प्रकार",
    colAvailableNet: "उपलब्ध शुद्ध मात्रा (दुकान में)",
    colReverseLogistics: "स्टॉक वापसी विकल्प",
    btnReturnToGodownAction: "🔄 गोदाम को वापसी",
    noFloorBalance: "दुकान में स्टॉक नहीं है",

    // FPS Return Leftover Stock View
    returnStockTitle: "रिवर्स लॉजिस्टिक्स: अधिशेष स्टॉक गोदाम को वापसी",
    returnStockSubtitle: "अप्रयुक्त मासिक कोटा, अतिरिक्त बफर या पुराना स्टॉक केंद्रीय वेयरहाउसिंग गोदाम को लौटाएं।",
    badgeRgp: "रिवर्स गेट पास (RGP)",
    lblSelectReturnComm: "वापस करने हेतु खाद्यान्न चुनें",
    chooseCommPrompt: "-- दुकान में उपलब्ध खाद्यान्न चुनें --",
    lblReturnQty: "वापसी मात्रा (क्विंटल में)",
    lblReturnReason: "स्टॉक वापसी का वैधानिक कारण",
    optMonthSurplus: "माह के अंत में बचा हुआ अप्रयुक्त कोटा",
    optMoistureDamage: "नमी / गुणवत्ता गिरावट (प्रयोगशाला परीक्षण हेतु)",
    optDepotRenovation: "दुकान रखरखाव / स्थान पुनर्वितरण",
    optQuotaAdjustment: "प्रशासनिक राशन कोटा समायोजन",
    optDamagedBags: "परिवहन क्षति / बोरियां फटना (गेट निरीक्षण)",
    optOtherReason: "अन्य परिचालन कारण (टिप्पणी में दर्ज करें)",
    lblVehicleCarrier: "परिवहन वाहन / वाहक विवरण",
    lblReceivingBay: "प्राप्तकर्ता गोदाम बे स्थान",
    lblDealerRemarks: "डीलर मेनिफेस्ट टिप्पणी",
    btnSubmitReturnPass: "🔄 वापसी प्रेषित करें एवं रिवर्स गेट पास जारी करें",
    returnsLedgerTitle: "रिवर्स कंसाइनमेंट एवं रिटर्न गेट पास रजिस्टर",
    returnsLedgerSubtitle: "केंद्रीय गोदाम को लौटाए गए सभी खाद्यान्न स्टॉक का संपूर्ण ऐतिहासिक ऑडिट रिकॉर्ड।",
    colGatePass: "गेट पास (RGP)",
    colDateTime: "दिनांक एवं समय",
    colReturnReason: "कारण कोड",
    colGodownStatus: "गोदाम स्थिति",
    colChallanAction: "चालान कार्रवाई",
    btnViewGatePass: "📄 गेट पास देखें",
    statusIngestedAtGodown: "गोदाम में स्वीकार",

    // Return Calculator Card
    calcCurrShopStock: "दुकान में वर्तमान उपलब्ध स्टॉक:",
    calcReturningToGodown: "केंद्रीय गोदाम को लौटाया जा रहा है:",
    calcNetShopBalance: "दुकान में शेष रहने वाला शुद्ध स्टॉक:"
  }
};

/**
 * Get current persisted language (default 'en')
 */
function getCurrentLanguage() {
  return localStorage.getItem('annakram_lang') || 'en';
}

/**
 * Set and persist active language ('en' | 'hi')
 */
function setCurrentLanguage(lang) {
  const target = (lang === 'hi') ? 'hi' : 'en';
  localStorage.setItem('annakram_lang', target);
  applyAnnaKramLanguage(target);
}

/**
 * Global text lookup helper
 */
function getI18nText(key, defaultVal = '') {
  const lang = getCurrentLanguage();
  return ANNAKRAM_I18N[lang]?.[key] || ANNAKRAM_I18N['en']?.[key] || defaultVal || key;
}

/**
 * Applies the selected language to the DOM
 */
function applyAnnaKramLanguage(lang) {
  const currentLang = (lang === 'hi') ? 'hi' : 'en';
  localStorage.setItem('annakram_lang', currentLang);
  const dict = ANNAKRAM_I18N[currentLang];

  // 1. Update Lang Switcher Buttons State
  const btnEn = document.getElementById('langEn');
  const btnHi = document.getElementById('langHi');
  if (btnEn && btnHi) {
    if (currentLang === 'hi') {
      btnHi.classList.add('active');
      btnEn.classList.remove('active');
    } else {
      btnEn.classList.add('active');
      btnHi.classList.remove('active');
    }
  }

  // 2. Translate all elements with data-i18n attributes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // 3. Translate all elements with data-i18n-html attributes
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  // 4. Translate all elements with data-i18n-placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.placeholder = dict[key];
    }
  });

  // 5. Update HTML lang attribute
  document.documentElement.lang = currentLang;

  // 6. Notify page-specific controllers if they have custom re-render hooks
  if (typeof window.onAnnaKramLanguageChanged === 'function') {
    window.onAnnaKramLanguageChanged(currentLang);
  }
}

/**
 * Auto-initialize language switcher listeners on DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
  const btnEn = document.getElementById('langEn');
  const btnHi = document.getElementById('langHi');

  if (btnEn) {
    btnEn.addEventListener('click', () => setCurrentLanguage('en'));
  }
  if (btnHi) {
    btnHi.addEventListener('click', () => setCurrentLanguage('hi'));
  }

  // Apply persisted language on load
  const initialLang = getCurrentLanguage();
  applyAnnaKramLanguage(initialLang);
});

// Expose globally
window.ANNAKRAM_I18N = ANNAKRAM_I18N;
window.getCurrentLanguage = getCurrentLanguage;
window.setCurrentLanguage = setCurrentLanguage;
window.getI18nText = getI18nText;
window.applyAnnaKramLanguage = applyAnnaKramLanguage;
