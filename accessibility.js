const {JSDOM} = require('jsdom');
const axe = require('axe-core');

async function runA11y(html, url){
  // Create DOM
  const dom = new JSDOM(html, {url});
  const {window} = dom;
  // inject axe
  const script = axe.source;
  const scriptEl = window.document.createElement('script'); scriptEl.textContent = script; window.document.head.appendChild(scriptEl);
  // run axe
  return new Promise((resolve)=>{
    window.eval(`axe.run().then(function(results){ window.__axe = results; })`);
    // poll for results
    const check = setInterval(()=>{
      if(window.__axe){ clearInterval(check); const violations = window.__axe.violations || []; const issues = violations.map(v=>({category:'Accessibility',severity:mapImpact(v.impact),title:v.help,description:v.description,evidence:JSON.stringify(v.nodes.slice(0,3).map(n=>n.html)),recommendation:v.helpUrl||v.help,affectedElement:v.id})); resolve(issues)}
    },200);
    // timeout
    setTimeout(()=>{clearInterval(check); resolve([{category:'Accessibility',severity:'Informational',title:'axe timeout',description:'axe did not finish within timeout',evidence:'',recommendation:'Try again'}])},10000);
  });
}

function mapImpact(impact){ if(!impact) return 'Informational'; if(impact==='critical') return 'Critical'; if(impact==='serious') return 'High'; if(impact==='moderate') return 'Medium'; return 'Low'}

module.exports = {runA11y};
