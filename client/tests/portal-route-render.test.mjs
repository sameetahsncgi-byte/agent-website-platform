import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'vite';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
test('clean onboarding fragment reaches setup and clean agent admin reaches login without a site query',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 const oldWindow=globalThis.window,oldLocation=globalThis.location;
 try{
  const {default:App}=await server.ssrLoadModule('/src/App.jsx');
  const token='a'.repeat(64);
  for(const url of [`https://mueed.brokerage.sncgi.com/onboarding#token_hash=${token}&type=invite`,`https://agent-website-platform.vercel.app/#/onboarding?token_hash=${token}&type=invite`]){
   globalThis.location=new URL(url);globalThis.window={location:globalThis.location};
   const html=renderToStaticMarkup(createElement(App));assert.match(html,/Continue with invitation/);assert.ok(!html.includes(token));assert.ok(!html.includes('Agent workspace'));
  }
  globalThis.location=new URL('https://mueed.brokerage.sncgi.com/admin');globalThis.window={location:globalThis.location};
  assert.match(renderToStaticMarkup(createElement(App)),/Checking your session/);
 }finally{globalThis.window=oldWindow;globalThis.location=oldLocation;await server.close();}
});
