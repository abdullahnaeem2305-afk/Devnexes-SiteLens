const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouse(url, onStage){
  onStage && onStage('Launching Chrome for Lighthouse');
  const chrome = await chromeLauncher.launch({chromeFlags:['--headless','--no-sandbox','--disable-gpu']});
  const options = {logLevel:'info',output:'json',port:chrome.port};
  try{
    onStage && onStage('Running Lighthouse (this may take a while)');
    const runnerResult = await lighthouse(url, options);
    const lhr = runnerResult.lhr;
    // Extract useful pieces
    const score = lhr.categories.performance ? Math.round(lhr.categories.performance.score*100) : 0;
    const audits = [];
    for(const key in lhr.audits){ const a = lhr.audits[key]; if(a && (a.score === 0 || a.score === null || a.score === undefined || a.score < 1)){ audits.push({id:key,title:a.title,description:a.description,score:a.score,evidence:JSON.stringify(a.details||{}),recommendation:a.helpText}) }}
    await chrome.kill();
    return {category:'Performance',severity:'Informational',score,issues:audits,raw:lhr};
  }catch(err){try{await chrome.kill()}catch(e){} throw err}
}

module.exports = {runLighthouse};
