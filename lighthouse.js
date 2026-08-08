const cheerio = require('cheerio');

/**
 * Simulates Lighthouse Performance and Best Practices scoring based on HTML analysis.
 * @param {string} htmlContent - Page markup
 * @param {object} metadata - Metadata such as response times, payload size, protocol
 */
function auditLighthouse(htmlContent, metadata = {}) {
  const $ = cheerio.load(htmlContent);
  const issues = [];
  
  let perfScore = 100;
  let bestPracticeScore = 100;

  // --- BEST PRACTICES ---

  // 1. DOCTYPE check
  const doctypeRegex = /^\s*<!DOCTYPE\s+html>/i;
  const hasDoctype = doctypeRegex.test(htmlContent) || htmlContent.includes('<!DOCTYPE html>') || htmlContent.includes('<!doctype html>');
  if (!hasDoctype) {
    bestPracticeScore -= 20;
    issues.push({
      category: 'Best Practices',
      title: 'Page Lacks standard HTML Doctype declaration',
      severity: 'medium',
      evidence: 'Missing or corrupt <!DOCTYPE html> declaration.',
      recommendation: 'Ensure your HTML documents begin with <!DOCTYPE html> at the very first line of code. This prevents browsers from falling into rendering "quirks mode".',
      passed: false
    });
  } else {
    issues.push({
      category: 'Best Practices',
      title: 'Declares Valid HTML DOCTYPE',
      severity: 'passed',
      evidence: '<!DOCTYPE html> found.',
      recommendation: 'Your page loads in standard standards-compliance mode.',
      passed: true
    });
  }

  // 2. HTTPS Check
  const isHttps = (metadata.protocol || '').includes('https') || (metadata.url || '').startsWith('https://');
  if (!isHttps) {
    bestPracticeScore -= 30;
    issues.push({
      category: 'Best Practices',
      title: 'Does Not Use Secure Connection (HTTPS)',
      severity: 'critical',
      evidence: `Page loaded over insecure protocol: ${metadata.url || 'HTTP'}`,
      recommendation: 'Implement an SSL/TLS certificate. Search engines down-rank HTTP sites, and modern browsers flag them as insecure.',
      passed: false
    });
  } else {
    issues.push({
      category: 'Best Practices',
      title: 'Uses Secure Connection (HTTPS)',
      severity: 'passed',
      evidence: 'Page requested securely via HTTPS.',
      recommendation: 'All traffic is securely encrypted, preventing eavesdropping and tampering.',
      passed: true
    });
  }

  // 3. Avoid Deprecated Tag elements
  const deprecatedTags = ['font', 'center', 'marquee', 'dir', 'applet', 'big', 'tt'];
  const foundDeprecated = [];
  deprecatedTags.forEach(tag => {
    if ($(tag).length > 0) {
      foundDeprecated.push(`<${tag}>`);
    }
  });

  if (foundDeprecated.length > 0) {
    bestPracticeScore -= 15;
    issues.push({
      category: 'Best Practices',
      title: 'Uses Deprecated HTML elements',
      severity: 'medium',
      evidence: `Found obsolete tags: ${foundDeprecated.join(', ')}`,
      recommendation: 'Replace legacy styling tags like <center> or <font> with standard CSS layout properties (Flexbox, Grid) and semantic elements.',
      passed: false
    });
  } else {
    issues.push({
      category: 'Best Practices',
      title: 'Avoids Obsolete and Deprecated Elements',
      severity: 'passed',
      evidence: 'No deprecated tags were detected in the HTML.',
      recommendation: 'Great job maintaining modern HTML markup conventions.',
      passed: true
    });
  }


  // --- PERFORMANCE ---

  // 4. Page Size Audit (Simulated)
  const pageSizeKB = Math.round((metadata.sizeInBytes || Buffer.byteLength(htmlContent)) / 1024);
  if (pageSizeKB > 1500) {
    perfScore -= 25;
    issues.push({
      category: 'Performance',
      title: 'Enormous Page Payload Size',
      severity: 'high',
      evidence: `Total transfer weight is ~${pageSizeKB} KB.`,
      recommendation: 'Optimize page size by code-splitting, compressing HTML markup, deferring non-essential assets, and loading heavy items dynamically.',
      passed: false
    });
  } else if (pageSizeKB > 500) {
    perfScore -= 10;
    issues.push({
      category: 'Performance',
      title: 'Large DOM/Page Payload',
      severity: 'warning',
      evidence: `Transfer weight is ~${pageSizeKB} KB.`,
      recommendation: 'Minify CSS and JS, clean up redundant metadata, and implement text compression on the hosting server.',
      passed: false
    });
  } else {
    issues.push({
      category: 'Performance',
      title: 'Optimal Page Payload Size',
      severity: 'passed',
      evidence: `Transfer weight is only ~${pageSizeKB} KB.`,
      recommendation: 'Your page payload is extremely light, ensuring fast downloads over poor mobile connections.',
      passed: true
    });
  }

  // 5. Response Latency
  const responseTimeMs = metadata.responseTimeMs || 100;
  if (responseTimeMs > 1000) {
    perfScore -= 25;
    issues.push({
      category: 'Performance',
      title: 'Slow Server Response Time (TTFB)',
      severity: 'high',
      evidence: `Server took ${responseTimeMs} ms to respond with document.`,
      recommendation: 'Optimize your server-side logic, query execution, or cache strategies. Aim for a response time under 200 ms.',
      passed: false
    });
  } else if (responseTimeMs > 400) {
    perfScore -= 10;
    issues.push({
      category: 'Performance',
      title: 'Suboptimal Server Latency',
      severity: 'warning',
      evidence: `Server responded in ${responseTimeMs} ms.`,
      recommendation: 'Implement page caching or static generation to reduce database pressure and speed up rendering.',
      passed: false
    });
  } else {
    issues.push({
      category: 'Performance',
      title: 'Fast Initial Server Response Time',
      severity: 'passed',
      evidence: `Response time was ${responseTimeMs} ms.`,
      recommendation: 'The server responds swiftly, providing a responsive experience for the initial page load.',
      passed: true
    });
  }

  // 6. Optimized Images check
  const images = $('img');
  let legacyImages = 0;
  images.each((i, img) => {
    const src = $(img).attr('src') || '';
    if (src.endsWith('.png') || src.endsWith('.jpg') || src.endsWith('.jpeg')) {
      legacyImages++;
    }
  });

  if (legacyImages > 3) {
    perfScore -= 15;
    issues.push({
      category: 'Performance',
      title: 'Serve Images in Modern Formats',
      severity: 'medium',
      evidence: `Found ${legacyImages} traditional png/jpg images.`,
      recommendation: 'Convert images to modern formats like WebP or AVIF. These formats offer far superior compression and visual fidelity than PNG or JPEG.',
      passed: false
    });
  } else {
    issues.push({
      category: 'Performance',
      title: 'Efficient Image Formats',
      severity: 'passed',
      evidence: 'Images are either highly optimized or are utilizing modern vector/compressed formats.',
      recommendation: 'Your image assets are well configured for lightweight transfer.',
      passed: true
    });
  }

  return {
    performanceScore: Math.max(0, perfScore),
    bestPracticesScore: Math.max(0, bestPracticeScore),
    issues
  };
}

module.exports = {
  auditLighthouse
};
