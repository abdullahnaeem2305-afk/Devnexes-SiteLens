const fetch = require('cross-fetch');
const {runSeoChecks} = require('./seo');
const {runA11y} = require('./accessibility');
const {runLighthouse} = require('./lighthouse');
const {validateAndResolveUrl} = require('./security');

function normalizeIssue(src){
  return {
    category: src.category || 'General',
    severity: src.severity || 'Informational',
    title: src.title || 'Issue',
    description: src.description || '',
    evidence: src.evidence || '',
    recommendation: src.recommendation || '',
    affectedElement: src.affectedElement || ''
  }
}

// Two header profiles: an honest, identifiable bot UA (tried first), and a
// standard browser UA as a fallback for sites that block unknown bots outright.
// This mirrors what real-world site auditors (PageSpeed Insights, GTmetrix, etc.)
// do: they identify as a browser because many sites 403 anything else.
const BOT_HEADERS = {
  'User-Agent': 'SiteLens/1.0 (+https://example.org; website quality auditor)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br'
};
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1'
};
// Statuses commonly returned by bot-protection / anti-scraping layers
const BOT_BLOCK_STATUSES = new Set([403, 406, 429, 999]);

async function fetchOnce(current, headers, fetchTimeout){
  let controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), fetchTimeout);
  try{
    return await fetch(current, {redirect:'manual', signal: controller.signal, headers});
  }catch(e){
    if(e && e.name === 'AbortError') throw new Error('Request timed out after '+(fetchTimeout/1000)+'s for '+current);
    throw new Error('Network fetch error for '+current+': '+(e && e.message ? e.message : String(e)));
  }finally{
    clearTimeout(id);
  }
}

async function fetchHtml(url){
  const MAX_RESP_SIZE = 2_000_000; // 2 MB
  const fetchTimeout = 20000;

  // Try once with the honest bot UA; if the site actively blocks it, retry the
  // whole fetch (from the original URL) once with a standard browser UA.
  const headerProfiles = [BOT_HEADERS, BROWSER_HEADERS];

  let lastBlockedError = null;
  for(let profileIdx = 0; profileIdx < headerProfiles.length; profileIdx++){
    const headers = headerProfiles[profileIdx];
    let current = url; let max = 5; let seen = 0;
    try{
      while(seen++ < max){
        const res = await fetchOnce(current, headers, fetchTimeout);

        // handle redirects
        if(res.status>=300 && res.status<400 && res.headers.get('location')){
          const loc = new URL(res.headers.get('location'), current).toString();
          // validate redirect target (SSRF protection)
          await validateAndResolveUrl(loc);
          current = loc; continue;
        }

        if(BOT_BLOCK_STATUSES.has(res.status)){
          // This site's protection rejected this UA profile. Try the next
          // header profile (if any) instead of failing immediately.
          lastBlockedError = new Error('BOT_BLOCKED: HTTP '+res.status+' '+res.statusText+' for '+current);
          lastBlockedError.statusCode = res.status;
          lastBlockedError.blocked = true;
          break; // fall through to next profile
        }

        if(res.status>=400){
          const err = new Error('Fetch failed: HTTP '+res.status+' '+res.statusText+' for '+current);
          err.statusCode = res.status;
          throw err;
        }

        const cl = res.headers.get('content-length');
        if(cl && Number(cl) > MAX_RESP_SIZE) throw new Error('Response too large: '+cl+' bytes');

        // read text with safe limit
        const text = await res.text();
        if(text.length > MAX_RESP_SIZE) throw new Error('Response body exceeded limit');
        return text;
      }
      if(!lastBlockedError) throw new Error('Too many redirects for '+url);
    }catch(e){
      if(e && e.blocked){ lastBlockedError = e; continue; }
      throw e; // real error (network, timeout, too-large, non-block 4xx/5xx) — don't retry
    }
  }
  // Both profiles were blocked
  throw lastBlockedError || new Error('Fetch blocked for '+url);
}

async function runAudits(url,onStage){
  const result = {url,issues:[],scores:{overall:0,performance:0,accessibility:0,seo:0,bestPractices:0}};
  try{
    onStage && onStage('Fetching HTML');
    const html = await fetchHtml(url);
    onStage && onStage('Running SEO checks');
    const seoIssues = runSeoChecks(html).map(normalizeIssue);
    result.issues.push(...seoIssues);
    result.scores.seo = Math.max(0, 100 - (seoIssues.length * 8));
    // accessibility
    try{ onStage && onStage('Running accessibility (axe-core)'); const a11y = await runA11y(html,url); result.issues.push(...a11y.map(normalizeIssue)); result.scores.accessibility = Math.max(0,100 - (a11y.length*6)); }catch(e){ result.issues.push({category:'Accessibility',severity:'Informational',title:'Accessibility check failed',description:e.message,evidence:'',recommendation:'Try again later'}); }
    // lighthouse
    try{ onStage && onStage('Running performance (Lighthouse)'); const lh = await runLighthouse(url,onStage); // normalize
      result.scores.performance = lh.score || 0; lh.issues.forEach(i=>result.issues.push(normalizeIssue({category:'Performance',severity:i.score===0?'High':'Medium',title:i.title,description:i.description,evidence:i.evidence,recommendation:i.recommendation})));
    }catch(e){ result.issues.push({category:'Performance',severity:'Informational',title:'Lighthouse failed',description:e.message,evidence:'',recommendation:'Ensure Chrome is available on server'}); }
    // best practices small checks
    const bestPracticeIssues = [];
    if(html.indexOf('https://')===-1 && html.indexOf('http://')!==-1){ bestPracticeIssues.push(normalizeIssue({category:'Best Practices',severity:'Low',title:'Mixed content warning',description:'Page contains http resources',evidence:'',recommendation:'Serve all resources over https'})) }
    if(!/<!doctype html>/i.test(html)){ bestPracticeIssues.push(normalizeIssue({category:'Best Practices',severity:'Low',title:'Missing doctype',description:'Page is missing a <!DOCTYPE html> declaration',evidence:'',recommendation:'Add <!DOCTYPE html> as the first line of the document'})) }
    if(!/<meta[^>]+charset/i.test(html)){ bestPracticeIssues.push(normalizeIssue({category:'Best Practices',severity:'Medium',title:'Missing charset declaration',description:'No <meta charset> found',evidence:'',recommendation:'Add <meta charset="utf-8"> in the <head>'})) }
    result.issues.push(...bestPracticeIssues);
    result.scores.bestPractices = Math.max(0, 100 - (bestPracticeIssues.length * 10));
    // scores aggregation
    const p = result.scores.performance || 0; const a = result.scores.accessibility || 0; const s = result.scores.seo; const b = result.scores.bestPractices;
    result.scores.overall = Math.round((p + a + s + b)/4 || 0);
    return result;
  }catch(err){ throw err }
}

module.exports = {runAudits};