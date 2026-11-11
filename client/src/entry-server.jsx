import {renderToString} from 'react-dom/server';
import {AgentContext} from './context/AgentContext.js';
import {fromRow} from './services/siteContent.js';
import App from './App.jsx';
export function renderSite(row,pages,page,primaryOrigin,siteQuery=''){
 const content=fromRow(row);
 const agent={...content,initials:content.name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase(),contentStatus:'ready',seoPages:pages,primaryOrigin,siteQuery};
 return {html:renderToString(<AgentContext.Provider value={agent}><App initialPage={page}/></AgentContext.Provider>),content};
}
