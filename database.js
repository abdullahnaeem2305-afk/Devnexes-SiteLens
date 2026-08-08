const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbFile = process.env.DATABASE_FILE || path.join(__dirname,'siteLens.db');
let db;

function initDb(){ const exists = fs.existsSync(dbFile); db = new sqlite3.Database(dbFile); db.serialize(()=>{ db.run(`CREATE TABLE IF NOT EXISTS audits (id TEXT PRIMARY KEY, url TEXT, timestamp INTEGER, summary TEXT, data TEXT)`); });}

function saveAudit(id,url,result){ return new Promise((resolve,reject)=>{ const summary = JSON.stringify({scores:result.scores}); const data = JSON.stringify({id,url,timestamp:Date.now(),...result}); db.run(`INSERT OR REPLACE INTO audits (id,url,timestamp,summary,data) VALUES (?,?,?, ?,?)`,[id,url,Date.now(),summary,data], function(err){ if(err) return reject(err); resolve(); }) })}

function getHistory(){ return new Promise((resolve,reject)=>{ db.all(`SELECT id,url,timestamp,summary FROM audits ORDER BY timestamp DESC LIMIT 20`,[],(err,rows)=>{ if(err) return reject(err); resolve(rows); }) })}

function getAuditById(id){ return new Promise((resolve,reject)=>{ db.get(`SELECT * FROM audits WHERE id = ?`,[id],(err,row)=>{ if(err) return reject(err); resolve(row); }) })}

module.exports = {initDb, saveAudit, getHistory, getAuditById};
