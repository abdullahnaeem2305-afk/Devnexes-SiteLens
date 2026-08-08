/**
 * App.js - Orchestrator of the Devnexes SiteLens Web Interface.
 * Handles scans, deletions, selects historical items, and updates dashboard metrics.
 */

window.currentSelectedAudit = null;
let auditHistory = [];

document.addEventListener('DOMContentLoaded', () => {
  // Load previous scan history on load
  fetchScanHistory();

  // Bind scanner form
  const scanForm = document.getElementById('scan-form');
  if (scanForm) {
    scanForm.addEventListener('submit', handleScanSubmit);
  }
});

/**
 * Triggers a new website scan.
 */
async function handleScanSubmit(e) {
  e.preventDefault();
  const urlInput = document.getElementById('target-url');
  if (!urlInput) return;

  const url = urlInput.value.trim();
  if (!url) {
    showError('Please enter a website URL.');
    return;
  }

  // Set loading state
  showLoading(true);
  clearError();

  try {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to complete scan.');
    }

    urlInput.value = ''; // clear input
    
    // Select and display newly completed scan
    window.currentSelectedAudit = data.audit;
    displayAuditDetails(data.audit);
    
    // Refresh history sidebar
    await fetchScanHistory();
  } catch (err) {
    showError(err.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Fetches historical scans from the backend database.
 */
async function fetchScanHistory() {
  try {
    const response = await fetch('/api/history');
    const data = await response.json();
    
    if (data.success) {
      auditHistory = data.history;
      renderHistorySidebar(auditHistory);
      
      // Auto-select the first audit if nothing is currently selected
      if (!window.currentSelectedAudit && auditHistory.length > 0) {
        window.currentSelectedAudit = auditHistory[0];
        displayAuditDetails(window.currentSelectedAudit);
      } else if (auditHistory.length === 0) {
        showEmptyState();
      }

      // Re-render trend chart with full list
      renderTrendChart('trend-chart-container', auditHistory);
    }
  } catch (err) {
    console.error('Error fetching scan history:', err);
  }
}

/**
 * Renders list items in the sidebar.
 */
function renderHistorySidebar(history) {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 px-4 text-slate-400">
        <p class="text-xs font-medium">No previous scans found.</p>
        <span class="text-[10px] opacity-75">Your audited links will appear here.</span>
      </div>
    `;
    return;
  }

  let html = '';
  history.forEach(item => {
    const isSelected = window.currentSelectedAudit && window.currentSelectedAudit.id === item.id;
    const selectClass = isSelected ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800';
    const scoreColorClass = getScoreColorClass(item.averageScore);

    html += `
      <div 
        class="border rounded-xl p-3.5 mb-2.5 cursor-pointer transition-all flex items-center justify-between gap-3 relative group ${selectClass}"
        onclick="selectHistoryItem(${item.id})"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold px-1.5 py-0.5 rounded border ${scoreColorClass}">${item.averageScore}</span>
            <span class="text-[11px] text-slate-400 font-medium">${new Date(item.auditedAt).toLocaleDateString()}</span>
          </div>
          <div class="text-xs font-bold truncate pr-6" title="${item.url}">${cleanUrlForDisplay(item.url)}</div>
        </div>

        <button 
          onclick="handleDeleteAudit(event, ${item.id})"
          class="absolute right-2 top-2 text-slate-400 hover:text-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete record"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Formats URLs for clear sidebar labels.
 */
function cleanUrlForDisplay(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
  } catch (err) {
    return urlStr;
  }
}

/**
 * Handles sidebar list click selections.
 */
function selectHistoryItem(id) {
  const selected = auditHistory.find(item => item.id === id);
  if (selected) {
    window.currentSelectedAudit = selected;
    displayAuditDetails(selected);
    renderHistorySidebar(auditHistory); // updates active style
  }
}

/**
 * Handles deletion of scan history.
 */
async function handleDeleteAudit(e, id) {
  e.stopPropagation(); // prevent select trigger

  if (!confirm('Are you sure you want to delete this scan from history?')) {
    return;
  }

  try {
    const response = await fetch(`/api/delete?id=${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    
    if (data.success) {
      if (window.currentSelectedAudit && window.currentSelectedAudit.id === id) {
        window.currentSelectedAudit = null;
      }
      await fetchScanHistory();
    } else {
      alert('Delete failed: ' + data.error);
    }
  } catch (err) {
    alert('Error deleting scan: ' + err.message);
  }
}

/**
 * Loads selected audit metrics and statistics into dashboard.
 */
function displayAuditDetails(audit) {
  const panel = document.getElementById('details-panel');
  const emptyState = document.getElementById('empty-state');
  
  if (!panel || !emptyState) return;

  // Swap views
  emptyState.classList.add('hidden');
  panel.classList.remove('hidden');

  // Set target link details
  document.getElementById('display-url').textContent = audit.url;
  document.getElementById('display-url').href = audit.url;
  document.getElementById('display-time').textContent = new Date(audit.auditedAt).toLocaleString();
  
  // Set metadata metrics
  document.getElementById('meta-latency').textContent = `${audit.metadata.responseTimeMs} ms`;
  document.getElementById('meta-size').textContent = `${audit.metadata.pageSizeKB} KB`;
  document.getElementById('meta-ip').textContent = audit.metadata.resolvedIp || 'N/A';
  document.getElementById('meta-protocol').textContent = audit.metadata.protocol;

  // Set severity summary counts
  document.getElementById('count-critical').textContent = audit.counts.critical;
  document.getElementById('count-warning').textContent = audit.counts.warning;
  document.getElementById('count-passed').textContent = audit.counts.passed;

  // Color coordinate latency pill
  const latencyBadge = document.getElementById('meta-latency-pill');
  if (latencyBadge) {
    if (audit.metadata.responseTimeMs > 1000) {
      latencyBadge.className = 'bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-semibold border border-red-100 flex items-center gap-1.5';
    } else if (audit.metadata.responseTimeMs > 400) {
      latencyBadge.className = 'bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold border border-amber-100 flex items-center gap-1.5';
    } else {
      latencyBadge.className = 'bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100 flex items-center gap-1.5';
    }
  }

  // Build report exporter URL
  const exportBtn = document.getElementById('export-report-btn');
  if (exportBtn) {
    exportBtn.href = `/api/report?id=${audit.id}`;
    exportBtn.target = '_blank';
  }

  // Draw circle gauges & active issues
  resetFilters();
  renderScoreGauges(audit.scores);
  renderFindingsList(audit);
}

/**
 * Helper UI managers
 */
function showLoading(isLoading) {
  const btn = document.getElementById('scan-btn');
  const spinner = document.getElementById('btn-spinner');
  const btnText = document.getElementById('btn-text');

  if (isLoading) {
    btn.disabled = true;
    spinner.classList.remove('hidden');
    btnText.textContent = 'Auditing webpage...';
    btn.classList.add('opacity-75', 'cursor-not-allowed');
  } else {
    btn.disabled = false;
    spinner.classList.add('hidden');
    btnText.textContent = 'Launch SiteLens Audit';
    btn.classList.remove('opacity-75', 'cursor-not-allowed');
  }
}

function showEmptyState() {
  document.getElementById('details-panel').classList.add('hidden');
  document.getElementById('empty-state').classList.remove('hidden');
}

function showError(msg) {
  const errEl = document.getElementById('error-banner');
  if (errEl) {
    errEl.querySelector('#error-msg').textContent = msg;
    errEl.classList.remove('hidden');
  }
}

function clearError() {
  const errEl = document.getElementById('error-banner');
  if (errEl) {
    errEl.classList.add('hidden');
  }
}

window.selectHistoryItem = selectHistoryItem;
window.handleDeleteAudit = handleDeleteAudit;
window.showError = showError;
window.clearError = clearError;
