import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
function redirects(flag) {
 return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`const {default:c}=await import('./next.config.mjs');console.log(JSON.stringify(await c.redirects()));`],{cwd:new URL('../',import.meta.url),env:{...process.env,SHOP_SAME_DOMAIN:flag},encoding:'utf8'}));
}
test('enabled marketing build leaves /shop for edge and preserves legacy subpaths',()=>{
 const r=redirects('1');assert.ok(r.every(x=>!x.destination.startsWith('https:')));
 assert.ok(!r.some(x=>x.source.startsWith('/shop')));
 assert.deepEqual(r.find(x=>x.source==='/store/:path*'),{source:'/store/:path*',destination:'/shop/:path*',permanent:false});
});
test('disabled marketing build keeps the existing routing for rollback',()=>{
 const r=redirects('0');assert.equal(r.length,4);assert.ok(r.every(x=>x.destination==='https://palatial.store'));
});

test('only the explicit enabled value is embedded in the application', () => {
 for (const flag of [undefined, '', '0', 'false', 'true', '1']) {
  const env = {...process.env};
  if (flag === undefined) delete env.SHOP_SAME_DOMAIN;
  else env.SHOP_SAME_DOMAIN = flag;
  const value = execFileSync(process.execPath, ['--input-type=module', '-e', `const {default:c}=await import('./next.config.mjs');console.log(JSON.stringify(c.env.SHOP_SAME_DOMAIN));`], {cwd:new URL('../',import.meta.url),env,encoding:'utf8'}).trim();
  assert.equal(JSON.parse(value), flag === '1' ? '1' : '');
 }
});
