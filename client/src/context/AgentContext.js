import { createContext, useContext } from 'react';
import { defaultContent } from '../services/siteContent.js';
export const AgentContext = createContext(defaultContent);
export const useAgent = () => useContext(AgentContext);
