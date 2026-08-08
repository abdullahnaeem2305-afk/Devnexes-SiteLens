/**
 * Compiles a standalone, highly stylized, interactive HTML report based on audit logs.
 */
function generateHtmlReport(audit) {
  const getSeverityBadge = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return '<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; text-transform: uppercase;">High/Critical</span>';
      case 'medium':
      case 'warning':
        return '<span style="background-color: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; text-transform: uppercase;">Medium</span>';
      case 'low':
        return '<span style="background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; text-transform: uppercase;">Low</span>';
      default:
        return `<span style="background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px; text-transform: uppercase;">${severity}</span>`;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const issuesListHtml = audit.issues && audit.issues.length > 0
    ? audit.issues.map((issue, idx) => `
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-left: 5px solid ${issue.severity === 'critical' || issue.severity === 'high' ? '#ef4444' : '#f59e0b'}; padding: 18px; margin-bottom: 16px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 12px; flex-wrap: wrap;">
          <h3 style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">${issue.title}</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="background: #eff6ff; color: #1d4ed8; font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${issue.category}</span>
            ${getSeverityBadge(issue.severity)}
          </div>
        </div>
        
        <div style="margin-top: 12px;">
          <strong style="color: #4b5563; font-size: 13px; display: block; margin-bottom: 4px;">Evidence / Findings:</strong>
          <pre style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #374151; white-space: pre-wrap; word-break: break-all; margin: 0;">${issue.evidence}</pre>
        </div>

        <div style="margin-top: 12px;">
          <strong style="color: #4b5563; font-size: 13px; display: block; margin-bottom: 4px;">Recommendation:</strong>
          <p style="margin: 0; font-size: 13.5px; color: #1f2937; line-height: 1.5;">${issue.recommendation}</p>
        </div>
      </div>
    `).join('')
    : '<div style="text-align: center; padding: 40px; color: #10b981; font-weight: 600; font-size: 16px; border: 2px dashed #10b981; border-radius: 8px; background: #ecfdf5;">🎉 Clean Bill of Health! Zero issues detected. Your webpage scored perfectly.</div>';

  const passedChecksListHtml = audit.passedChecks && audit.passedChecks.length > 0
    ? audit.passedChecks.map((check) => `
      <div style="background: #fdfdfd; border: 1px solid #e5e7eb; border-left: 5px solid #10b981; padding: 14px; margin-bottom: 12px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <div>
          <span style="font-size: 12px; color: #059669; font-weight: 600; text-transform: uppercase; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; margin-right: 8px;">PASSED</span>
          <strong style="font-size: 14px; color: #1f2937;">${check.title}</strong>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${check.evidence}</div>
        </div>
        <span style="font-size: 12px; color: #6b7280; background: #f3f4f6; padding: 3px 8px; border-radius: 12px;">${check.category}</span>
      </div>
    `).join('')
    : '<p style="color: #6b7280; text-align: center;">No passed audits recorded.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SiteLens Audit Report - ${audit.url}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 1100px;
      margin: 40px auto;
      padding: 0 20px;
    }
    .header-card {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .header-title {
      font-size: 32px;
      font-weight: 800;
      margin: 0 0 10px 0;
      letter-spacing: -0.025em;
    }
    .header-subtitle {
      font-size: 16px;
      opacity: 0.9;
      margin: 0 0 20px 0;
      word-break: break-all;
    }
    .meta-row {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      background: rgba(255,255,255,0.1);
      padding: 15px;
      border-radius: 8px;
    }
    .meta-item {
      font-size: 13px;
    }
    .meta-label {
      font-weight: bold;
      opacity: 0.8;
      text-transform: uppercase;
      font-size: 11px;
      display: block;
    }
    .scores-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .score-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .score-circle {
      position: relative;
      width: 90px;
      height: 90px;
      margin: 0 auto 12px auto;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      color: white;
    }
    .score-label {
      font-size: 13px;
      font-weight: 700;
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 20px 0;
      color: #111827;
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tab-btn {
      background: none;
      border: none;
      padding: 10px 20px;
      font-weight: 600;
      font-size: 14px;
      color: #4b5563;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tab-btn.active {
      color: #2563eb;
      border-bottom-color: #2563eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-card">
      <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 15px;">
        <div>
          <h1 class="header-title">SiteLens Scan Report</h1>
          <p class="header-subtitle">${audit.url}</p>
        </div>
        <div style="background: white; color: #1e3a8a; padding: 12px 20px; border-radius: 10px; text-align: center;">
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; opacity: 0.8;">Average Score</div>
          <div style="font-size: 32px; font-weight: 900; color: ${getScoreColor(audit.averageScore)};">${audit.averageScore}</div>
        </div>
      </div>
      
      <div class="meta-row">
        <div class="meta-item">
          <span class="meta-label">Audited At</span>
          <span>${new Date(audit.auditedAt).toLocaleString()}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Response Time</span>
          <span>${audit.metadata.responseTimeMs} ms</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">HTML Size</span>
          <span>${audit.metadata.pageSizeKB} KB</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">IP Address</span>
          <span>${audit.metadata.resolvedIp || 'N/A'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Protocol</span>
          <span>${audit.metadata.protocol}</span>
        </div>
      </div>
    </div>

    <!-- Scores Grid -->
    <div class="scores-grid">
      <div class="score-card">
        <div class="score-circle" style="background-color: ${getScoreColor(audit.scores.performance)};">
          ${audit.scores.performance}
        </div>
        <div class="score-label">Performance</div>
      </div>
      <div class="score-card">
        <div class="score-circle" style="background-color: ${getScoreColor(audit.scores.accessibility)};">
          ${audit.scores.accessibility}
        </div>
        <div class="score-label">Accessibility</div>
      </div>
      <div class="score-card">
        <div class="score-circle" style="background-color: ${getScoreColor(audit.scores.bestPractices)};">
          ${audit.scores.bestPractices}
        </div>
        <div class="score-label">Best Practices</div>
      </div>
      <div class="score-card">
        <div class="score-circle" style="background-color: ${getScoreColor(audit.scores.seo)};">
          ${audit.scores.seo}
        </div>
        <div class="score-label">SEO</div>
      </div>
      <div class="score-card">
        <div class="score-circle" style="background-color: ${getScoreColor(audit.scores.security)};">
          ${audit.scores.security}
        </div>
        <div class="score-label">Security</div>
      </div>
    </div>

    <!-- Active Findings -->
    <div class="section">
      <h2 class="section-title">
        <span>Detected Issues & Recommendations (${audit.issues.length})</span>
        <span style="font-size: 14px; font-weight: normal; color: #4b5563;">
          <span style="color: #b91c1c; font-weight: bold;">${audit.counts.critical} Critical</span> • 
          <span style="color: #d97706; font-weight: bold;">${audit.counts.warning} Warnings</span>
        </span>
      </h2>
      <div>
        ${issuesListHtml}
      </div>
    </div>

    <!-- Passed Audits -->
    <div class="section">
      <h2 class="section-title">Passed Checks (${audit.passedChecks.length})</h2>
      <div>
        ${passedChecksListHtml}
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  generateHtmlReport
};
