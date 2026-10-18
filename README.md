<div align="center">

# 🇰🇪 DEV CORE KE
### Silicon Savannah & Worldwide Tech Platform

> **A high-performance, full-stack platform built specifically for the Kenyan software engineering community to discover, analyze, and countercheck verified engineering roles across the worldwide work pool and local ecosystem.**

<p align="center">
  <a href="https://github.com/Hamidooh/dev-core-ke/fork">
    <img src="https://img.shields.io/badge/🍴_FORK_REPO-00ffff?style=for-the-badge&logo=github&logoColor=black&labelColor=000000" alt="Fork Repo" width="220"/>
  </a>
  <a href="https://github.com/Hamidooh/dev-core-ke">
    <img src="https://img.shields.io/badge/⭐_STAR_REPO-8a2be2?style=for-the-badge&logo=github&logoColor=white&labelColor=000000" alt="Star Repo" width="220"/>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-24%20%7C%2022%20%7C%2020-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js Version"/>
  <img src="https://img.shields.io/badge/Dependencies-Zero%20External%20npm-blue?style=flat-square&logo=npm&logoColor=white" alt="Zero Dependencies"/>
  <img src="https://img.shields.io/badge/Database-Native%20node%3Asqlite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite Engine"/>
  <img src="https://img.shields.io/badge/Application%20Routing-100%25%20Direct%20ATS-00C853?style=flat-square&logo=checkmarx&logoColor=white" alt="100% Direct ATS"/>
  <img src="https://img.shields.io/badge/Security-Anti--DoS%20Shield%20Active-critical?style=flat-square&logo=shield&logoColor=white" alt="Anti-DoS Shield"/>
  <img src="https://img.shields.io/badge/License-MIT-blueviolet?style=flat-square" alt="License"/>
