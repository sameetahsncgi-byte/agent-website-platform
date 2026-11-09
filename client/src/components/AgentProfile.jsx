import { agent } from '../data/agent.js';
export default function AgentProfile() {
  return <div className="agent-profile"><span className="profile-initials">{agent.initials}</span>
    <strong>{agent.name}</strong><span>{agent.brokerage}</span><span>{agent.location}</span>
    <small>Demo agent profile</small></div>;
}
