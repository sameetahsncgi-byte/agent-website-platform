import { useEffect, useRef } from 'react';
import { agent } from '../data/agent.js';

export default function Header({ page }) {
  const menuRef = useRef(null);
  useEffect(() => {
    function closeOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) menuRef.current.open = false;
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  function closeMenu() { if (menuRef.current) menuRef.current.open = false; }
  const current = value => page === value ? 'page' : undefined;

  return (
    <header className="site-header container">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <a href="#/home" className="brand" onClick={closeMenu}>
        <span className="brand-mark">{agent.initials}</span>
        <span><strong>{agent.name}</strong><small>{agent.brokerage}</small></span>
      </a>
      <nav aria-label="Main navigation">
        <a href="#/home" aria-current={current('home')} onClick={closeMenu}>Home</a>
        <a href="#/about" aria-current={current('about')} onClick={closeMenu}>About Me</a>
        <details ref={menuRef} className="listing-dropdown" onKeyDown={event => {
          if (event.key === 'Escape') {
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary').focus();
          }
        }}>
          <summary className={page.includes('listings') ? 'current-section' : ''}>Listings ⌄</summary>
          <div className="dropdown-menu">
            <a href="#/active-listings" aria-current={current('active-listings')} onClick={closeMenu}>Active Listings</a>
            <a href="#/sold-listings" aria-current={current('sold-listings')} onClick={closeMenu}>Sold Listings</a>
          </div>
        </details>
        <a href="#/contact" aria-current={current('contact')} onClick={closeMenu}>Contact</a>
        <a href="#/admin" onClick={closeMenu}>Agent Login</a>
      </nav>
      <a href="#/contact" className="button header-button" onClick={closeMenu}>Let’s talk ↗</a>
    </header>
  );
}
