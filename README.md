# 🌾 AnnaKram — Intelligent PDS FIFO Grain Lifecycle Management Portal

> **Next-Generation Public Distribution System (iPDS) Stock Management & Automated FIFO Compliance Engine**

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-black?logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini_AI-2.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

---

## 📌 Overview

**AnnaKram** (अन्नक्रम - *Chronological Foodgrain Order*) is an enterprise GovTech platform engineered to solve foodgrain wastage, inventory spoilage, and non-compliance in the Indian Public Distribution System (PDS). 

By enforcing strict **First-In, First-Out (FIFO)** and **First-Expired, First-Out (FEFO)** algorithms backed by **Google Gemini AI predictive analytics**, AnnaKram ensures that older grain consignments are dispatched before newer arrivals, minimizing transit loss and quality degradation across central godowns and Fair Price Shops (FPS).

---

## ✨ Key Features

### 1. 🔄 Deterministic FIFO & FEFO Allocation Engine
- **Automated Batch Sorting**: Incoming dispatch requests automatically pull the oldest compliant batches (by procurement/inward date and expiry).
- **Mandatory Compliance Override Guard**: If a godown operator bypasses an older batch, the system triggers a strict modal requiring explicit justification (e.g., quality quarantine, moisture issue, pest inspection) and logs it for auditing.

### 2. 📷 QR Code & e-Way Bill Ingestion
- Real-time optical scanner powered by `html5-qrcode` supporting both live camera feeds and document image uploads.
- Deterministic parsing of batch numbers, commodity types, grain grades, moisture levels, and net metric tonnage.

### 3. 🤖 Gemini AI Predictive Spoilage Risk Analyzer
- Utilizes Google Gemini (`@google/genai`) to evaluate moisture percentage, storage humidity, godown temperature, and bag dwell time.
- Generates proactive risk scores (Low, Medium, High, Critical) and recommends immediate dispatch prioritization for vulnerable grain lots.

### 4. 🏢 Dual Role-Based Stakeholder Portals
- **Central Godown Portal (`dashboard.html`)**:
  - Live stock metrics (Total metric tons, grain distribution, storage utilization).
  - Outward dispatch approval workflows and delivery challan generation with instant high-resolution image export (`html2canvas`).
  - Stock return verification from FPS dealers.
- **Fair Price Shop (FPS) Portal (`fps.html`)**:
  - Monthly quota requisition placement.
  - Consignment delivery verification and acknowledgement.
  - Leftover surplus return module to ship unallocated grain back to the central godown.

### 5. 🌐 Multilingual Accessibility (i18n)
- Seamless real-time language toggling between **English** and **Hindi (हिन्दी)** across all portal views and modals.

### 6. 🔐 Secure Authentication & Session Management
- Integrated with **Supabase Authentication**.
- Protected endpoints with optional Bearer token validation and role-based redirect routing for Godown Managers and FPS Dealers.

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Node.js, Express.js (v5)
- **Database**: PostgreSQL (via Supabase / `pg` connection pool)
- **AI / LLM**: Google Gemini API (`@google/genai`)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), `html5-qrcode`, `html2canvas`
- **Identity & Auth**: Supabase Auth Client & JWT Verification

---

## 📁 Project Structure

```text
AnnaKram/
├── controllers/
│   ├── batchController.js          # Inward batch creation, FIFO allocation, override tracking
│   ├── dispatchController.js       # Dispatch approval, challan creation, tracking
│   ├── reportController.js         # Inventory summaries, compliance analytics
│   └── requisitionsController.js   # FPS dealer quota requests & leftover return workflows
├── routes/
│   ├── batchRoutes.js              # /api/batches
│   ├── dispatchRoutes.js           # /api/dispatches
│   ├── reportRoutes.js             # /api/reports
│   └── requisitionRoutes.js        # /api/requisitions
├── services/
│   └── airiskChecker.js            # Gemini AI grain spoilage & shelf-life prediction
├── public/
│   ├── login.html / login.js       # GovTech authentication portal
│   ├── dashboard.html / .js        # Central Godown Manager command center
│   ├── fps.html / fps.js           # Fair Price Shop dealer portal
│   ├── i18n.js                     # Multilingual translation dictionary & switcher
│   ├── supabaseClient.js           # Supabase client singleton
│   └── favicon.svg                 # Vector brand favicon
├── db.js                           # PostgreSQL connection pool with reconnection logic
├── server.js                       # Express app bootstrap & route registration
├── package.json                    # Project dependencies and run scripts
├── .env.example                    # Environment variable configuration template
└── .gitignore                      # Git exclusion rules (node_modules, credentials, etc.)
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) database or a free [Supabase](https://supabase.com/) account
- [Google AI Studio](https://aistudio.google.com/) Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aryan-kr-jha/AnnaKram.git
   cd AnnaKram
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your credentials:
   ```env
   PORT=9765
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   GEMINI_API_KEY=your_gemini_api_key_here
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Open in browser:**
   - Login Portal: `http://localhost:9765/login.html`
   - Godown Dashboard: `http://localhost:9765/dashboard.html`
   - FPS Portal: `http://localhost:9765/fps.html`

---

## 🛡️ FIFO Compliance Workflow

```
[ New Requisition Received from FPS ]
                 │
                 ▼
[ AnnaKram Auto-Allocation Engine ]
                 │
  ┌──────────────┴──────────────┐
  │                             │
[ Oldest Compliant Batch ]    [ Operator Manually Overrides ]
  │                             │
  │                             ▼
  │                   [ Compliance Warning Modal ]
  │                             │
  │                   * Select Reason Code
  │                   * Enter Audit Remarks
  │                             │
  └──────────────┬──────────────┘
                 ▼
     [ Challan Generated with QR ]
                 │
                 ▼
  [ Delivery to FPS / Return Sync ]
```

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!
Feel free to open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
