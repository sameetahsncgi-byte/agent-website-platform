import { imageUrl } from '../services/siteContent.js';
import { useAgent } from '../context/AgentContext.js';
export default function AgentProfile() {
  const agent = useAgent();
  return <div className="agent-profile"><span className="profile-initials">{agent.photoPath ? <img className="agent-photo" src={imageUrl(agent.photoPath)} alt={agent.name} /> : agent.initials}</span>
    <strong>{agent.name}</strong><span>{agent.brokerage}</span><span>{agent.location}</span>
    <small>{agent.professionalTitle}</small></div>;
}
