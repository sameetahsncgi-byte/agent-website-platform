import test from 'node:test';import assert from 'node:assert/strict';
import {agentPortalOrigin,agentAdminHref,invitationFromLocation} from '../src/services/agentPortal.js';
test('admin links use the agent brokerage origin and clean admin path without tokens or site queries',()=>{
 assert.equal(agentAdminHref({subdomainSlug:'mueed',hostname:'other.example.com'}),'https://mueed.brokerage.sncgi.com/admin');
 assert.equal(agentAdminHref({site_slug:'new-agent'}),'https://new-agent.brokerage.sncgi.com/admin');
 assert.equal(agentAdminHref(null),null);
 for(const slug of ['evil.example.com','../admin','one@evil.com','https://evil.com'])assert.throws(()=>agentPortalOrigin(slug));
});
test('new fragment invitations and existing hash-route invitations are supported',()=>{
 const token='a'.repeat(64);
 for(const url of [`https://mueed.brokerage.sncgi.com/onboarding#token_hash=${token}&type=invite`,`https://platform.example.com/#/onboarding?token_hash=${token}&type=recovery`]){
  const parsed=invitationFromLocation(new URL(url));assert.equal(parsed.token,token);assert.ok(['invite','recovery'].includes(parsed.type));
 }
 for(const fragment of ['#token_hash=x&type=invite',`#token_hash=${token}&type=signup`,`#token_hash=${token}&token_hash=${token}&type=invite`])assert.equal(invitationFromLocation(new URL('https://example.com/onboarding'+fragment)),null);
});
