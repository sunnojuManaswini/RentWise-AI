# RENTWISE — AI RENTAL & TENANT ASSISTANT

RentWise is a production-style, modern full-stack rental management platform designed for property owners and tenants. It manages the entire rental lifecycle—from multi-property hierarchies, buildings, floors, and units to tenant assignments, rent ledgers, deposit settlements, maintenance tickets, evidence lockers, WhatsApp summary sharing, and an authorized RAG-based AI Rental Assistant.

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC)**:
   - **OWNER**: Manage properties, buildings, floors, units, assign tenants, generate rent obligations, record payments, calculate move-out deposit settlements, manage maintenance work orders, and query authorized property AI context.
   - **TENANT**: View assigned property/unit details, check rent due dates, record full/partial payments with receipt proofs, file maintenance requests, upload photo evidence, view security deposits, and chat with AI regarding their specific lease.

2. **Property Hierarchy Architecture**:
   - `Property` → `Building` → `Floor` → `Unit` → `Tenant`
   - Complete property specifications: addresses, GPS coordinates, bedrooms, bathrooms, area sqft, parking, elevator, furnishing status, rent due day, notice period.

3. **Complete Rent Ledger Engine**:
   - Explicit separation of **Rent Obligations** and **Rent Payment Transactions**.
   - Supports **Full Payment**, **Partial Payment**, **Multiple Partial Payments**, and **Advance Payment**.
   - Real-time live status recalculations: `PAID`, `PARTIAL`, `PENDING`, `OVERDUE`, `ADVANCE`.
   - Payment method recording (UPI, Bank Transfer, Cash, Card, Cheque) and receipt upload.

4. **Security Deposit & Move-out Settlement**:
   - Automatic deduction tracking: Wall repairs, outstanding rent arrears, deep cleaning fees.
   - Live automated final refund calculation: `Final Refund = Original Deposit - Total Deductions`.

5. **AI Rental Assistant & Document Understanding**:
   - **RAG Engine**: Retrieves authorized database records and agreement clauses based strictly on the user's role before forming LLM context.
   - **Zero Data Leakage**: Tenants cannot access another tenant's data or unauthorized property records.
   - **Multilingual UI & AI**: Full support for **English**, **Telugu (తెలుగు)**, and **Hindi (हिंदी)**.
   - **AI Agreement Parsing**: Extracts rent amount, security deposit, notice period, and key clauses automatically upon contract upload.

6. **Evidence Locker**:
   - Store and view photos, screenshots, repair receipts, and payment proofs linked directly to maintenance work orders or rent transactions.

7. **WhatsApp Sharing Integration**:
   - One-click formatted WhatsApp text generation with prefilled `https://wa.me/?text=...` launch buttons for:
     1. Rent Payment Receipts
     2. Pending Rent Reminders
     3. Monthly Rent Summaries
     4. Maintenance Status Updates
     5. Move-out Deposit Settlements

---

## 🏗️ Project Architecture & Directory Structure

```
RENTWISE — AI RENTAL & TENANT ASSISTANT/
├── client/                     # Frontend React (Vite + Tailwind CSS + Lucide Icons)
│   ├── src/
│   │   ├── components/        # Common UI, Navbar, Sidebar, Modals (WhatsApp & AI)
│   │   ├── context/           # AuthContext, LanguageContext
│   │   ├── pages/             # Dashboard, Properties, Units, Tenants, Ledger, etc.
│   │   ├── translations/      # English, Telugu, Hindi dictionaries
│   │   ├── App.jsx            # Routing and Protected Layout
│   │   └── main.jsx           # Entry point
│   ├── vite.config.js
│   └── Dockerfile
│
├── server/                     # Backend Node.js + Express REST API
│   ├── src/
│   │   ├── config/            # DB connection (MySQL + fallback SQLite)
│   │   ├── controllers/       # Auth, Property, Ledger, Deposit, Maintenance, AI, etc.
│   │   ├── database/          # schema.sql & seed.sql
│   │   ├── middleware/        # Auth JWT, Role RBAC, Multer file upload
│   │   ├── routes/            # Express API master router
│   │   ├── services/          # RAG AI Engine & Document Parser
│   │   ├── utils/             # JWT, Ledger status calculator, WhatsApp formatter
│   │   ├── app.js             # Express app setup
│   │   └── index.js           # Server startup
│   └── Dockerfile
│
├── uploads/                    # Secure storage for receipts, evidence, agreements
├── docker-compose.yml          # Container setup (MySQL 8.0, Backend, Frontend Nginx)
├── .env.example                # Environment variables template
└── README.md                   # Documentation
```

---

## 🗄️ Database Schema & Normalization

