const dns = require('dns');
const urlModule = require('url');

// SSRF IP ranges check
const PRIVATE_IP_RANGES = [
  /^(127)\./,               // Loopback
  /^(10)\./,                // Class A Private
  /^(172)\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B Private
  /^(192)\.(168)\./,        // Class C Private
  /^(169)\.(254)\./,        // Link Local
  /^0\./,                   // Current network
  /^::1$/,                  // IPv6 loopback
  /^fe80:/,                 // IPv6 link local
  /^fc00:/,                 // IPv6 unique local
];

const PRIVATE_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'any.local',
  'internal',
  'dev.local'
];

/**
 * Validates a URL string for security and structure
 */
function validateUrl(urlStr) {
  if (!urlStr) {
    throw new Error('URL is required.');
  }
  
  let parsedUrl;
  try {
    parsedUrl = new urlModule.URL(urlStr);
  } catch (err) {
    throw new Error('Invalid URL format. Please provide a full URL including http:// or https://');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Unsupported protocol. Only http:// and https:// URLs are allowed.');
  }

  return parsedUrl;
}

/**
 * Resolves hostname and performs SSRF validation
 */
async function isSafeUrl(urlStr) {
  try {
    const parsed = validateUrl(urlStr);
    const hostname = parsed.hostname.toLowerCase();

    // Check hostname blocklist
    if (PRIVATE_HOSTNAMES.some(host => hostname === host || hostname.endsWith('.' + host))) {
      return { safe: false, reason: 'Access to internal/private hostname is blocked.' };
    }

    // Resolve DNS and check IP
    return new Promise((resolve) => {
      dns.lookup(hostname, (err, address) => {
        if (err) {
          // If we can't resolve it, it might not exist, but let server attempt fetch to yield standard error
          resolve({ safe: true, resolvedIp: null });
          return;
        }

        const isPrivate = PRIVATE_IP_RANGES.some(regex => regex.test(address));
        if (isPrivate) {
          resolve({ safe: false, reason: `URL resolves to a private IP address (${address}) which is blocked.` });
        } else {
          resolve({ safe: true, resolvedIp: address });
        }
      });
    });
  } catch (err) {
    return { safe: false, reason: err.message };
  }
}

/**
 * Audits response headers for security best practices
 */
function auditSecurityHeaders(headers) {
  const issues = [];
  let score = 100;

  const securityHeaderSpecs = [
    {
      name: 'Content-Security-Policy',
      severity: 'high',
      deduction: 25,
      recommendation: 'Implement a Content Security Policy (CSP) to restrict sources of trusted content, scripts, and styles, preventing Cross-Site Scripting (XSS) attacks.',
      evidence: 'Missing Content-Security-Policy header.'
    },
    {
      name: 'Strict-Transport-Security',
      severity: 'medium',
      deduction: 15,
      recommendation: 'Configure HTTP Strict Transport Security (HSTS) with "max-age" to force connections over secure HTTPS.',
      evidence: 'Missing Strict-Transport-Security header.'
    },
    {
      name: 'X-Frame-Options',
      severity: 'medium',
      deduction: 15,
      recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN to prevent Clickjacking attacks.',
      evidence: 'Missing X-Frame-Options header.'
    },
    {
      name: 'X-Content-Type-Options',
      severity: 'low',
      deduction: 10,
      recommendation: 'Set X-Content-Type-Options to "nosniff" to prevent browsers from MIME-sniffing away from the declared content-type.',
      evidence: 'Missing X-Content-Type-Options header.'
    },
    {
      name: 'Referrer-Policy',
      severity: 'low',
      deduction: 10,
      recommendation: 'Define a Referrer-Policy (such as "strict-origin-when-cross-origin") to control how much referrer information is shared when navigating.',
      evidence: 'Missing Referrer-Policy header.'
    }
  ];

  securityHeaderSpecs.forEach(spec => {
    const headerValue = Object.keys(headers).find(h => h.toLowerCase() === spec.name.toLowerCase());
    if (!headerValue || !headers[headerValue]) {
      score -= spec.deduction;
      issues.push({
        category: 'Security',
        title: `Missing ${spec.name} Header`,
        severity: spec.severity,
        evidence: spec.evidence,
        recommendation: spec.recommendation,
        passed: false
      });
    } else {
      issues.push({
        category: 'Security',
        title: `Securely Configured ${spec.name}`,
        severity: 'passed',
        evidence: `${spec.name} matches "${headers[headerValue]}"`,
        recommendation: `Your ${spec.name} is correctly implemented.`,
        passed: true
      });
    }
  });

  return {
    score: Math.max(0, score),
    issues
  };
}

module.exports = {
  validateUrl,
  isSafeUrl,
  auditSecurityHeaders
};
