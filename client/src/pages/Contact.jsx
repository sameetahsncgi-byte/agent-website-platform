import { useRef, useState } from 'react';
import ContactSecurity from '../components/ContactSecurity.jsx';
import PageIntro from '../components/PageIntro.jsx';
import { useAgent } from '../context/AgentContext.js';
import '../styles/Contact.css';

export default function Contact() {
  const agent = useAgent();
  const [submitted, setSubmitted] = useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [token,setToken]=useState('');
  const [reset,setReset]=useState(0);
  const sending=useRef(false);
  async function submit(event){
    event.preventDefault();
    if(sending.current)return;
    if(!token){setError('Complete the security check before sending.');return;}
    const values=Object.fromEntries(new FormData(event.currentTarget));
    sending.current=true;setBusy(true);setError('');
    try{
      const endpoint=new URL('/api/contact',window.location.origin);
      const sites=new URLSearchParams(window.location.search).getAll('site');
      for(const site of sites)endpoint.searchParams.append('site',site);
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,token}),signal:AbortSignal.timeout(65000)});
      const result=await response.json();
      if(!response.ok || !result.ok)throw Error(result.error || 'Your message could not be confirmed. Please use email or phone.');
      setSubmitted(true);
    }catch(failure){setError(failure.name==='TimeoutError'?'We could not confirm delivery. Please contact the agent by email or phone before submitting again.':failure.message || 'Unable to send. Please use email or phone.');}
    finally{sending.current=false;setBusy(false);setToken('');setReset(value=>value+1);}
  }
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
      {submitted ? <div className="form-confirmation" role="status"><span className="confirmation-symbol">✓</span><h2>Thank you for your message.</h2>
        <p>Your message has been submitted to the agent. They can reply directly to your email.</p>
        <button className="button" type="button" onClick={() => setSubmitted(false)}>Send another message</button>
      </div> : <form className="contact-form" onSubmit={submit}>
        <h2>Send a message</h2><fieldset disabled={busy}><div className="form-row">
          <label>Your name<input name="name" maxLength={100} autoComplete="name" placeholder="Full name" required /></label>
          <label>Email address<input name="email" maxLength={254} type="email" autoComplete="email" placeholder="you@example.com" required /></label>
        </div><div className="form-row">
          <label>Phone number<input name="phone" maxLength={50} type="tel" autoComplete="tel" placeholder="Optional" /></label>
          <label>I’m interested in<select name="interest" defaultValue="" required><option value="" disabled>Select an option</option>
            <option>Buying a home</option><option>Selling a home</option><option>A specific property</option><option>General information</option></select></label>
        </div><label>Your message<textarea name="message" rows={6} minLength={10} maxLength={3000} placeholder="Tell me about your plans..." required /></label>
        <label className="contact-honeypot" aria-hidden="true">Company website<input name="company" tabIndex={-1} autoComplete="off" /></label>
        <p className="contact-privacy">Your details will be emailed to the agent so they can respond to your enquiry.</p>
        <ContactSecurity onToken={setToken} reset={reset}/>
        <p className="contact-feedback" role="status" aria-live="polite">{error || (busy?'Sending your message…':'')}</p>
        <button className="button" type="submit" disabled={busy || !token}>{busy?'Sending…':'Send message ↗'}</button></fieldset>
      </form>}
    </div></section>
  </>;
}
