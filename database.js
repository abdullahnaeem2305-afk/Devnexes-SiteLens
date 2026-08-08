const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'sitelens_db.json');

/**
 * Initializes the database.
 * Ensures the storage file exists with empty logs if missing.
 */
function initDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ audits: [] }, null, 2), 'utf8');
  }
}

/**
 * Saves a full audit result.
 */
function saveAudit(auditData) {
  initDb();
  const fileContent = fs.readFileSync(DB_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(fileContent);
  } catch (err) {
    data = { audits: [] };
  }

  const newAudit = {
    id: Date.now() + Math.floor(Math.random() * 1000), // unique timestamp-based ID
    url: auditData.url,
    auditedAt: auditData.auditedAt || new Date().toISOString(),
    averageScore: auditData.averageScore,
    scores: auditData.scores,
    counts: auditData.counts,
    metadata: auditData.metadata,
    issues: auditData.issues,
    passedChecks: auditData.passedChecks
  };

  data.audits.unshift(newAudit); // add to the top of the history list
  
  // Limit to most recent 50 audits for safety
  if (data.audits.length > 50) {
    data.audits = data.audits.slice(0, 50);
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  return newAudit;
}

/**
 * Retrieves all audits.
 */
function getAudits() {
  initDb();
  try {
    const fileContent = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(fileContent);
    return data.audits || [];
  } catch (err) {
    return [];
  }
}

/**
 * Retrieves a single audit by its ID.
 */
function getAuditById(id) {
  const all = getAudits();
  return all.find(audit => audit.id === Number(id)) || null;
}

/**
 * Deletes an audit by ID.
 */
function deleteAudit(id) {
  initDb();
  try {
    const fileContent = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(fileContent);
    const originalCount = data.audits.length;
    data.audits = data.audits.filter(audit => audit.id !== Number(id));
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return data.audits.length < originalCount;
  } catch (err) {
    return false;
  }
}

module.exports = {
  initDb,
  saveAudit,
  getAudits,
  getAuditById,
  deleteAudit
};
