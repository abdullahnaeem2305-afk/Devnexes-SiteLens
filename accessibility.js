const cheerio = require('cheerio');

/**
 * Audits HTML for accessibility issues (inspired by axe-core rule specs).
 */
function auditAccessibility(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const issues = [];
  let score = 100;

  // 1. Language Attribute on html
  const htmlTag = $('html');
  const langAttr = htmlTag.attr('lang');
  if (!langAttr) {
    score -= 25;
    issues.push({
      category: 'Accessibility',
      title: 'HTML element lacks a [lang] attribute',
      severity: 'critical',
      evidence: '<html> tag does not define a lang attribute (e.g., lang="en").',
      recommendation: 'Add a "lang" attribute to the <html> tag of your page (e.g., <html lang="en">) so screen readers can correctly pronounce and translate content.',
      passed: false
    });
  } else {
    issues.push({
      category: 'Accessibility',
      title: 'HTML has [lang] attribute',
      severity: 'passed',
      evidence: `<html lang="${langAttr}">`,
      recommendation: 'Screen readers can successfully pronounce and parse your text content.',
      passed: true
    });
  }

  // 2. Zoom Prevention (Viewport scalability)
  const viewport = $('meta[name="viewport"]');
  const viewportContent = viewport.attr('content') || '';
  const blocksZoom = viewportContent.includes('user-scalable=no') || 
                      viewportContent.includes('maximum-scale=1.0') || 
                      viewportContent.includes('maximum-scale=1') ||
                      viewportContent.includes('user-scalable=0');

  if (blocksZoom) {
    score -= 15;
    issues.push({
      category: 'Accessibility',
      title: 'Viewport settings prevent zoom',
      severity: 'medium',
      evidence: `<meta name="viewport" content="${viewportContent}">`,
      recommendation: 'Modify your viewport meta tag to allow pinch-to-zoom. Avoid user-scalable=no or maximum-scale=1.0, as they block visually impaired visitors from reading your content.',
      passed: false
    });
  } else {
    issues.push({
      category: 'Accessibility',
      title: 'Viewport allows zoom',
      severity: 'passed',
      evidence: viewportContent ? `Viewport: "${viewportContent}"` : 'No disabling viewport tags present.',
      recommendation: 'Users can zoom in to read small text and scale the interface comfortably.',
      passed: true
    });
  }

  // 3. Inputs missing labels
  const inputs = $('input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"], textarea, select');
  let unlabeledInputs = 0;
  const offenderInputs = [];

  inputs.each((idx, el) => {
    const $el = $(el);
    const id = $el.attr('id');
    const name = $el.attr('name') || $el.attr('type') || 'input';
    const ariaLabel = $el.attr('aria-label');
    const ariaLabelledby = $el.attr('aria-labelledby');

    if (ariaLabel || ariaLabelledby) {
      return; // Safe
    }

    // Check if wrapped in a label
    if ($el.closest('label').length > 0) {
      return; // Safe
    }

    // Check if an external label has [for="id"]
    if (id) {
      const associatedLabel = $(`label[for="${id}"]`);
      if (associatedLabel.length > 0) {
        return; // Safe
      }
    }

    unlabeledInputs++;
    if (offenderInputs.length < 5) {
      offenderInputs.push(`<${el.name} id="${id || ''}" name="${name}">`);
    }
  });

  if (unlabeledInputs > 0) {
    const deduction = Math.min(25, unlabeledInputs * 5);
    score -= deduction;
    issues.push({
      category: 'Accessibility',
      title: 'Form Controls Lacking Accessible Labels',
      severity: 'high',
      evidence: `${unlabeledInputs} inputs do not have an associated label. Examples: ${offenderInputs.join(', ')}`,
      recommendation: 'Ensure all form controls have a matching <label> tag linked via the "for" attribute to the input\'s "id", or use an "aria-label" attribute directly.',
      passed: false
    });
  } else {
    issues.push({
      category: 'Accessibility',
      title: 'All Form Controls Are Fully Labeled',
      severity: 'passed',
      evidence: `All ${inputs.length} discovered form controls have clear descriptions or labels.`,
      recommendation: 'Assistive devices can reliably prompt users what information should be filled in.',
      passed: true
    });
  }

  // 4. Buttons and links with empty names
  const interactiveElements = $('button, a');
  let emptyInteractivesCount = 0;
  const offenderInteractives = [];

  interactiveElements.each((idx, el) => {
    const $el = $(el);
    const textContent = $el.text().trim();
    const ariaLabel = $el.attr('aria-label');
    const ariaLabelledby = $el.attr('aria-labelledby');
    const imgAlt = $el.find('img[alt]').attr('alt');

    if (!textContent && !ariaLabel && !ariaLabelledby && !imgAlt) {
      emptyInteractivesCount++;
      const tagType = el.name;
      const classAttr = $el.attr('class') || '';
      const href = $el.attr('href') || '';
      if (offenderInteractives.length < 5) {
        offenderInteractives.push(`<${tagType} class="${classAttr}" href="${href}">`);
      }
    }
  });

  if (emptyInteractivesCount > 0) {
    const deduction = Math.min(20, emptyInteractivesCount * 4);
    score -= deduction;
    issues.push({
      category: 'Accessibility',
      title: 'Buttons/Links with No Accessible Text',
      severity: 'high',
      evidence: `${emptyInteractivesCount} interactive elements have no text, aria-label, or child image alt text. Examples: ${offenderInteractives.join(', ')}`,
      recommendation: 'Ensure every link and button contains readable text, or supply an "aria-label" describing its action (especially for icon-only components).',
      passed: false
    });
  } else {
    issues.push({
      category: 'Accessibility',
      title: 'Interactive Elements Are Well-Named',
      severity: 'passed',
      evidence: `All ${interactiveElements.length} buttons/links contain names/labels.`,
      recommendation: 'Your user interface elements are clearly announced during keyboard/screen reader navigation.',
      passed: true
    });
  }

  // 5. Unique IDs check
  const idMap = {};
  let duplicateIdsCount = 0;
  const offenderIds = [];

  $('[id]').each((idx, el) => {
    const id = $(el).attr('id');
    if (!id) return;
    if (idMap[id]) {
      duplicateIdsCount++;
      if (!offenderIds.includes(id)) {
        offenderIds.push(id);
      }
    }
    idMap[id] = true;
  });

  if (duplicateIdsCount > 0) {
    score -= 10;
    issues.push({
      category: 'Accessibility',
      title: 'Duplicate Element IDs on Page',
      severity: 'medium',
      evidence: `Found ${duplicateIdsCount} duplicate ID references in the document. Affected IDs: ${offenderIds.join(', ')}`,
      recommendation: 'Ensure every element ID in the HTML markup is unique. Duplicated IDs confuse accessibility engines and break standard labeling.',
      passed: false
    });
  } else {
    issues.push({
      category: 'Accessibility',
      title: 'HTML Element IDs Are Unique',
      severity: 'passed',
      evidence: 'All element IDs present are unique in the DOM.',
      recommendation: 'Excellent. Standard DOM and accessibility labels will associate correctly with their elements.',
      passed: true
    });
  }

  return {
    score: Math.max(0, score),
    issues
  };
}

module.exports = {
  auditAccessibility
};
