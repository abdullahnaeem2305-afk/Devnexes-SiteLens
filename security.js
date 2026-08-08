const dns = require('dns').promises;
const net = require('net');
const URL = require('url').URL;

const privateRanges = [
  ['10.0.0.0','10.255.255.255'],
  ['127.0.0.0','127.255.255.255'],
  ['169.254.0.0','169.254.255.255'],
  ['172.16.0.0','172.31.255.255'],
  ['192.168.0.0','192.168.255.255'],
  ['0.0.0.0','0.255.255.255']
];

function ipToLong(ip){return ip.split('.').reduce((acc,o)=>acc*256+parseInt(o,10),0)}
function isPrivateIPv4(ip){try{if(!ip || ip.indexOf('.')===-1) return false;const val=ipToLong(ip);return privateRanges.some(([s,e])=>val>=ipToLong(s)&&val<=ipToLong(e));}catch(e){return false}}

function isUrlDisallowed(parsedUrl){
  if(!parsedUrl) return true;
  if(parsedUrl.username||parsedUrl.password) return true;
  const port = parsedUrl.port ? parseInt(parsedUrl.port,10) : (parsedUrl.protocol==='https:'?443:80);
  const unsafePorts = [21,22,23,25,3389,5900,5432,3306];
  if(unsafePorts.includes(port)) return true;
  return false
}

async function validateAndResolveUrl(raw){
  let parsed;
  try{parsed = new URL(raw);}catch(e){throw new Error('Invalid URL')}
  if(!(parsed.protocol==='http:'||parsed.protocol==='https:')) throw new Error('Unsupported protocol');
  if(isUrlDisallowed(parsed)) throw new Error('URL contains credentials or uses disallowed port');

  const hostname = parsed.hostname;
  if(net.isIP(hostname)){
    if(isPrivateIPv4(hostname)) throw new Error('IP is private or loopback');
    return;
  }

  // Use system resolver via dns.lookup to avoid environments where dns.resolve* fails
  let addrs = [];
  try{
    const results = await dns.lookup(hostname, { all: true });
    addrs = results.map(r=>({address:r.address,family:r.family}));
  }catch(e){
    // fallback to resolve4/6 if lookup fails
    try{const v4 = await dns.resolve4(hostname); addrs = addrs.concat(v4.map(a=>({address:a,family:4}))); }catch(e2){}
    try{const v6 = await dns.resolve6(hostname); addrs = addrs.concat(v6.map(a=>({address:a,family:6}))); }catch(e3){}
  }

  if(!addrs || addrs.length===0) throw new Error('DNS resolution failed');

  for(const a of addrs){
    const addr = typeof a === 'string' ? a : a.address;
    const fam = typeof a === 'string' ? net.isIP(a) : a.family;
    if(fam===4){ if(isPrivateIPv4(addr)) throw new Error('Resolved to private IP: '+addr); }
    if(fam===6){ const low = (addr||'').toLowerCase(); if(low==='::1' || low.startsWith('fe80') || low.startsWith('fc') || low.startsWith('fd')) throw new Error('Resolved to private/loopback IPv6: '+addr); }
  }
}

module.exports = {validateAndResolveUrl,isUrlDisallowed};
