import fs from 'fs';
const env = fs.readFileSync('.env','utf8');
const key = env.match(/^TAVILY_API_KEY\s*=\s*"?([^"\n]+)"?/m)[1].trim();
const r = await fetch('https://api.tavily.com/search', {
  method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
  body: JSON.stringify({ query:'photosynthesis equation 6CO2', search_depth:'advanced', max_results:2, include_answer:false, include_usage:true, include_raw_content:'markdown', country:'cameroon' }),
});
const j = await r.json();
console.log('SEARCH advanced+raw HTTP', r.status, 'usage', JSON.stringify(j.usage));
for (const x of j.results ?? []) console.log(' -', x.url, '| content_len=', (x.content||'').length, '| raw_len=', (x.raw_content||'').length);
const e = await fetch('https://api.tavily.com/extract', {
  method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
  body: JSON.stringify({ urls:['https://docs.firecrawl.dev/features/search','https://en.wikipedia.org/wiki/Photosynthesis'], extract_depth:'basic', include_usage:true }),
});
const ej = await e.json();
console.log('EXTRACT HTTP', e.status, 'keys', Object.keys(ej), 'usage', JSON.stringify(ej.usage));
for (const x of ej.results ?? []) console.log(' -', x.url, '| raw_len=', (x.raw_content||'').length, '| keys', Object.keys(x));
console.log('failed_results:', JSON.stringify(ej.failed_results));
