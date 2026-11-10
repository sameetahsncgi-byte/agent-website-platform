import { useState } from 'react';
import PageIntro from '../components/PageIntro.jsx';
import { useAgent } from '../context/AgentContext.js';
import '../styles/Contact.css';

export default function Contact() {
  const agent = useAgent();
  const [submitted, setSubmitted] = useState(false);
  return <>
    <PageIntro eyebrow="GET IN TOUCH" title="Let’s talk about your next move." description="A question, an idea, or a plan taking shape—start the conversation here." />
    <section className="contact-layout container"><aside className="contact-information">
      <span className="eyebrow">YOUR LOCAL CONNECTION</span><h2>I’m here to help.</h2><p>Tell me a little about what you’re looking for, and we can explore the next steps together.</p>
      <div className="contact-item"><span>Email</span><a href={`mailto:${agent.email}`}>{agent.email}</a></div>
      <div className="contact-item"><span>Phone</span><a href={`tel:${agent.phone}`}>{agent.phone}</a></div>
      <div className="contact-item"><span>Based in</span><strong>{agent.location}</strong></div>
      <div className="contact-item"><span>Brokerage</span><strong>{agent.brokerage}</strong></div>
      {agent.address && <div className="contact-item"><span>Office address</span><strong className="agent-story">{agent.address}</strong></div>}
      <div className="agent-socials">{['website', 'facebook', 'instagram', 'linkedin'].map(key => agent[key] && <a key={key} href={agent[key]} target="_blank" rel="noopener noreferrer">{key === 'website' ? 'Website' : key[0].toUpperCase() + key.slice(1)} ↗</a>)}</div>
    </aside><div className="contact-form-panel">
      {submitted ? <div className="form-confirmation" role="status"><span className="confirmation-symbol">✓</span><h2>Your demo form is complete.</h2>
        <p>The form passed browser validation. No message was sent or stored. Email delivery will be connected later.</p>
        <button className="button" type="button" onClick={() => setSubmitted(false)}>Try the form again</button>
      </div> : <form className="contact-form" onSubmit={event => { event.preventDefault(); setSubmitted(true); }}>
        <h2>Send a message</h2><div className="form-row">
          <label>Your name<input name="name" autoComplete="name" placeholder="Full name" required /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
        </div><div className="form-row">
          <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="Optional" /></label>
          <label>I’m interested in<select name="interest" defaultValue="" required><option value="" disabled>Select an option</option>
            <option>Buying a home</option><option>Selling a home</option><option>A specific property</option><option>General information</option></select></label>
        </div><label>Your message<textarea name="message" rows={6} minLength={10} placeholder="Tell me about your plans..." required /></label>
        <p className="demo-note">Demo form only. Please use sample information.</p><button className="button" type="submit">Preview form submission ↗</button>
      </form>}
    </div></section>
  </>;
}
