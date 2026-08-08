const cheerio = require('cheerio');

function runSeoChecks(html){
  const $ = cheerio.load(html);
  const issues = [];
  const title = $('title').text().trim();
  if(!title){issues.push({category:'SEO',severity:'High',title:'Missing title',description:'Document <title> is missing',evidence:'<title> element is missing',recommendation:'Add a unique descriptive page title',affectedElement:'<head>'})}
  const desc = $('meta[name="description"]').attr('content'); if(!desc){issues.push({category:'SEO',severity:'Medium',title:'Missing meta description',description:'No meta description',evidence:'<meta name="description"> not found',recommendation:'Add a concise meta description',affectedElement:'<head>'})}
  const h1 = $('h1').length; if(h1===0){issues.push({category:'SEO',severity:'Medium',title:'No H1',description:'No H1 element found',evidence:'No <h1> in document',recommendation:'Include one clear H1',affectedElement:'body'})}
  const canonical = $('link[rel="canonical"]').attr('href'); if(!canonical){issues.push({category:'SEO',severity:'Low',title:'Missing canonical',description:'No canonical link found',evidence:'<link rel="canonical"> is missing',recommendation:'Add a canonical URL to avoid duplicate content',affectedElement:'head'})}
  // images without alt
  $('img').each((i,el)=>{const alt=$(el).attr('alt'); if(!alt){issues.push({category:'SEO',severity:'Low',title:'Image missing alt',description:'Image is missing alt attribute',evidence:$.html(el),recommendation:'Add meaningful alt attributes',affectedElement:el.tagName})}});
  return issues;
}

module.exports = {runSeoChecks};
