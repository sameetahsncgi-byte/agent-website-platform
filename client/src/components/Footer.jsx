import { useAgent } from '../context/AgentContext.js';
import Icon from './Icon.jsx';
export default function Footer() {
  const agent = useAgent();
  return <footer className="site-footer"><div className="container"><div className="footer-main"><a className="footer-brand" href="#/home"><span>{agent.initials}</span><div><strong>{agent.name}</strong><small>{agent.brokerage}</small></div></a><nav className="footer-links" aria-label="Footer navigation"><a href="#/about">About Me</a><a href="#/active-listings">Available homes</a><a href="#/sold-listings">Past sales</a><a href="#/contact">Contact</a></nav><a className="footer-email" href={`mailto:${agent.email}`}>{agent.email}<Icon name="diagonal" size={15}/></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {agent.name} · {agent.brokerage}</span><span>Demo website · Sample properties · Not offers for sale</span><a href="#/admin">Agent workspace <Icon name="diagonal" size={13}/></a></div></div></footer>;
}
