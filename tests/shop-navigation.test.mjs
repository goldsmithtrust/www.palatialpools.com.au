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
