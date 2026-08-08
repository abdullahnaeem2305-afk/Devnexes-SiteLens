const { isSafeUrl, auditSecurityHeaders } = require('./security');
const { auditSEO } = require('./seo');
const { auditAccessibility } = require('./accessibility');
const { auditLighthouse } = require('./lighthouse');

/**
 * Executes a full audit on the target URL.
 * Checks SSRF safety, fetches HTML, and aggregates scoring across all disciplines.
 */
async function performFullAudit(targetUrl) {
  // 1. SSRF Check
  const safetyResult = await isSafeUrl(targetUrl);
  if (!safetyResult.safe) {
    throw new Error(`Security Violation: ${safetyResult.reason}`);
  }

  const startTime = Date.now();
  let response;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

    response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DevnexesSiteLens/1.0; +https://devnexes-sitelens.local)'
      }
    });

    clearTimeout(timeoutId);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Scan aborted: Connection to target timed out after 12 seconds.');
    }
    throw new Error(`Failed to request webpage: ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`Webserver returned a bad status code: ${response.status} ${response.statusText}`);
  }

  const responseTimeMs = Date.now() - startTime;
  const htmlContent = await response.text();
  const sizeInBytes = Buffer.byteLength(htmlContent, 'utf8');

  // Convert headers to simple key-value dictionary
  const responseHeaders = {};
  response.headers.forEach((value, name) => {
    responseHeaders[name] = value;
  });

  const protocol = targetUrl.startsWith('https://') ? 'https' : 'http';

  // Run audits
  const securityAudit = auditSecurityHeaders(responseHeaders);
  const seoAudit = auditSEO(htmlContent, targetUrl);
  const accessibilityAudit = auditAccessibility(htmlContent);
  const lighthouseAudit = auditLighthouse(htmlContent, {
    url: targetUrl,
    responseTimeMs,
    sizeInBytes,
    protocol
  });

  // Consolidate issues
  const allIssues = [
    ...securityAudit.issues,
    ...seoAudit.issues,
    ...accessibilityAudit.issues,
    ...lighthouseAudit.issues
  ];

  // Group issues by status and severity
  const passedIssues = allIssues.filter(i => i.passed);
  const failedIssues = allIssues.filter(i => !i.passed);

  const criticalIssuesCount = failedIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const warningIssuesCount = failedIssues.filter(i => i.severity === 'medium' || i.severity === 'warning' || i.severity === 'low').length;

  // Calculate scores
  const scorePerformance = lighthouseAudit.performanceScore;
  const scoreAccessibility = accessibilityAudit.score;
  const scoreBestPractices = lighthouseAudit.bestPracticesScore;
  const scoreSeo = seoAudit.score;
  const scoreSecurity = securityAudit.score;

  const averageScore = Math.round(
    (scorePerformance + scoreAccessibility + scoreBestPractices + scoreSeo + scoreSecurity) / 5
  );

  return {
    url: targetUrl,
    auditedAt: new Date().toISOString(),
    averageScore,
    scores: {
      performance: scorePerformance,
      accessibility: scoreAccessibility,
      bestPractices: scoreBestPractices,
      seo: scoreSeo,
      security: scoreSecurity
    },
    counts: {
      critical: criticalIssuesCount,
      warning: warningIssuesCount,
      passed: passedIssues.length,
      total: allIssues.length
    },
    metadata: {
      responseTimeMs,
      pageSizeKB: parseFloat((sizeInBytes / 1024).toFixed(2)),
      resolvedIp: safetyResult.resolvedIp,
      protocol: protocol.toUpperCase(),
      contentType: responseHeaders['content-type'] || 'text/html'
    },
    issues: failedIssues,
    passedChecks: passedIssues
  };
}

module.exports = {
  performFullAudit
};
