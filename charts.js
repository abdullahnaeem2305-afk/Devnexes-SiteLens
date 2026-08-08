/**
 * Custom SVG chart rendering library for SiteLens dashboard history and metrics.
 */

/**
 * Renders an SVG Trend Line Chart of historical audit scores.
 * @param {string} containerId - Dom element ID to append SVG into
 * @param {Array} history - Array of audit objects
 */
function renderTrendChart(containerId, history) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!history || history.length < 2) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 text-center">
        <p class="text-sm font-medium text-slate-500">Need at least 2 scans to plot trend line.</p>
        <span class="text-xs text-slate-400 mt-1">Scan additional URLs or run multiple audits to view score progression.</span>
      </div>
    `;
    return;
  }

  // Use up to 10 of the most recent audits (reversed so chronological left-to-right)
  const data = [...history].slice(0, 10).reverse();

  const width = container.clientWidth || 500;
  const height = 180;
  const padding = 25;

  const minX = 0;
  const maxX = data.length - 1;
  const minY = 0;
  const maxY = 100;

  const points = data.map((item, index) => {
    const x = padding + (index / maxX) * (width - padding * 2);
    const y = height - padding - (item.averageScore / maxY) * (height - padding * 2);
    return { x, y, score: item.averageScore, url: item.url, date: new Date(item.auditedAt).toLocaleTimeString() };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  // Draw area underneath path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  let gridLines = '';
  // Draw horizontal grid lines (at 0, 50, 100)
  [25, 50, 75, 100].forEach(level => {
    const y = height - padding - (level / maxY) * (height - padding * 2);
    gridLines += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />`;
  });

  let markers = '';
  let tooltips = '';
  points.forEach((pt, idx) => {
    let circleColor = '#10b981'; // Green
    if (pt.score < 90) circleColor = '#f59e0b'; // Amber
    if (pt.score < 50) circleColor = '#ef4444'; // Red

    markers += `
      <g class="cursor-pointer group">
        <circle cx="${pt.x}" cy="${pt.y}" r="5" fill="${circleColor}" stroke="#ffffff" stroke-width="2" />
        <circle cx="${pt.x}" cy="${pt.y}" r="9" fill="transparent" stroke="${circleColor}" stroke-width="2" class="opacity-0 group-hover:opacity-30 transition-opacity" />
      </g>
    `;

    // Tooltip labels on X-axis (simplified)
    const labelX = pt.x;
    const labelText = `Scan ${idx + 1}`;
    markers += `
      <text x="${labelX}" y="${height - 5}" font-size="9" fill="#94a3b8" text-anchor="middle">${labelText}</text>
    `;
  });

  const svgHtml = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="display: block;">
      <!-- Grid -->
      ${gridLines}
      
      <!-- Area Fill -->
      <path d="${areaD}" fill="url(#chartGrad)" opacity="0.1" />
      
      <!-- Line -->
      <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      
      <!-- Markers and Labels -->
      ${markers}

      <!-- Gradients -->
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>
  `;

  container.innerHTML = svgHtml;
}

/**
 * Draws a beautiful donut gauge for an individual score.
 * @param {number} score - Score out of 100
 * @param {string} label - Category label
 * @param {string} themeColor - Hex color or color name
 */
function createScoreGauge(score, label, themeColor = '#3b82f6') {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return `
    <div class="flex flex-col items-center bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover-card-trigger">
      <div class="relative w-20 h-20">
        <svg class="w-full h-full transform -rotate-90">
          <!-- Background track -->
          <circle 
            cx="40" 
            cy="40" 
            r="${radius}" 
            stroke="#f1f5f9" 
            stroke-width="7" 
            fill="transparent" 
          />
          <!-- Foreground path -->
          <circle 
            cx="40" 
            cy="40" 
            r="${radius}" 
            stroke="${themeColor}" 
            stroke-width="7" 
            fill="transparent" 
            stroke-dasharray="${circumference}" 
            stroke-dashoffset="${strokeDashoffset}"
            stroke-linecap="round"
            class="transition-all duration-700 ease-out"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center font-bold text-lg text-slate-800">
          ${score}
        </div>
      </div>
      <span class="text-xs font-semibold text-slate-500 uppercase mt-2 tracking-wider text-center">${label}</span>
    </div>
  `;
}

window.renderTrendChart = renderTrendChart;
window.createScoreGauge = createScoreGauge;
