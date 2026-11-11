import {useAgent} from '../context/AgentContext.js';
import {pagePath,PUBLIC_PAGES} from '../services/seo.js';
export default function SiteLink({href,...props}){
 const agent=useAgent();
 const key=typeof href==='string' && href.startsWith('#/')?href.slice(2):null;
 const publicPage=PUBLIC_PAGES.some(([page])=>page===key);
 const target=publicPage?`${agent.primaryOrigin || ''}${pagePath(agent.seoPages,key)}${agent.siteQuery || ''}`:href;
 return <a href={target} {...props}/>;
}
