# Devnexes SiteLens 🔎

Devnexes SiteLens is a fast, highly secure, fully responsive multi-engine website auditor. It scans web pages to evaluate performance, best practices, technical SEO, axe-core accessibility compliance, and server response security headers.

---

## 📂 Flat Single-Folder Architecture

This project is built using a strict flat structure containing **ZERO nested folders**. All relevant styling, logic, data layers, and reports are located in the same directory.

```
Devnexes-SiteLens/
├── index.html          # Main Frontend Entry Point
├── style.css           # Custom Animations & Gauges Styles
├── app.js              # State Handler & Frontend Orchestration
├── dashboard.js        # Active Findings and Filter Compilers
├── charts.js           # SVG Trend Lines & Circular Meters Generator
├── audit.js            # Main Multi-Engine Audit Pipeline Coordinator
├── lighthouse.js       # Best Practice & Simulated Performance Audit Rules
├── accessibility.js    # axe-inspired Accessibility Check Rules
├── seo.js              # Cheerio-based Technical SEO Audit Rules
├── security.js         # URL validation, SSRF Protection & Header Verification
├── database.js         # JSON SQLite-emulated Persistent History Store
├── report.js           # Downloadable HTML Report Compiler
├── server.js           # Native Node.js Static & API Server
├── package.json        # Standard Node dependencies and launch script
├── .env.example        # Environment variable outline
└── README.md           # Documentation
```

---

## 🚀 Key Features

* **SSRF Protection:** Performs real-time DNS resolution lookups to filter out private IP address ranges (e.g. `127.0.0.1`, `10.x.x.x`, `localhost`) to prevent Server-Side Request Forgery.
* **Cheerio Technical SEO Engine:** Audits title length, meta description quality, H1 heading hierarchies, canonical links, social OpenGraph tags, and missing image alt tags.
* **axe-core Accessibility Engine:** Verifies HTML `lang` attributes, zoom-preventing viewports, unlabeled form inputs, inaccessible buttons, and duplicate element IDs.
* **Lighthouse Performance Metrics:** Benchmarks Server Response Time (TTFB), total transfer weights, doctype validity, legacy image formatting usage, and HTTP/HTTPS encryption status.
* **Security Headers Engine:** Analyzes server headers for Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options, and Referrer-Policy.
* **Interactive Statistics Dashboard:** Renders beautiful custom responsive score charts (SVG Trend Chart) and five progress gauges.
* **Standalone HTML Report Export:** Compiles fully interactive reports with built-in styling for offline viewing or printing.

---

## 🛠️ How to Launch Locally

### 1. Install Dependencies
Execute inside this folder:
```bash
npm install
```

### 2. Run the Server
Launch the server:
```bash
npm start
```

### 3. Open the Browser
Open your browser and navigate to:
[http://localhost:3001](http://localhost:3001)
