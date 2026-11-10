import { useAgent } from '../context/AgentContext.js';
import Icon from './Icon.jsx';
export default function ContactCallout() {
  const agent = useAgent();
  return <section className="contact-callout"><div className="container callout-inner"><div><span className="eyebrow">GOOD THINGS START WITH A CONVERSATION</span><h2>Your next chapter.<br/><em>Let’s find it together.</em></h2></div><div className="callout-action"><p>A question, an idea, or a move on the horizon.<br/>I’d love to hear what you have in mind.</p><a className="button button-cream" href="#/contact">Let’s talk <Icon name="diagonal" size={18}/></a>{agent.phone && <a className="callout-phone" href={`tel:${agent.phone}`}><Icon name="phone" size={15}/>{agent.phone}</a>}</div></div></section>;
}
