/**
 * Dashboard UI compiler for SiteLens.
 * Populates lists, details panels, metric rings, and applies user filtering.
 */

let activeTab = 'failed'; // 'failed' or 'passed'
let categoryFilter = 'all'; // 'all', 'Security', 'SEO', 'Accessibility', 'Best Practices'
let severityFilter = 'all'; // 'all', 'critical', 'warning', 'low'

/**
 * Gets a clean CSS color class based on an audit score.
 */
function getScoreColorClass(score) {
  if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-rose-600 bg-red-50 border-red-200';
}

function getScoreHex(score) {
  if (score >= 90) return '#10b981'; // Emerald
  if (score >= 50) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
}

/**
 * Builds the metric gauge dashboard header for a selected audit record.
 */
function renderScoreGauges(scores) {
  const container = document.getElementById('metric-gauges-container');
  if (!container || !scores) return;

  container.innerHTML = `
    ${createScoreGauge(scores.performance, 'Performance', getScoreHex(scores.performance))}
    ${createScoreGauge(scores.accessibility, 'Accessibility', getScoreHex(scores.accessibility))}
    ${createScoreGauge(scores.bestPractices, 'Best Practices', getScoreHex(scores.bestPractices))}
    ${createScoreGauge(scores.seo, 'SEO', getScoreHex(scores.seo))}
    ${createScoreGauge(scores.security, 'Security', getScoreHex(scores.security))}
  `;
}

/**
 * Renders the findings / issues list with filters applied.
 */
function renderFindingsList(audit) {
  const container = document.getElementById('findings-container');
  if (!container) return;

  const tabsContainer = document.getElementById('findings-tabs');
  if (tabsContainer) {
    tabsContainer.innerHTML = `
      <button 
        onclick="setFindingsTab('failed')"
        class="pb-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 ${
          activeTab === 'failed' 
            ? 'border-blue-600 text-blue-600' 
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }"
      >
        Failed Audits / Issues (${audit.issues.length})
      </button>
      <button 
        onclick="setFindingsTab('passed')"
        class="pb-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 ${
          activeTab === 'passed' 
            ? 'border-emerald-600 text-emerald-600' 
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }"
      >
        Passed Checks (${audit.passedChecks.length})
      </button>
    `;
  }

  const listToRender = activeTab === 'failed' ? audit.issues : audit.passedChecks;

  // Apply filters
  const filteredList = listToRender.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || item.severity === severityFilter;
    return matchesCategory && matchesSeverity;
  });

  if (filteredList.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm font-medium text-slate-600">No audits match your selected filter criteria.</p>
        <button 
          onclick="resetFilters()" 
          class="mt-2 text-xs font-semibold text-blue-600 hover:underline"
        >
          Reset Filters
        </button>
      </div>
    `;
    return;
  }

  let html = '';
  filteredList.forEach(item => {
    if (activeTab === 'failed') {
      const isCritical = item.severity === 'critical' || item.severity === 'high';
      const indicatorColor = isCritical ? 'border-red-500' : 'border-amber-500';
      const badgeStyle = isCritical ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100';

      html += `
        <div class="bg-white rounded-xl border border-slate-200 border-l-4 ${indicatorColor} p-5 hover-card-trigger shadow-sm mb-4">
          <div class="flex items-start justify-between flex-wrap gap-2 mb-3">
            <h4 class="font-bold text-slate-900 text-base leading-snug">${item.title}</h4>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">${item.category}</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-md border ${badgeStyle} uppercase tracking-wider">${item.severity}</span>
            </div>
          </div>

          <div class="mb-3">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Evidence / Payload</div>
            <pre class="bg-slate-50 border border-slate-150 rounded-lg p-3 text-xs font-mono text-slate-700 overflow-x-auto max-h-32 whitespace-pre-wrap break-all">${item.evidence}</pre>
          </div>

          <div>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Actionable Recommendation</div>
            <p class="text-slate-700 text-sm leading-relaxed">${item.recommendation}</p>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="bg-white rounded-xl border border-slate-200 border-l-4 border-emerald-500 p-4 hover-card-trigger shadow-sm mb-3 flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-center gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <h4 class="font-bold text-slate-800 text-sm">${item.title}</h4>
              <p class="text-xs text-slate-500 mt-0.5">${item.evidence}</p>
            </div>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100">${item.category}</span>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

/**
 * Filter triggers
 */
function setCategoryFilter(category) {
  categoryFilter = category;
  
  // Highlight active filter pill
  const pills = document.querySelectorAll('.category-filter-btn');
  pills.forEach(pill => {
    const pillCat = pill.getAttribute('data-category');
    if (pillCat === category) {
      pill.classList.replace('bg-white', 'bg-blue-600');
      pill.classList.replace('text-slate-600', 'text-white');
      pill.classList.add('border-blue-600');
    } else {
      pill.classList.replace('bg-blue-600', 'bg-white');
      pill.classList.replace('text-white', 'text-slate-600');
      pill.classList.remove('border-blue-600');
    }
  });

  if (window.currentSelectedAudit) {
    renderFindingsList(window.currentSelectedAudit);
  }
}

function setSeverityFilter(severity) {
  severityFilter = severity;

  const pills = document.querySelectorAll('.severity-filter-btn');
  pills.forEach(pill => {
    const pillSev = pill.getAttribute('data-severity');
    if (pillSev === severity) {
      pill.classList.replace('bg-white', 'bg-blue-600');
      pill.classList.replace('text-slate-600', 'text-white');
      pill.classList.add('border-blue-600');
    } else {
      pill.classList.replace('bg-blue-600', 'bg-white');
      pill.classList.replace('text-white', 'text-slate-600');
      pill.classList.remove('border-blue-600');
    }
  });

  if (window.currentSelectedAudit) {
    renderFindingsList(window.currentSelectedAudit);
  }
}

function setFindingsTab(tab) {
  activeTab = tab;
  if (window.currentSelectedAudit) {
    renderFindingsList(window.currentSelectedAudit);
  }
}

function resetFilters() {
  categoryFilter = 'all';
  severityFilter = 'all';
  activeTab = 'failed';
  
  setCategoryFilter('all');
  setSeverityFilter('all');
}

window.setCategoryFilter = setCategoryFilter;
window.setSeverityFilter = setSeverityFilter;
window.setFindingsTab = setFindingsTab;
window.resetFilters = resetFilters;
window.renderScoreGauges = renderScoreGauges;
window.renderFindingsList = renderFindingsList;
window.getScoreColorClass = getScoreColorClass;
