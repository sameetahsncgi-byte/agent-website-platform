import { useAgent } from '../context/AgentContext.js';

export default function Footer() {
  const agent = useAgent();
  return <footer className="site-footer"><div className="container footer-content">
    <span>{agent.name} · {agent.brokerage}</span>
    <nav className="footer-links" aria-label="Footer navigation">
      <a href="#/about">About Me</a><a href="#/active-listings">Active Listings</a>
      <a href="#/sold-listings">Sold Listings</a><a href="#/contact">Contact</a>
    </nav>
    <span>Demo only · Fictional details · Not offers for sale</span>
  </div></footer>;
}
