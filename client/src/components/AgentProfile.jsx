import { imageUrl } from '../services/siteContent.js';
import { useAgent } from '../context/AgentContext.js';
import homeDetail from '../assets/home-three.jpg';
import Icon from './Icon.jsx';
export default function AgentProfile() {
  const agent = useAgent();
  return <div className={`agent-profile ${agent.photoPath ? 'has-portrait' : 'has-monogram'}`}>
    <div className="profile-visual">{agent.photoPath ? <img className="agent-photo" src={imageUrl(agent.photoPath)} alt={agent.photoAlt || agent.name}/> : <><img className="profile-home" src={homeDetail} alt="Sample home exterior" loading="lazy"/><span className="profile-monogram">{agent.initials}</span><span className="profile-visual-note">A LOCAL PERSPECTIVE.<br/>A PERSONAL COMMITMENT.</span></>}</div>
    <div className="profile-identity"><div><strong>{agent.name}</strong><span>{agent.professionalTitle}</span><small>{agent.brokerage}</small></div><span className="profile-location"><Icon name="pin" size={16}/>{agent.location}</span></div>
  </div>;
}
