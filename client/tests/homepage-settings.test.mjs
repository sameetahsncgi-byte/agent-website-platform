import test from 'node:test';import assert from 'node:assert/strict';import {fromRow,validateContent,defaultContent} from '../src/services/siteContent.js';
const base={...defaultContent,name:'Test Agent',bio:'A local agent.',email:'test@example.com',phone:'123',location:'Atlanta'};
test('homepage image settings round-trip independently of contact and theme',()=>{
 const content=fromRow({hero_path:'owner/hero.webp',hero_overlay:25,hero_alt:'A local home',photo_alt:'Portrait',logo_alt:'Brokerage'});
 assert.equal(content.heroPath,'owner/hero.webp');assert.equal(content.heroOverlay,25);assert.equal(content.heroAlt,'A local home');assert.equal(fromRow({}).heroOverlay,55);
 const saved=validateContent({...base,heroOverlay:0,heroAlt:'Home'});assert.equal(saved.heroOverlay,0);assert.equal(saved.heroAlt,'Home');
 for(const overlay of [-1,101,1.5,'bad'])assert.throws(()=>validateContent({...base,heroOverlay:overlay}));
});
