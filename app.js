// Frontend main logic: submit audit request and poll for progress
const auditBtn = document.getElementById('audit-btn');
const urlInput = document.getElementById('url-input');
const validationEl = document.getElementById('validation');
const normalizedEl = document.getElementById('normalized');
const progressEl = document.getElementById('progress');
const stageEl = document.getElementById('stage');
const summaryEl = document.getElementById('summary');
const dashboardEl = document.getElementById('dashboard');
const apiBase = (window.location.protocol === 'file:' || window.location.origin === 'null') ? 'http://localhost:3000' : window.location.origin;

function setStage(text){stageEl.textContent = text}

function normalizeUrlInput(raw){ raw = String(raw||'').trim(); if(!raw) return '';
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw);
  if(hasScheme) return raw;
  if(raw.startsWith('//')) return 'https:' + raw;
  return 'https://' + raw;
}

function validateUrlClient(u){try{if(!u||!u.trim())return 'Please enter a URL';const url=new URL(u);if(!(url.protocol==='http:'||url.protocol==='https:'))return 'Only http and https are allowed';if(url.username||url.password)return 'URLs with credentials are not allowed';return null}catch(e){return 'Invalid URL'} }

function showBlockedNote(message){
  let note = document.getElementById('blocked-note');
  if(!note){
    note = document.createElement('div');
    note.id = 'blocked-note';
    note.className = 'blocked-note';
    progressEl.insertAdjacentElement('afterend', note);
  }
  note.textContent = message;
  note.hidden = false;
}
function hideBlockedNote(){
  const note = document.getElementById('blocked-note');
  if(note) note.hidden = true;
}

auditBtn.addEventListener('click', async ()=>{
  validationEl.textContent = '';
  normalizedEl.hidden = true;
  hideBlockedNote();
  let raw = urlInput.value;
  let normalized = normalizeUrlInput(raw);
  if(!normalized){validationEl.textContent = 'Please enter a URL';return}
  const err = validateUrlClient(normalized);
  if(err){validationEl.textContent = err;return}
  normalizedEl.textContent = 'Normalized to: ' + normalized;
  normalizedEl.hidden = false;
  auditBtn.disabled = true;progressEl.hidden = false;dashboardEl.hidden=true;summaryEl.hidden=false;summaryEl.textContent='Starting...';setStage('Validating URL');
  try{
    const res = await fetch(apiBase + '/api/audit',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:normalized})
    });
    if(!res.ok){const errText=await res.text();throw new Error(errText||res.statusText)}
    const data = await res.json();
    const id = data.id;
    setStage('Queued — running in background');
    // poll status
    let finished=false;
    while(!finished){
      const s = await fetch(apiBase + '/api/audit/'+id+'/status');
      const sj = await s.json();
      setStage(sj.stage || 'Running');
      if(sj.status==='done'){
        finished=true;break
      }
      if(sj.status==='failed'){
        if((sj.error||'').toLowerCase().includes('blocked')){
          showBlockedNote(sj.error);
          throw new Error('Site blocked this audit — see note above for details.');
        }
        throw new Error(sj.error||'Audit failed');
      }
      await new Promise(r=>setTimeout(r,1200));
    }
    // fetch result
    const r = await fetch(apiBase + '/api/audit/'+id+'/result');
    if(!r.ok)throw new Error('Failed to fetch results');
    const result = await r.json();
    renderResult(result);
    loadHistory();
  }catch(err){validationEl.textContent = err.message||String(err);summaryEl.hidden=false;summaryEl.textContent='Scan did not complete.';dashboardEl.hidden=true;}
  finally{auditBtn.disabled=false;progressEl.hidden=true}
});

function renderResult(data){
  dashboardEl.hidden=false;
  summaryEl.hidden=true;
  renderOverall(data);
  renderCharts(data.scores);
  renderIssues(data.issues);
}

// load history
async function loadHistory(){
  try{
    const r = await fetch(apiBase + '/api/history');
    const j = await r.json();
    const h = document.getElementById('history');
    if(!j || !j.length){ h.innerHTML = '<div class="empty-state">No scans logged yet.</div>'; return }
    h.innerHTML = '';
    j.forEach(item=>{
      let overall = 0;
      try{ overall = Math.round((JSON.parse(item.summary||'{}').scores||{}).overall || 0); }catch(e){}
      const color = (typeof scoreColor === 'function') ? scoreColor(overall) : '#3557E8';
      const row = document.createElement('div');
      row.className = 'log-row';
      row.innerHTML = `<span class="log-score" style="color:${color}">${overall}</span>
        <span class="log-url">${escapeHtml(item.url)}</span>
        <span class="log-time">${new Date(item.timestamp).toLocaleString()}</span>
        <button class="link-btn" type="button">View</button>`;
      row.querySelector('button').addEventListener('click', ()=> viewReport(item.id));
      h.appendChild(row);
    });
  }catch(e){ console.error(e) }
}

function viewReport(id){ window.open(apiBase + '/report/'+id, '_blank') }

loadHistory();