The MySQL database contains normalized tables with foreign keys and cascade constraints:

1. `users`: User accounts, hashed passwords, roles (`OWNER`, `TENANT`).
2. `properties`: Property details, location specs, coordinates.
3. `buildings`: Multi-building mapping under properties.
4. `floors`: Floor mapping under buildings.
5. `units`: Individual flats/units, monthly rent, deposit, occupancy status (`VACANT`, `OCCUPIED`).
6. `tenants`: Active & past tenant lease mapping.
7. `rental_agreements`: Lease dates, notice periods, document URLs, extracted terms JSON.
8. `rent_obligations`: Monthly due rent records (`period_month`, `due_date`, `total_due`, `status`).
9. `rent_payments`: Individual payment transactions (`amount_paid`, `payment_method`, `receipt_url`).
10. `deposit_transactions`: Move-out settlement deductions and net refund calculations.
11. `maintenance_requests`: Issue tickets, priority levels, categories, repair statuses.
12. `documents`: Vault storing files, MIME types, sizes.
13. `evidence`: Photo/screenshot evidence linked to tickets or payments.
14. `notifications`: Alert notifications for due dates and updates.
15. `ai_conversations` & `ai_messages`: User chat history and RAG context logs.

---

## 🔑 Demo Accounts (Instant Test Setup)

The system is pre-seeded with test accounts for instant evaluation:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Property Owner** | `owner@rentwise.com` | `Password123!` |
| **Tenant** | `tenant@rentwise.com` | `Password123!` |
| **Secondary Tenant**| `priya@rentwise.com` | `Password123!` |

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root or `server` directory:

```env
PORT=5000
JWT_SECRET=rentwise_super_secret_jwt_key_2026

# MySQL Connection (Local or Aiven Cloud MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rentwise_db
DB_SSL=false

# Google Gemini API Key for Live AI
GEMINI_API_KEY=your_gemini_api_key_here
```

### ☁️ Connecting to Aiven Cloud MySQL
To connect RentWise to Aiven Cloud MySQL:
1. Copy the host, port, username, password from your Aiven MySQL dashboard.
2. Set `DB_HOST=<aiven-mysql-host>.aivencloud.com`, `DB_PORT=XXXXX`, `DB_USER=avnadmin`, `DB_PASSWORD=<password>`, and `DB_SSL=true`.
3. RentWise automatically creates all tables and populates seed data on first boot!

---

## 🚀 Local Development Setup Guide

### Step 1: Start Backend Server
```bash
cd server
npm install
node src/index.js
```
The backend API server will run on `http://localhost:5000/api`.

### Step 2: Start Frontend Application
```bash
cd client
npm install
node node_modules/vite/bin/vite.js
```
The frontend Vite server will run on `http://localhost:3000`.

---

## 🐳 Docker Deployment Guide

To launch the complete production stack (MySQL 8.0, Backend Node container, Frontend Nginx container):

```bash
docker-compose up --build -d
```

- **Frontend**: Access at `http://localhost:3000`
- **Backend API**: Access at `http://localhost:5000/api`
- **MySQL DB**: Listening on port `3306`

---

## 🧪 Comprehensive Verification & Testing Checklist

1. **Authentication & RBAC**:
   - Log in using Owner demo account -> Verify Owner Dashboard and Property controls.
   - Log in using Tenant demo account -> Verify isolation (Tenant only sees Unit G01 and their own ledger/agreements).

2. **Property Hierarchy**:
   - Expand property tree -> Verify Property → Building A → Floor 0 → Unit G01.

3. **Rent Ledger Partial Payments**:
   - Select October 2026 rent obligation (Total ₹16,500).
   - Record payment 1 (₹5,000) -> Status updates to `PARTIAL`.
   - Record payment 2 (₹5,000) -> Balance updates to ₹6,500.

4. **Deposit Settlement**:
   - Open Move-Out Settlement calculator -> Set Original Deposit = ₹30,000, Wall Repair = ₹3,000, Cleaning = ₹2,000 -> Verify final refund is automatically calculated as ₹25,000.

5. **AI Assistant**:
   - Ask "When is my rent due?" or "నా అద్దె ఎప్పుడు చెల్లించాలి?" -> Verify contextual RAG answer with legal disclaimer.

6. **WhatsApp Sharing**:
   - Click "WhatsApp" -> Select "Rent Summary" -> Click "Share Directly on WhatsApp" -> Opens prefilled WhatsApp link.

---

## 📜 License & Accreditation

Developed for **RentWise — AI Rental & Tenant Assistant**. Built with React, Vite, Node.js, Express, MySQL, Tailwind CSS, and Google Gemini API.
