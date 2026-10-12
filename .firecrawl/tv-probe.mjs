import fs from 'fs';
const env = fs.readFileSync('.env','utf8');
const m = env.match(/^TAVILY_API_KEY\s*=\s*"?([^"\n]+)"?/m);
if (!m) { console.log('no key'); process.exit(1); }
const key = m[1].trim();
const r = await fetch('https://api.tavily.com/search', {
  method:'POST',
  headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
  body: JSON.stringify({ query:'photosynthesis equation 6CO2', search_depth:'basic', max_results:3, include_answer:true, include_usage:true, include_raw_content:false }),
});
const j = await r.json();
console.log('HTTP', r.status);
console.log('top keys:', Object.keys(j));
console.log('result keys:', Object.keys(j.results?.[0] ?? {}));
console.log('n results:', j.results?.length);
for (const x of j.results ?? []) console.log(' -', x.url, '| content_len=', (x.content||'').length, '| score=', x.score);
console.log('usage:', JSON.stringify(j.usage), 'response_time:', j.response_time);
console.log('answer_len:', (j.answer||'').length);
