import { useAgent } from './context/AgentContext.js';
import { useState } from 'react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import PropertyDetails from './components/PropertyDetails.jsx';
import PageIntro from './components/PageIntro.jsx';
import Home from './pages/Home.jsx';
import AgentAdmin from './pages/AgentAdmin.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import ActiveListings from './pages/ActiveListings.jsx';
import SoldListings from './pages/SoldListings.jsx';
import usePage from './hooks/usePage.js';
import './App.css';

// App owns the shared layout and passes listing actions to separate pages.
export default function App() {
  const { page, key: routeKey } = usePage();
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

  if (page === 'admin' || page === 'login') return <AgentAdmin />;

  return (
    <>
      <div className="demo-bar">Demo website · Sample listings · No live MLS feed</div>
      {agent.contentStatus === 'error' && <div className="content-notice" role="status">Website details could not be loaded. Showing demo information. Please try again shortly.</div>}
      {agent.contentStatus === 'missing' && <div className="content-notice">Sample agent details · Sign in to publish your profile.</div>}
      <Header page={page} />
      <main id="main-content" key={`page-${routeKey}`}>
        {pages[page] || <><PageIntro eyebrow="PAGE NOT FOUND" title="Let’s get you back home." description="This demo page does not exist." /><div className="container not-found"><a className="button" href="#/home">Return home ↗</a></div></>}
      </main>
      <Footer />
      <PropertyDetails key={`dialog-${routeKey}`} property={selected?.routeKey === routeKey ? selected.property : null} onClose={() => setSelected(null)} />
    </>
  );
}
