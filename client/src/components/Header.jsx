import SiteLink from './SiteLink.jsx';
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
    <SiteLink className="skip-link" href="#main-content">Skip to main content</SiteLink>
    <SiteLink href="#/home" className="brand" onClick={closeMenu} aria-label={`${agent.name} home`}>
      <span className="brand-mark">{agent.logoPath ? <img className="company-logo" src={imageUrl(agent.logoPath)} alt={agent.logoAlt || `${agent.brokerage} logo`} /> : agent.initials}</span>
      <span className="brand-name"><strong>{agent.name}</strong><small>{agent.brokerage}</small></span>
    </SiteLink>
    <nav className="desktop-nav" aria-label="Main navigation">
      <SiteLink href="#/home" aria-current={current('home')}>Home</SiteLink>
      <SiteLink href="#/about" aria-current={current('about')}>About Me</SiteLink>
      <details ref={listingsRef} className="listing-dropdown" onKeyDown={escape}>
        <summary className={page.includes('listings') ? 'current-section' : ''}>Properties <Icon name="chevron" size={13}/></summary>
        <div className="dropdown-menu"><SiteLink href="#/active-listings" onClick={closeMenu} aria-current={current('active-listings')}>Available homes</SiteLink><SiteLink href="#/sold-listings" onClick={closeMenu} aria-current={current('sold-listings')}>Past sales</SiteLink></div>
      </details>
      <SiteLink href="#/contact" aria-current={current('contact')}>Contact</SiteLink>
    </nav>
    <div className="header-actions"><SiteLink className="agent-login-link" href="#/admin">Agent login</SiteLink><SiteLink className="button header-button" href="#/contact">Let’s connect <Icon name="diagonal" size={16}/></SiteLink></div>
    <details ref={menuRef} className="mobile-menu" onKeyDown={escape}><summary aria-label="Open navigation menu"><Icon name="menu"/> Menu</summary><nav aria-label="Mobile navigation">{links.map(([path, label]) => <SiteLink key={path} href={`#/${path}`} aria-current={current(path)} onClick={closeMenu}>{label}<Icon name="diagonal" size={16}/></SiteLink>)}<SiteLink href="#/admin" onClick={closeMenu}>Agent login<Icon name="diagonal" size={16}/></SiteLink></nav></details>
  </header></div>;
}
