import AgentProfile from '../components/AgentProfile.jsx';
import PageIntro from '../components/PageIntro.jsx';
import ContactCallout from '../components/ContactCallout.jsx';
import { agent } from '../data/agent.js';
import '../styles/About.css';

export default function About() {
  return <>
    <PageIntro eyebrow="MEET YOUR AGENT" title={`Hello, I’m ${agent.name.split(' ')[0]}.`} description="A local perspective and a personal commitment to helping you find your next chapter." />
    <section className="about-page container"><div className="about-grid"><AgentProfile />
      <div className="about-content"><span className="eyebrow">MY APPROACH</span><h2>Your goals come first.<br />Every step of the way.</h2>
        <p>Home means something different to everyone. It might be a fresh start, room to grow, or a place that simply feels right.</p>
        <p>{agent.bio} From exploring neighborhoods to preparing for a sale, I focus on practical next steps that reflect your plans.</p>
        <p>This is a sample biography. Later, each agent can replace it with their own story, background, and areas of expertise.</p>
        <a className="button" href="#/contact">Let’s connect ↗</a>
      </div></div>
      <div className="values-grid">
        <article><span className="eyebrow">01 · COMMUNICATION</span><h3>Clarity at every step</h3><p>Straightforward answers and regular updates so you can make informed decisions.</p></article>
        <article><span className="eyebrow">02 · UNDERSTANDING</span><h3>A plan built around you</h3><p>Your priorities, timing, and preferences shape how we approach your next move.</p></article>
        <article><span className="eyebrow">03 · GUIDANCE</span><h3>Support that stays personal</h3><p>A consistent point of contact as you explore your options and move forward.</p></article>
      </div>
    </section><ContactCallout />
  </>;
}
