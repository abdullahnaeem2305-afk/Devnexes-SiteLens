require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const {validateAndResolveUrl, isUrlDisallowed} = require('./security');
const {runAudits} = require('./audit');
const {initDb, saveAudit, getHistory, getAuditById} = require('./database');
const path = require('path');
const {v4: uuidv4} = require('uuid');

const PORT = process.env.PORT || 3000;
const app = express();

const allowedOrigins = new Set(['http://localhost:3000','http://127.0.0.1:3000','null']);
app.use((req,res,next)=>{
  const origin = req.headers.origin;
  if(origin && (allowedOrigins.has(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))){
    res.setHeader('Access-Control-Allow-Origin', origin === 'null' ? 'null' : origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  if(req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.options('/api/audit', (req,res)=>res.sendStatus(200));
app.options('/api/history', (req,res)=>res.sendStatus(200));
app.options('/api/audit/:id/status', (req,res)=>res.sendStatus(200));
app.options('/api/audit/:id/result', (req,res)=>res.sendStatus(200));

app.use(bodyParser.json({limit:'1mb'}));
app.use(express.static(path.join(__dirname)));

initDb();

const audits = {}; // in-memory store for status & results

app.post('/api/audit', async (req,res)=>{
  let {url} = req.body || {};
  if(!url) return res.status(400).send('Missing url');
  url = String(url).trim();
  // If a client submits a bare hostname like example.com, normalize to https://
  if(!/^https?:\/\//i.test(url)){
    url = 'https://' + url;
  }
  try{
    // Validate and resolve (SSRF protection). This throws if invalid
    await validateAndResolveUrl(url);
  }catch(err){return res.status(400).send('URL rejected: '+err.message)}
  const id = uuidv4();
  audits[id] = {id, url, status:'pending', stage:'queued', result:null, error:null, timestamp:Date.now()};
  res.json({id});
  // Run in background
  (async ()=>{
    try{
      audits[id].status='running';audits[id].stage='Starting audits';
      const result = await runAudits(url, (stage)=>{audits[id].stage=stage});
      audits[id].status='done';audits[id].stage='Completed';audits[id].result=result;
      // store in DB
      await saveAudit(id,url,result);
    }catch(err){
      audits[id].status='failed';
      audits[id].stage='Failed';
      // store a safe message for the frontend while logging full technical details
      let safeMessage = 'Audit failed while fetching or analyzing the target site.';
      const msg = (err.message||'').toLowerCase();
      // provide slightly more guidance for common known errors without exposing internals
      if(msg.includes('dns')) safeMessage = 'Audit failed: DNS resolution problem for the target URL.';
      if(msg.includes('private ip') || msg.includes('loopback')) safeMessage = 'Audit blocked: target resolved to a private or loopback address.';
      if(msg.includes('timed out')) safeMessage = 'Audit failed: the target website took too long to respond.';
      if(msg.includes('fetch failed') || msg.includes('network fetch error')) safeMessage = 'Audit failed: unable to fetch the target website (network or TLS error).';
      if(err.blocked || msg.includes('bot_blocked')) safeMessage = 'Audit blocked: this site (HTTP '+(err.statusCode||'')+') appears to actively block automated tools/bots — this is common for sites like Instagram, Facebook, LinkedIn, and other sites behind bot-protection (e.g. Cloudflare). SiteLens already retried with a standard browser identity; the site still refused the request, so results can\'t be generated for it.';
      else if(err.statusCode && err.statusCode >= 400) safeMessage = 'Audit failed: the target website returned HTTP '+err.statusCode+'.';
      audits[id].error = safeMessage;
      audits[id].errorTechnical = (err && err.stack) ? err.stack : String(err);
      console.error('Audit failed (id='+id+')', err);
    }
  })();
});

app.get('/api/audit/:id/status',(req,res)=>{
  const a = audits[req.params.id];
  if(!a) return res.status(404).json({error:'Not found'});
  // return only the safe-facing error message
  return res.json({status:a.status,stage:a.stage,error:a.error});
});
app.get('/api/audit/:id/result',(req,res)=>{const a=audits[req.params.id]; if(!a) return res.status(404).send('Not found'); if(a.status!=='done') return res.status(400).send('Not ready'); res.json(a.result);});

app.get('/api/history',async (req,res)=>{const h = await getHistory();res.json(h);});

app.get('/report/:id',async (req,res)=>{const id=req.params.id; const row = await getAuditById(id); if(!row) return res.status(404).send('Report not found'); const {generateReportHtml} = require('./report'); const html = generateReportHtml(JSON.parse(row.data)); res.type('html').send(html);});

app.listen(PORT,()=>console.log('SiteLens running on port',PORT));
