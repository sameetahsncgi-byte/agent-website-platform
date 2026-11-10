import { useEffect, useRef } from 'react';
import { imageUrl } from '../services/siteContent.js';
import { useAgent } from '../context/AgentContext.js';
import Icon from './Icon.jsx';

export default function Header({ page }) {
  const agent = useAgent();
  const menuRef = useRef(null);
  const listingsRef = useRef(null);
  useEffect(() => {
    function closeOutside(event) {
      for (const ref of [menuRef, listingsRef]) if (ref.current && !ref.current.contains(event.target)) ref.current.open = false;
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);
  function closeMenu() { if (menuRef.current) menuRef.current.open = false; if (listingsRef.current) listingsRef.current.open = false; }
  const current = value => page === value ? 'page' : undefined;
  function escape(event) { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary').focus(); } }
  const links = [['home', 'Home'], ['about', 'About Me'], ['active-listings', 'Available Homes'], ['sold-listings', 'Past Sales'], ['contact', 'Contact']];
  return <div className="header-wrap"><header className="site-header container">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <a href="#/home" className="brand" onClick={closeMenu} aria-label={`${agent.name} home`}>
      <span className="brand-mark">{agent.logoPath ? <img className="company-logo" src={imageUrl(agent.logoPath)} alt={`${agent.brokerage} logo`} /> : agent.initials}</span>
      <span className="brand-name"><strong>{agent.name}</strong><small>{agent.brokerage}</small></span>
    </a>
    <nav className="desktop-nav" aria-label="Main navigation">
      <a href="#/home" aria-current={current('home')}>Home</a>
      <a href="#/about" aria-current={current('about')}>About Me</a>
      <details ref={listingsRef} className="listing-dropdown" onKeyDown={escape}>
        <summary className={page.includes('listings') ? 'current-section' : ''}>Properties <Icon name="chevron" size={13}/></summary>
        <div className="dropdown-menu"><a href="#/active-listings" onClick={closeMenu} aria-current={current('active-listings')}>Available homes</a><a href="#/sold-listings" onClick={closeMenu} aria-current={current('sold-listings')}>Past sales</a></div>
      </details>
      <a href="#/contact" aria-current={current('contact')}>Contact</a>
    </nav>
    <div className="header-actions"><a className="agent-login-link" href="#/admin">Agent login</a><a className="button header-button" href="#/contact">Let’s connect <Icon name="diagonal" size={16}/></a></div>
    <details ref={menuRef} className="mobile-menu" onKeyDown={escape}><summary aria-label="Open navigation menu"><Icon name="menu"/> Menu</summary><nav aria-label="Mobile navigation">{links.map(([path, label]) => <a key={path} href={`#/${path}`} aria-current={current(path)} onClick={closeMenu}>{label}<Icon name="diagonal" size={16}/></a>)}<a href="#/admin" onClick={closeMenu}>Agent login<Icon name="diagonal" size={16}/></a></nav></details>
  </header></div>;
}
