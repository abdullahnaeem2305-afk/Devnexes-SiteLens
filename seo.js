const cheerio = require('cheerio');

/**
 * Audits a webpage's HTML structure for technical SEO best practices using Cheerio.
 * @param {string} htmlContent - The raw HTML retrieved from the webpage.
 * @param {string} pageUrl - The URL of the audited webpage.
 */
function auditSEO(htmlContent, pageUrl) {
  const $ = cheerio.load(htmlContent);
  const issues = [];
  let score = 100;

  // 1. Title Audit
  const titleTag = $('title');
  const titleText = titleTag.text().trim();
  if (!titleText) {
    score -= 25;
    issues.push({
      category: 'SEO',
      title: 'Missing Title Tag',
      severity: 'critical',
      evidence: 'No <title> tag found in the document <head>.',
      recommendation: 'Add a <title> element inside the <head> of the page. Aim for 30 to 60 characters for optimal display in search engine result pages (SERPs).',
      passed: false
    });
  } else if (titleText.length < 10) {
    score -= 10;
    issues.push({
      category: 'SEO',
      title: 'Short Title Tag',
      severity: 'warning',
      evidence: `<title> text: "${titleText}" (${titleText.length} characters)`,
      recommendation: 'Expand your title tag to be between 30 and 60 characters to include high-impact keywords and provide enough context.',
      passed: false
    });
  } else if (titleText.length > 70) {
    score -= 10;
    issues.push({
      category: 'SEO',
      title: 'Long Title Tag',
      severity: 'warning',
      evidence: `<title> text: "${titleText}" (${titleText.length} characters)`,
      recommendation: 'Shorten your title tag to under 60-70 characters. Titles exceeding this length are typically truncated with "..." in SERPs.',
      passed: false
    });
  } else {
    issues.push({
      category: 'SEO',
      title: 'Optimized Title Tag Length',
      severity: 'passed',
      evidence: `<title> text: "${titleText}" (${titleText.length} characters)`,
      recommendation: 'Your title tag is appropriately structured and fits within the standard search engine display limits.',
      passed: true
    });
  }

  // 2. Meta Description Audit
  const metaDescription = $('meta[name="description"]');
  const descText = metaDescription.attr('content')?.trim() || '';
  if (!descText) {
    score -= 20;
    issues.push({
      category: 'SEO',
      title: 'Missing Meta Description',
      severity: 'high',
      evidence: 'No <meta name="description"> tag found in the document.',
      recommendation: 'Add a meta description to summarize the page content. Make it engaging, between 50 and 160 characters, to entice clicks in search results.',
      passed: false
    });
  } else if (descText.length < 50) {
    score -= 10;
    issues.push({
      category: 'SEO',
      title: 'Short Meta Description',
      severity: 'warning',
      evidence: `Meta description: "${descText}" (${descText.length} characters)`,
      recommendation: 'Expand your meta description to at least 50-120 characters to fully describe the content and value of this page.',
      passed: false
    });
  } else if (descText.length > 160) {
    score -= 10;
    issues.push({
      category: 'SEO',
      title: 'Long Meta Description',
      severity: 'warning',
      evidence: `Meta description: "${descText.substring(0, 50)}..." (${descText.length} characters)`,
      recommendation: 'Shorten your meta description to under 160 characters. Descriptions that are too long get truncated in search results.',
      passed: false
    });
  } else {
    issues.push({
      category: 'SEO',
      title: 'Optimized Meta Description Length',
      severity: 'passed',
      evidence: `Meta description length is ${descText.length} characters.`,
      recommendation: 'Your meta description is of excellent length, suitable for search engine snippets.',
      passed: true
    });
  }

  // 3. H1 Headings Audit
  const h1s = $('h1');
  if (h1s.length === 0) {
    score -= 15;
    issues.push({
      category: 'SEO',
      title: 'Missing Heading 1 (H1)',
      severity: 'high',
      evidence: 'Zero <h1> elements found on the page.',
      recommendation: 'Create exactly one <h1> element outlining the main subject of your page to guide both crawlers and human readers.',
      passed: false
    });
  } else if (h1s.length > 1) {
    score -= 10;
    issues.push({
      category: 'SEO',
      title: 'Multiple Heading 1s (H1)',
      severity: 'warning',
      evidence: `Found ${h1s.length} <h1> tags on this page.`,
      recommendation: 'Consolidate down to a single, descriptive <h1> per page. Use <h2> through <h6> for subsections and semantic hierarchy.',
      passed: false
    });
  } else {
    const h1Text = $(h1s[0]).text().trim();
    if (!h1Text) {
      score -= 10;
      issues.push({
        category: 'SEO',
        title: 'Empty Heading 1 (H1)',
        severity: 'warning',
        evidence: 'An empty <h1> tag was found.',
        recommendation: 'Add meaningful text content to your <h1> heading.',
        passed: false
      });
    } else {
      issues.push({
        category: 'SEO',
        title: 'Valid Heading 1 Structure',
        severity: 'passed',
        evidence: `<h1>: "${h1Text}"`,
        recommendation: 'The page has a single, well-defined H1 header.',
        passed: true
      });
    }
  }

  // 4. Image alt Attributes (SEO Impact)
  const images = $('img');
  let missingAltCount = 0;
  const offendingImages = [];

  images.each((idx, img) => {
    const alt = $(img).attr('alt');
    const src = $(img).attr('src') || 'unknown-source';
    if (alt === undefined) {
      missingAltCount++;
      if (offendingImages.length < 5) {
        offendingImages.push(src);
      }
    }
  });

  if (missingAltCount > 0) {
    const deduction = Math.min(15, missingAltCount * 3);
    score -= deduction;
    issues.push({
      category: 'SEO',
      title: 'Images Missing Alt Attributes',
      severity: 'medium',
      evidence: `${missingAltCount} out of ${images.length} image(s) do not have an "alt" attribute. Examples: ${offendingImages.join(', ')}`,
      recommendation: 'Add descriptive "alt" attributes to all <img> tags. This provides crucial semantic context for search engine image indexes and accessibility users.',
      passed: false
    });
  } else {
    issues.push({
      category: 'SEO',
      title: 'All Images Have Alt Attributes',
      severity: 'passed',
      evidence: `All ${images.length} images properly configure the "alt" attribute.`,
      recommendation: 'Excellent work! Every image contains alt attributes to assist indexing and assistive technology.',
      passed: true
    });
  }

  // 5. Open Graph Meta Tags Audit
  const ogTitle = $('meta[property="og:title"]');
  const ogDesc = $('meta[property="og:description"]');
  const ogImg = $('meta[property="og:image"]');
  const hasOg = ogTitle.length > 0 || ogDesc.length > 0 || ogImg.length > 0;

  if (!hasOg) {
    score -= 10;
    issues.push({
      category: 'SEO',
      title: 'Missing Open Graph Tags',
      severity: 'low',
      evidence: 'No og:title, og:description, or og:image meta properties were discovered.',
      recommendation: 'Implement Open Graph tags in your <head> to control how your link displays with a rich card preview when shared on Slack, Twitter, and other platforms.',
      passed: false
    });
  } else {
    issues.push({
      category: 'SEO',
      title: 'Open Graph Tags Implemented',
      severity: 'passed',
      evidence: `Found partial or complete OG tags. Title: "${ogTitle.attr('content') || 'Not Set'}"`,
      recommendation: 'Your page is ready to look clean and engaging when shared on social and communication apps.',
      passed: true
    });
  }

  // 6. Canonical link or Robots check
  const canonical = $('link[rel="canonical"]');
  if (canonical.length === 0) {
    score -= 5;
    issues.push({
      category: 'SEO',
      title: 'Missing Canonical Link',
      severity: 'low',
      evidence: 'No <link rel="canonical"> element found.',
      recommendation: 'Specify a canonical link to signal the preferred search-friendly URL. This consolidates link signals and avoids duplicate content issues.',
      passed: false
    });
  } else {
    issues.push({
      category: 'SEO',
      title: 'Canonical Link Exists',
      severity: 'passed',
      evidence: `Canonical URL pointing to: "${canonical.attr('href')}"`,
      recommendation: 'Search indexers can easily resolve the authoritative URL of this page.',
      passed: true
    });
  }

  return {
    score: Math.max(0, score),
    issues
  };
}

module.exports = {
  auditSEO
};