</p>

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Core Platform Capabilities](#-core-platform-capabilities)
  - [1. 100% Direct Application Rerouting & Official Requisitions](#1-100-direct-application-rerouting--official-requisitions)
  - [2. Autonomous Scam Shield & BRS Credibility Engine](#2-autonomous-scam-shield--brs-credibility-engine)
  - [3. Autonomous Hourly Role Scanner with 10-Minute Anti-DoS Gate](#3-autonomous-hourly-role-scanner-with-10-minute-anti-dos-gate)
  - [4. Dedicated Decoupled Admin Mission Control](#4-dedicated-decoupled-admin-mission-control)
  - [5. Seniority Spectrum & Market Salary Intel](#5-seniority-spectrum--market-salary-intel)
  - [6. Anonymous Developer Reviews & Workplace Culture Hub](#6-anonymous-developer-reviews--workplace-culture-hub)
- [System Architecture](#-system-architecture)
- [Seniority Benchmark Spectrum](#-seniority-benchmark-spectrum)
- [Quick Start Guide](#-quick-start-guide)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [REST API Reference](#-rest-api-reference)
- [Security & Privacy Architecture](#-security--privacy-architecture)
- [Contributing & License](#-contributing--license)

---

## 🌍 Overview

**DEV CORE KE** is an engineering intelligence and job aggregation platform designed for Kenyan developers navigating the modern technical workforce. It connects software engineers across Kenya (Nairobi Silicon Savannah, Mombasa, Kisumu, Eldoret, and beyond) with verified local tech employers and high-paying worldwide remote roles.

Unlike traditional job boards that aggregate dead links, redirect candidates through invasive marketing intermediaries, or list predatory scams charging M-Pesa interview fees, DEV CORE KE enforces strict **algorithmic credibility vetting**, **sub-millisecond DoS rate-limiting**, and **100% direct-to-ATS requisition routing**.

---

## 🌟 Core Platform Capabilities

### 1. 100% Direct Application Rerouting & Official Requisitions
* **Zero Intermediary Redirects:** Every listed position routes candidates directly to the employer's official Applicant Tracking System (ATS) or primary verified listing. Candidates are never bounced to generic homepages, unverified third-party aggregators, or expired URLs.
* **Integrated Enterprise ATS Links:**
  * **Oracle Taleo:** Direct links to live requisitions for Safaricom (`safaricom.taleo.net`), Equity Group (`equitybank.taleo.net`), Co-operative Bank, Stanbic, and Kenya Airways.
  * **Microsoft Careers Portal:** Direct requisitions for Microsoft Africa Development Centre (`jobs.careers.microsoft.com`).
  * **Greenhouse & BambooHR:** Direct application links for Tala, Twiga Foods, Andela, Flutterwave, Cellulant, Pesapal, and Craft Silicon (Little App).
  * **Government & Parastatal Portals:** Official recruitment links for KRA eTIMS (`erecruitment.kra.go.ke`), Central Bank of Kenya (CBK), Presidential Digital Talent Programme (PDTP), and NITA.
* **Official Fingerprint Requisition Badges:** Every card and modal showcases the exact employer requisition identifier (e.g. `#SAF-ATT-4091`, `#MSFT-ADC-17849`, `#EQB-SEC-7712`).

### 2. Autonomous Scam Shield & BRS Credibility Engine
* **Business Registration Service (BRS) Verification:** Cross-checks company registration details against verified Kenyan commercial registries to flag phantom entities.
* **Kenyan Employment Act 2007 Compliance:** Automatically identifies and red-flags fraudulent postings demanding upfront fees via M-Pesa for "interview bookings", "security badges", or "courier fees".
* **Algorithmic Trust Score (0–100):** Calculates a composite confidence metric evaluated on corporate domain verification, official email MX records, salary realism, and historical community reviews.
* **Interactive Scam Auditor:** Allows engineers to paste suspicious job offers, WhatsApp forwards, or recruiter emails to receive an instant, multi-factor legitimacy diagnosis.

### 3. Autonomous Hourly Role Scanner with 10-Minute Anti-DoS Gate
* **Continuous Multi-Source Ingestion:** Ingests live developer vacancies every 60 minutes across Arbeitnow, RemoteOK, Remotive, Jobicy, curated LinkedIn feeds, and the Kenyan Tech Ecosystem.
* **Sub-Millisecond Fast-Exit Gates (`<0.01ms`):**
  * **In-Memory Mutex Lock:** Instantly deflects duplicate scan triggers while an active run is in flight (`status: 'already_running'`).
  * **10-Minute Freshness Shield:** Rejects redundant scans if the last completed run was within 10 minutes (`status: 'cached'`), protecting upstream API quotas and shielding the server from distributed DoS spikes.
  * **Reboot Resilience:** Recovers the timestamp of the last completed run from `scanner_logs` across server restarts to maintain consistent cooldown state.
* **24/7 Keep-Alive Self-Heartbeat:** Built-in 10-minute heartbeat (`/api/ping`) that keeps cloud instances (such as Render free-tier containers) active without spin-down.

### 4. Dedicated Decoupled Admin Mission Control
* **Isolated Private Portal:** Completely separated from the public-facing client interface (`/admin-portal` or `/admin`).
* **SHA-256 PIN Authentication:** Timing-safe PIN verification guarding operational telemetry and admin tooling.
* **Live Operational Telemetry:**
  * Real-time counters: Total pageviews, all-time unique visitors, today's pageviews/uniques, and active 30-minute users.
  * 7-day daily trend bar chart for audience tracking.
  * Top entry routes, referrer domains, and client device breakdowns.
* **On-Demand Scanner Trigger:** Single-click manual scanner control displaying live cooldown counters and ingestion summaries.

### 5. Seniority Spectrum & Market Salary Intel
* **Complete Professional Spectrum:** Comprehensive tracking from 3-month University Attachment up to Chief Technology Officer (CTO).
* **Dual Currency Salary Benchmarks (KES & USD):** Real-world compensation ranges updated to reflect East African market rates and global contractor earnings (via Deel/Remote.com).
* **In-Demand Skills Index:** Market demand ratings for high-priority stacks in Kenya (React/Next.js, Go, Python/FastAPI, Flutter, Docker/Kubernetes, and M-Pesa Daraja APIs).

### 6. Anonymous Developer Reviews & Workplace Culture Hub
* **Authentic Peer Insights:** Verified feedback from Kenyan engineers covering technical leadership, engineering practices, overtime expectations, and modern tooling.
* **Payment Reliability Metric:** Explicit community ratings on on-time salary disbursements via bank transfer or M-Pesa.

---

## 🏗️ System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Client (Browser)       │
                                  └──────────────┬──────────────┘
                                                 │
                                                 ▼
                       ┌──────────────────────────────────────────────────┐
                       │          Node.js 24 Native HTTP Engine           │
                       │           (Zero External npm Modules)            │
                       └─────────┬──────────────────────────────┬─────────┘
                                 │                              │
                    ┌────────────▼───────────┐     ┌────────────▼────────────┐
                    │ Security & Auth Shield │     │   Telemetry & Auditor   │
                    │ • Anti-DoS Mutex Gate  │     │ • Privacy Pageviews     │
                    │ • 10-Min Cooldown Gate │     │ • Scam Pattern Analysis │
                    │ • SHA-256 PIN Auth     │     │ • BRS Company Validator │
                    └────────────┬───────────┘     └────────────┬────────────┘
                                 │                              │
                                 └───────────────┬──────────────┘
                                                 │
                                                 ▼
                       ┌──────────────────────────────────────────────────┐
                       │               Dual Storage Engine                │
                       │ • Primary: Native SQLite (node:sqlite)           │
                       │ • Resilient Fallback: State JSON Storage         │
                       └─────────────────────────┬────────────────────────┘
                                                 │
                                                 ▼
                       ┌──────────────────────────────────────────────────┐
                       │           Autonomous Scanner & Daemons           │
                       │ • Ingestion: Arbeitnow, RemoteOK, Remotive,      │
                       │   Jobicy, LinkedIn Feed, Kenyan Tech Ecosystem   │
                       │ • 24/7 Keep-Alive Self-Heartbeat (/api/ping)     │
                       └──────────────────────────────────────────────────┘
```

---

## 📊 Seniority Benchmark Spectrum

| Seniority Level | Target Audience | Primary Focus | Representative Salary Band |
| :--- | :--- | :--- | :--- |
| **Industrial Attachment** | 3rd/4th Yr University Students (JKUAT, UoN, Strathmore, KU, Dekut) | M-Pesa APIs, Web UI, NITA Logbook Fulfillment | **KES 25,000 – 35,000** / mo |
| **Graduate Apprentice / Intern** | Fresh CS/IT Graduates (0–12 Mos) | Production bug fixes, CI/CD pipelines, Cloud fabrics | **KES 120,000 – 160,000** / mo |
| **Junior Developer** | Early-Career Engineers (1–2 Yrs) | REST endpoints, frontend components, unit test suites | **KES 80,000 – 145,000** / mo |
| **Mid-Level Engineer** | Autonomous Engineers (2–5 Yrs) | Microservices, database tuning, async queue workers | **KES 220,000 – 380,000** / mo |
| **Senior Engineer / Architect** | Seasoned Specialists (5+ Yrs) | Distributed systems, cloud resilience, security posture | **KES 480,000 – 1,100,000** / mo |
| **Engineering Manager** | Squad Leads & Technical Managers | Team OKRs, developer mentorship, architectural delivery | **KES 600,000 – 950,000** / mo |
| **Chief Technology Officer** | Executive Leadership | Tech strategy, CBK compliance, board governance, equity | **KES 900,000 – 1,800,000+** / mo |

---

## ⚡ Quick Start Guide

### Prerequisites
* **Node.js** version `20.0.0` or higher (`Node.js 24` recommended).
* **Zero npm packages needed** — the platform runs entirely on standard library modules.

### 1. Clone the Repository
```bash
git clone https://github.com/Hamidooh/dev-core-ke.git
cd dev-core-ke
```

### 2. Start the Server
```bash
node server.js
```

### 3. Open the Application
* **Public Candidate Portal:** Navigate to [http://localhost:3000](http://localhost:3000)
* **Private Admin Mission Control:** Navigate to [http://localhost:3000/admin-portal](http://localhost:3000/admin-portal)

---

## ⚙️ Configuration & Environment Variables

The application runs out of the box with safe defaults, but can be configured via environment variables:

| Variable | Default Value | Description |
| :--- | :---: | :--- |
| `PORT` | `3000` | Port for the HTTP server to listen on. |
| `ADMIN_PIN` | `devcore2026` | Developer PIN required to unlock the Admin Mission Control console. |
| `RENDER_EXTERNAL_URL` | *(None)* | Set automatically by Render for the 24/7 keep-alive heartbeat loop. |
| `NODE_ENV` | `development` | Runtime environment mode (`production` / `development`). |

---

## 📡 REST API Reference

### Public API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/ping` | Keep-alive heartbeat & uptime diagnostic check. |
| `GET` | `/api/jobs` | Search & filter jobs with keywords, seniority, domain, and credibility score. |
| `GET` | `/api/jobs/:id` | Retrieve full requisition details for a specific position. |
| `POST` | `/api/jobs` | Submit a new opening with automated algorithmic credibility audit. |
| `POST` | `/api/credibility-check` | Execute an on-demand scam and legitimacy audit on any job text. |
| `GET` | `/api/reviews` | Retrieve anonymous developer reviews, filterable by company name. |
| `POST` | `/api/reviews` | Post an anonymous developer review with compensation rating. |
| `GET` | `/api/analytics` | Retrieve market salary benchmarks (KES/USD) and in-demand skills. |
| `GET` | `/api/roles-guide` | Comprehensive breakdown of the 7 seniority spectrums. |
| `GET` | `/api/scanner/status` | Live scanner status, cooldown timers, and execution history. |
| `POST` | `/api/scanner/trigger` | Trigger immediate scan (protected by 10-minute cooldown shield). |

### Protected Admin Endpoints

| Method | Endpoint | Query / Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/analytics` | `?pin=<ADMIN_PIN>` | Returns full visitor telemetry, daily charts, and scanner status. |

---

## 🔒 Security & Privacy Architecture

* **Zero Tracking Cookies:** Visitor analytics are derived strictly from hashed ephemeral IP signatures and daily date stamps. No cookies, fingerprinting trackers, or third-party ad networks are used.
* **Strict Anti-DoS Freshness Throttle:** The 10-minute scanner lock protects against upstream API abuse, rate-limiting penalties, and distributed denial-of-service attempts.
* **Timing-Safe Authentication:** Admin access evaluates secrets using fixed-time SHA-256 comparisons to thwart timing analysis attacks.
* **Input Sanitization & XSS Mitigation:** All submitted reviews, descriptions, and audit payloads are stripped of executable markup and script injections.

---

## 🤝 Contributing

Contributions from the developer community are warmly welcomed!

1. **Fork the Repository:** Click the **Fork** button at the top of this repository.
2. **Create a Feature Branch:** `git checkout -b feature/NewFeature`
3. **Commit Your Changes:** `git commit -m "Add descriptive feature"`
4. **Push to Your Branch:** `git push origin feature/NewFeature`
5. **Open a Pull Request:** Submit a PR with a summary of the improvements made.

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and build upon it.

<div align="center">
  <sub>Built with ❤️ for the Kenyan Software Engineering Ecosystem & the Global Tech Workforce.</sub>
</div>
