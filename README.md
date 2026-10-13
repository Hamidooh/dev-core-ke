# DEV CORE KE (Silicon Savannah & Worldwide Tech Platform)

> A high-performance, full-stack platform built specifically for the **Kenyan software engineering community** to discover, analyze, and countercheck software engineering roles across the worldwide work pool and local ecosystem.

---

## 🌟 Strategic Focus & Core Highlights

1. **Strategic Kenyan & Global Work Pool Coverage**:
   - **Local Kenyan Ecosystem**: Roles in Nairobi (Westlands, Kilimani, Upper Hill, CBD), Mombasa, Kisumu, Eldoret across tech giants (Safaricom, Microsoft ADC Nairobi, Google Africa Hub, Equity Group, KCB Bank, Cellulant, Pesapal, Twiga, Tala, Little App, Craft Silicon).
   - **Worldwide Remote (Kenya-Accessible)**: Global companies hiring in Kenya via Employer of Record (EOR like Deel, Remote.com) or direct contractor agreements (GitLab, Canonical, Automattic, Turing, BairesDev) with USD compensation.

2. **Complete Computer Science Seniority Spectrum (Attachment → CTO)**:
   - **Industrial Attachment**: University & polytechnic students (JKUAT, UoN, Strathmore, KU, Dekut) fulfilling academic units under NITA accreditation with stipend and logbook tracking.
   - **Internship / Graduate Trainee**: 6-12 month paid apprenticeships (e.g. Microsoft ADC Apprenticeship, Safaricom Discover).
   - **Junior Developer (0 - 2 Yrs)**: Entry-level foundational engineering roles.
   - **Mid-Level Developer (2 - 5 Yrs)**: Autonomous microservices, cloud deployments, and feature delivery.
   - **Senior Developer / Staff Engineer (5+ Yrs)**: High-scale distributed architectures, system design, and mentoring.
   - **Lead Manager / Engineering Manager**: Agile squad leadership, developer coaching, and cross-functional execution.
   - **CTO / VP of Engineering**: Technical strategy, CBK/Data Protection Act compliance, board governance, and equity (ESOP).

3. **Autonomous Organization Credibility & Scam Shield Engine**:
   - **BRS Verification (Business Registration Service Kenya)**: Flags registered entities vs phantom operators.
   - **Scam & Phishing Shield**: Detects illegal fee requests (M-Pesa interview/badge fees violate Kenyan Employment Act 2007), unverified free domains (`@gmail.com` for corporate recruiters), throwaway websites, and unrealistic "get-rich-quick" offers.
   - **Composite Trust Score (0 - 100)**: Transparent score calculation based on domain verification, entity track record, and community endorsements.
   - **Interactive Credibility Auditor**: Paste any external job offer, WhatsApp forward, or email to perform an automated instant legitimacy audit.

4. **Kenyan Developer Review & Culture Hub**:
   - Anonymous developer feedback on engineering culture, management transparency, overtime expectations, and **on-time salary/M-Pesa payment reliability**.

5. **Market Salary Benchmarks & Analytics (KES & USD)**:
   - Real-world salary ranges from Attachment stipend (`KES 25,000 - 35,000`) up to CTO compensation (`KES 900,000 - 1,800,000+` / `$7,000 - $14,000+`).
   - In-demand tech stack ratings in Kenya (React/Next.js, Go, Python/FastAPI, Flutter, AWS/Kubernetes, M-Pesa Daraja APIs).

---

## 🚀 Quick Start Instructions

The application is completely self-contained using **Node.js 24 native features** (built-in HTTP server and built-in SQLite engine with zero external npm dependency overhead).

### 1. Start the Platform Server
```bash
node server.js
```

### 2. Access the Application
Open your web browser and navigate to:
```
http://localhost:3000
```

---

## 🛠️ Architecture & API Endpoints

- **Server Engine**: Node.js 24 native HTTP module (`server.js`)
- **Database**: Built-in SQLite database (`data/devcircle.sqlite` via `node:sqlite`)
- **Frontend**: Responsive Single-Page Application (`public/index.html`, `public/app.js`, `public/style.css`, Tailwind CSS, FontAwesome)

### REST API Documentation
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs` | Search & filter jobs by keyword, seniority, domain, location type, and minimum credibility score |
| `GET` | `/api/jobs/:id` | Retrieve detailed information for a specific job |
| `POST` | `/api/jobs` | Submit a new job offer with automated algorithmic credibility audit |
| `POST` | `/api/credibility-check` | Run a deep credibility & scam audit on any company or job offer |
| `GET` | `/api/reviews` | Retrieve anonymous developer reviews, filterable by company |
| `POST` | `/api/reviews` | Submit an anonymous developer review (stored in SQLite) |
| `GET` | `/api/analytics` | Retrieve market salary benchmarks (KES/USD) and in-demand skills |
| `GET` | `/api/roles-guide` | Comprehensive strategic guide of all 7 seniority levels for Kenyans |
