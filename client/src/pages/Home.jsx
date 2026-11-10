import AgentProfile from '../components/AgentProfile.jsx';
import ContactCallout from '../components/ContactCallout.jsx';
import ListingsCollection from '../components/ListingsCollection.jsx';
import { useAgent } from '../context/AgentContext.js';
import { properties } from '../data/properties.js';
import '../styles/Home.css';

export default function Home(listingActions) {
  const agent = useAgent();
  return <>
    <section className="hero"><div className="hero-content">
      <span className="eyebrow">{agent.location} · A PERSONAL APPROACH</span>
      <h1>{agent.headline}</h1><p>Local insight. Thoughtful guidance. A real estate experience built around what matters to you.</p>
      <a className="button" href="#/active-listings">Find your next home ↗</a>
    </div><div className="hero-image"><img src={properties[0].image} alt="Sample home exterior" />
      <span className="image-caption">A place for your next beginning.</span></div></section>
    <ListingsCollection status="Active" {...listingActions} />
    <section className="home-about"><div className="about-grid container"><AgentProfile />
      <div className="about-content"><span className="eyebrow">MEET YOUR AGENT</span>
        <h2>A personal approach to your next move.</h2><p>I’m {agent.name.split(' ')[0]}. {agent.bio}</p>
        <a className="button" href="#/about">More about me ↗</a>
      </div></div></section>
    <ContactCallout />
  </>;
}
