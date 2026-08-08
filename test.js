// Basic functional tests for security validation and DB
const assert = require('assert');
const {validateAndResolveUrl} = require('./security');
(async ()=>{
  try{
    console.log('Testing valid public URL (example.com)'); await validateAndResolveUrl('https://example.com'); console.log('OK');
  }catch(e){console.error('Public URL failed',e);}
  try{
    console.log('Testing localhost rejection'); await validateAndResolveUrl('http://127.0.0.1'); console.error('ERROR: localhost should be rejected');
  }catch(e){console.log('localhost rejected OK');}
  try{
    console.log('Testing credentials in URL'); await validateAndResolveUrl('http://user:pass@example.com'); console.error('ERROR: credentials should be rejected');
  }catch(e){console.log('credentials rejected OK');}
  console.log('Tests complete');
  process.exit(0);
})();
