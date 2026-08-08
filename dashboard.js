// Dashboard rendering: radial dial gauges, overall readout, and severity-grouped issues.
// Kept dependency-free (no chart lib) per the project's flat, no-build-step structure.

const SEVERITY_ORDER = ['Critical','High','Medium','Low','Informational'];
const DIAL_LABELS = {performance:'Performance', accessibility:'Accessibility', seo:'SEO', bestPractices:'Best Practices'};

function scoreColor(v){
  if(v >= 90) return getCss('--mint');
  if(v >= 50) return getCss('--amber');
  return getCss('--coral');
}
function getCss(varName){
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#3557E8';
}

function dialSvg(value){
  const v = Math.max(0, Math.min(100, Math.round(value||0)));
  const r = 40, c = 2*Math.PI*r;
  const offset = c * (1 - v/100);
  const color = scoreColor(v);
  return `<svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="Score ${v} out of 100">
    <circle class="dial-ring-bg" cx="52" cy="52" r="${r}"></circle>
    <circle class="dial-ring-val" cx="52" cy="52" r="${r}" stroke="${color}"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>
    <text x="52" y="58" text-anchor="middle" font-family="Space Grotesk, sans-serif"
      font-size="22" font-weight="600" fill="${color}">${v}</text>
  </svg>`;
}

function renderCharts(scores){
  const charts = document.getElementById('charts');
  charts.innerHTML = '';
  Object.keys(DIAL_LABELS).forEach(key=>{
    const card = document.createElement('div');
    card.className = 'dial-card';
    card.innerHTML = `${dialSvg(scores[key])}<div class="dial-label">${DIAL_LABELS[key]}</div>`;
    charts.appendChild(card);
  });
}

function renderOverall(data){
  const el = document.getElementById('overall');
  const v = Math.round(data.scores.overall || 0);
  const color = scoreColor(v);
  el.innerHTML = `
    <div class="target-url">${escapeHtml(data.url)}</div>
    <div class="overall-readout">
      <span class="num" style="color:${color}">${v}</span>
      <span class="lbl">/ 100 overall</span>
    </div>`;
}

function severityCount(issues, sev){
  return issues.filter(i=>(i.severity||'Informational')===sev).length;
}

function renderIssues(issues){
  const el = document.getElementById('issues');
  el.innerHTML = '';
  if(!issues || issues.length===0){
    el.innerHTML = '<div class="empty-state">No issues found — this page is in good shape.</div>';
    return;
  }
  SEVERITY_ORDER.forEach(sev=>{
    const group = issues.filter(i=>(i.severity||'Informational')===sev);
    if(group.length===0) return;
    const wrap = document.createElement('div');
    wrap.className = 'issues-group';
    const head = document.createElement('div');
    head.className = 'issues-group-head';
    head.innerHTML = `<span class="sev-chip sev-${sev}">${sev}</span><span class="count">${group.length} issue${group.length===1?'':'s'}</span><span class="chevron">▾</span>`;
    head.addEventListener('click', ()=> wrap.classList.toggle('collapsed'));
    const list = document.createElement('div');
    list.className = 'issues-list';
    group.forEach(i=>{
      const div = document.createElement('div');
      div.className = `issue sevline-${sev}`;
      div.innerHTML = `<strong>${escapeHtml(i.title)}</strong>
        <div class="meta">${escapeHtml(i.category)}</div>
        <div class="desc">${escapeHtml(i.description)}</div>
        ${i.evidence ? `<pre>${escapeHtml(i.evidence)}</pre>` : ''}
        <div class="rec"><b>Fix:</b> ${escapeHtml(i.recommendation)}</div>`;
      list.appendChild(div);
    });
    wrap.appendChild(head);
    wrap.appendChild(list);
    el.appendChild(wrap);
  });
}

function escapeHtml(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

window.renderCharts = renderCharts;
window.renderOverall = renderOverall;
window.renderIssues = renderIssues;
window.scoreColor = scoreColor;
window.escapeHtml = escapeHtml;
