import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/pp-shop-navigation.js',import.meta.url),'utf8');
function run(href){
 const attrs={href,target:'_blank'};
 const anchor={getAttribute:k=>attrs[k],setAttribute:(k,v)=>{attrs[k]=v;},removeAttribute:k=>{delete attrs[k];}};
 const location={href:'https://palatialpools.com.au/services/',origin:'https://palatialpools.com.au'};
 vm.runInNewContext(source,{URL,location,window:{location},document:{querySelectorAll:()=>[anchor],documentElement:{},addEventListener:()=>{}},MutationObserver:class {observe(){} disconnect(){}},requestAnimationFrame:()=>{}});
 return attrs;
}
test('desktop and mobile shop anchors stay on the current domain and tab',()=>{
 assert.deepEqual(run('https://palatial.store/'),{href:'/shop'});
 assert.deepEqual(run('https://palatial.store/shop/pumps?brand=Neptune#products'),{href:'/shop/pumps?brand=Neptune#products'});
 assert.deepEqual(run('/store/parts'),{href:'/shop/parts'});
});
test('unrelated external links and staff links retain their destinations',()=>{
 assert.equal(run('https://example.com/shop').href,'https://example.com/shop');
 assert.equal(run('https://palatial.store/admin').href,'https://palatial.store/admin');
});

test('cross-zone clicks load a document and preserve checkout queries and fragments', () => {
 let click;
 const navigations = [];
 const location = {href:'https://palatialpools.com.au/',origin:'https://palatialpools.com.au',assign:url=>navigations.push(url)};
 vm.runInNewContext(source, {
  URL, location, window:{location},
  document:{querySelectorAll:()=>[],documentElement:{},addEventListener:(name,handler,capture)=>{assert.equal(name,'click');assert.equal(capture,true);click=handler;}},
  MutationObserver:class {observe(){} disconnect(){}},requestAnimationFrame:()=>{},
 });
 const url = 'https://palatialpools.com.au/shop/checkout?order=test#payment';
 let prevented = 0;
 let stopped = 0;
 const event = {target:{closest:()=>({href:url})},button:0,preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++};
 click(event);
 assert.deepEqual(navigations,[url]);
 assert.equal(prevented,1);
 assert.equal(stopped,1);
 for (const key of ['metaKey','ctrlKey','shiftKey','altKey']) click({...event,[key]:true});
 click({...event,button:1});
 click({...event,target:{closest:()=>({href:'https://palatial.store/shop/checkout'})}});
 click({...event,target:{closest:()=>({href:'https://palatialpools.com.au/contact/'})}});
 assert.deepEqual(navigations,[url]);
 assert.equal(prevented,1);
});
