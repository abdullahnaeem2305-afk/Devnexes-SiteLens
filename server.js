const http = require('http');
const fs = require('fs');
const path = require('path');
const urlModule = require('url');

const { performFullAudit } = require('./audit');
const { initDb, saveAudit, getAudits, getAuditById, deleteAudit } = require('./database');
const { generateHtmlReport } = require('./report');

// Initialize database
initDb();

const PORT = process.env.PORT || 3001;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = urlModule.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // --- API ROUTE: POST /api/scan ---
  if (pathname === '/api/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        let targetUrl = payload.url ? payload.url.trim() : '';

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'URL is required.' }));
          return;
        }

        // Auto-prefix with https:// if no protocol is defined
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = 'https://' + targetUrl;
        }

        // Run full secure audit
        const auditResult = await performFullAudit(targetUrl);
        
        // Save to SQLite emulation history
        const savedRecord = saveAudit(auditResult);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, audit: savedRecord }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Audit failed due to an internal server error.' }));
      }
    });
    return;
  }

  // --- API ROUTE: GET /api/history ---
  if (pathname === '/api/history' && req.method === 'GET') {
    try {
      const history = getAudits();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, history }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read history.' }));
    }
    return;
  }

  // --- API ROUTE: GET /api/report ---
  if (pathname === '/api/report' && req.method === 'GET') {
    try {
      const id = parsedUrl.query.id;
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>Audit ID is required.</p>');
        return;
      }

      const audit = getAuditById(id);
      if (!audit) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>Not Found</h1><p>The requested audit report was not found.</p>');
        return;
      }

      const htmlReport = generateHtmlReport(audit);
      res.writeHead(200, { 
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="sitelens-report-${id}.html"`
      });
      res.end(htmlReport);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Server Error</h1><p>${err.message}</p>`);
    }
    return;
  }

  // --- API ROUTE: DELETE /api/delete ---
  if (pathname === '/api/delete' && req.method === 'DELETE') {
    try {
      const id = parsedUrl.query.id;
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'ID is required.' }));
        return;
      }

      const deleted = deleteAudit(id);
      if (deleted) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Audit successfully deleted.' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Audit ID not found.' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // --- STATIC FILES SERVING ---
  // Translate URL to local file path inside this folder
  let fileRelativePath = pathname === '/' ? 'index.html' : pathname.substring(1);
  const resolvedFilePath = path.join(__dirname, fileRelativePath);

  // Security: Check for path traversal attacks
  if (!resolvedFilePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.exists(resolvedFilePath, (exists) => {
    if (!exists) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    const ext = path.extname(resolvedFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(resolvedFilePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Devnexes SiteLens Server is running directly on http://localhost:${PORT}`);
});
