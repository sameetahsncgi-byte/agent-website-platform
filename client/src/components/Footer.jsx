import SiteLink from './SiteLink.jsx';
import { useAgent } from '../context/AgentContext.js';
import Icon from './Icon.jsx';
export default function Footer() {
  const agent = useAgent();
  return <footer className="site-footer"><div className="container"><div className="footer-main"><SiteLink className="footer-brand" href="#/home"><span>{agent.initials}</span><div><strong>{agent.name}</strong><small>{agent.brokerage}</small></div></SiteLink><nav className="footer-links" aria-label="Footer navigation"><SiteLink href="#/about">About Me</SiteLink><SiteLink href="#/active-listings">Available homes</SiteLink><SiteLink href="#/sold-listings">Past sales</SiteLink><SiteLink href="#/contact">Contact</SiteLink></nav><SiteLink className="footer-email" href={`mailto:${agent.email}`}>{agent.email}<Icon name="diagonal" size={15}/></SiteLink></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {agent.name} · {agent.brokerage}</span><span>Demo website · Sample properties · Not offers for sale</span><SiteLink href="#/admin">Agent workspace <Icon name="diagonal" size={13}/></SiteLink></div></div></footer>;
}
