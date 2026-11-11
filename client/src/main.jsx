import React from 'react';
import { createRoot,hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import AgentProvider from './context/AgentProvider.jsx';
import './index.css';
import {pageFromHash} from './hooks/usePage.js';
import {PUBLIC_PAGES,pagePath} from './services/seo.js';

const boot=window.__SITE_BOOTSTRAP__;
const hashPage=window.location.hash.startsWith('#/')?pageFromHash(window.location.hash):null;
if(hashPage && PUBLIC_PAGES.some(([key])=>key===hashPage)){
 window.location.replace(pagePath(boot?.seoPages,hashPage)+window.location.search);
}else{
 const app=<React.StrictMode><AgentProvider><App /></AgentProvider></React.StrictMode>;
 if(boot && !hashPage)hydrateRoot(document.getElementById('root'),app);
 else createRoot(document.getElementById('root')).render(app);
 if(hashPage || ['admin','login','super-admin','onboarding'].includes(window.location.pathname.replace(/^\/|\/$/g,''))){
  const robots=document.createElement('meta');robots.name='robots';robots.content='noindex';document.head.appendChild(robots);
 }
}
