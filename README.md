# Devnexes SiteLens

SiteLens is a website quality auditing platform for performance, accessibility, SEO and best practices.

Features
- Enter a public URL to run audits
- Performance (Lighthouse)
- Accessibility (axe-core)
- Technical SEO checks (Cheerio)
- Issue normalization, severity, evidence, recommendations
- Audit history stored in SQLite
- Professional HTML report export

Technologies
- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js, Express
- Database: SQLite
- Audits: Lighthouse, axe-core, Cheerio

Installation
1. Copy `.env.example` to `.env` and adjust settings
2. npm install
3. npm start

Security & SSRF
The server validates and resolves hostnames and blocks private/loopback ranges, disallowed ports, credentials in URLs, and revalidates redirects.

Project structure (flat):
- index.html
- style.css
- app.js
- dashboard.js
- audit.js
- lighthouse.js
- accessibility.js
- seo.js
- security.js
- database.js
- report.js
- charts.js
- server.js
- package.json
- .env.example
- .gitignore
- README.md

Limitations & Notes
- Lighthouse requires Chrome/Chromium available on the host. If it's not present the server returns a clear error.
- This project is intended as a single-folder demo per assignment constraints.

