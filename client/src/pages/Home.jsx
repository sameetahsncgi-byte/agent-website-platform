import SiteLink from '../components/SiteLink.jsx';
import AgentProfile from '../components/AgentProfile.jsx';
import ContactCallout from '../components/ContactCallout.jsx';
import ListingsCollection from '../components/ListingsCollection.jsx';
import Icon from '../components/Icon.jsx';
import { useAgent } from '../context/AgentContext.js';
import {imageUrl} from '../services/siteContent.js';
import hero from '../assets/real-estate-hero.webp';
import '../styles/Home.css';

export default function Home(listingActions) {
  const agent = useAgent();
  return <>
    <section className="hero" style={{'--hero-overlay':(agent.heroOverlay ?? 55)/100}}>
      <img className="hero-background" src={agent.heroPath?imageUrl(agent.heroPath):hero} alt={agent.heroAlt || (agent.heroPath?'':'Illustrative contemporary home surrounded by greenery')} fetchPriority="high" />
      <div className="hero-shade" />
      <div className="hero-content container"><span className="hero-location"><span className="location-dot"/>{agent.location} · REAL ESTATE</span>
        <h1>{agent.headline}</h1><p>A place to belong. A move to look forward to.<br/>Thoughtful guidance for whatever comes next.</p>
        <div className="hero-actions"><SiteLink className="button button-cream" href="#/active-listings">Explore homes <Icon name="diagonal" size={18}/></SiteLink><SiteLink className="hero-text-link" href="#/about">Meet {agent.name.split(' ')[0]} <Icon name="arrow" size={18}/></SiteLink></div>
      </div>
      <div className="hero-footnote"><span>HOME IS MORE THAN AN ADDRESS.</span><span>{agent.heroPath?'Agent website':'Illustrative home · Demo website'}</span></div>
    </section>
    <div className="home-listings"><ListingsCollection status="Active" {...listingActions} /></div>
    <section className="home-about"><div className="about-grid container"><div className="home-profile-wrap"><AgentProfile/><span className="profile-caption">A personal connection. A clearer path forward.</span></div>
      <div className="about-content"><span className="eyebrow">A LITTLE ABOUT ME</span><h2>Real estate is personal.<br/><em>So is my approach.</em></h2><p className="intro-name">Hi, I’m {agent.name}.</p><p>{agent.bio}</p>
        <SiteLink className="text-link" href="#/about">Get to know me <Icon name="diagonal" size={19}/></SiteLink>
      </div></div></section>
    <section className="next-move container"><div className="section-heading"><div><span className="eyebrow">YOUR MOVE, YOUR WAY</span><h2>Where would you like to start?</h2></div><p>Every move begins with a conversation.</p></div>
      <div className="move-options">
        <SiteLink href="#/active-listings"><span className="move-number">01</span><h3>Find a place to call home.</h3><p>Explore available properties and discover what feels right for your next chapter.</p><span className="text-link">I’m looking to buy <Icon name="diagonal"/></span></SiteLink>
        <SiteLink href="#/contact"><span className="move-number">02</span><h3>Make your next move.</h3><p>Talk through your plans, your timing, and the next steps for selling your home.</p><span className="text-link">I’m thinking of selling <Icon name="diagonal"/></span></SiteLink>
        <SiteLink href="#/about"><span className="move-number">03</span><h3>Get a little guidance.</h3><p>Get to know the person who will help you navigate the decisions along the way.</p><span className="text-link">Let’s get acquainted <Icon name="diagonal"/></span></SiteLink>
      </div>
    </section>
    <ContactCallout />
  </>;
}
