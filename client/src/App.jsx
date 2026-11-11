import SiteLink from './components/SiteLink.jsx';
import { useAgent } from './context/AgentContext.js';
import { useState } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import PropertyDetails from './components/PropertyDetails.jsx';
import PageIntro from './components/PageIntro.jsx';
import Home from './pages/Home.jsx';
import AgentAdmin from './pages/AgentAdmin.jsx';
import SuperAdmin from './pages/SuperAdmin.jsx';
import Onboarding from './pages/Onboarding.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import ActiveListings from './pages/ActiveListings.jsx';
import SoldListings from './pages/SoldListings.jsx';
import usePage from './hooks/usePage.js';
import './App.css';
import { themeVariables } from './data/themes.js';
import './styles/Themes.css';

// App owns the shared layout and passes listing actions to separate pages.
export default function App({initialPage}) {
  const { page, key: routeKey } = usePage(initialPage);
  const agent = useAgent();
  const [saved, setSaved] = useState([]);
  const [selected, setSelected] = useState(null);

  function toggleSaved(id) {
    setSaved(current => current.includes(id)
      ? current.filter(item => item !== id) : [...current, id]);
  }

  const listingActions = { saved, onSave: toggleSaved, onView: property => setSelected({ routeKey, property }) };
  const pages = {
    home: <Home {...listingActions} />,
    about: <About />,
    contact: <Contact />,
    'active-listings': <ActiveListings {...listingActions} />,
    'sold-listings': <SoldListings {...listingActions} />,
  };

  if (page === 'onboarding') return <Onboarding />;
  if (page === 'super-admin') return <SuperAdmin />;
  if (page === 'admin' || page === 'login') return <AgentAdmin />;

  // Never render the default agent while another site's content is loading,
  // missing, inactive, or unavailable. Admin routes above remain accessible.
  if (agent.contentStatus !== 'ready') return <main className="container" style={{ paddingBlock: 80 }}>
    <h1>{agent.contentStatus === 'loading' ? 'Loading website…' : agent.contentStatus === 'missing' ? 'Website unavailable' : 'Unable to load this website'}</h1>
    <p role="status">{agent.contentStatus === 'loading' ? 'Getting this agent’s website details.' : agent.contentStatus === 'missing' ? 'Check the website address or contact the agent. This website may not be active yet.' : 'Check the website address and your connection, then try again.'}</p>
    {agent.contentStatus === 'error' && <button className="button" onClick={() => window.location.reload()}>Try again</button>}
    <p><SiteLink href="#/admin">Agent sign in</SiteLink></p>
  </main>;

  return (
    <div className="website-theme" data-theme={agent.themeKey || 'forest'} style={themeVariables(agent.themeKey)}>
      <div className="demo-bar">Demo website · Sample listings · No live MLS feed</div>
      <Header page={page} />
      <main id="main-content" key={`page-${routeKey}`}>
        {pages[page] || <><PageIntro eyebrow="PAGE NOT FOUND" title="Let’s get you back home." description="This demo page does not exist." /><div className="container not-found"><SiteLink className="button" href="#/home">Return home ↗</SiteLink></div></>}
      </main>
      <Footer />
      <PropertyDetails key={`dialog-${routeKey}`} property={selected?.routeKey === routeKey ? selected.property : null} onClose={() => setSelected(null)} />
    </div>
  );
}
