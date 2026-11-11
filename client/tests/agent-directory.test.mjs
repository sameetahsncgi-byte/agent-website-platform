import test from 'node:test';
import assert from 'node:assert/strict';
import {filterAgentWebsites,agentAccountStatus,agentWebsiteStatus} from '../src/services/agentDirectory.js';
const rows=[{name:'Rizwan Sabbir',email:'rizwan@example.com',active:true,enabled:true},{name:'Jordan Muse',email:'jordan@sncgi.net',active:false,enabled:true,publicEligible:true,onboardingStatus:'invited'},{name:'Original Agent',email:null,active:true,enabled:false}];
test('name/email search handles case, partial text, blank queries and missing email',()=>{
  assert.deepEqual(filterAgentWebsites(rows,' SABBIR '),[rows[0]]);
  assert.deepEqual(filterAgentWebsites(rows,'JORDAN@SNCGI'),[rows[1]]);
  assert.deepEqual(filterAgentWebsites(rows,'original'),[rows[2]]);
  assert.deepEqual(filterAgentWebsites(rows,'   '),rows);
  assert.deepEqual(filterAgentWebsites(rows,'no-match'),[]);
});
test('publishing and account setup are distinct statuses',()=>{
  assert.equal(agentAccountStatus(rows[1]),'Setup pending');
  assert.equal(agentWebsiteStatus(rows[1]),'Website live');
  assert.equal(agentWebsiteStatus(rows[2]),'Website disabled');
  assert.equal(agentAccountStatus(rows[2]),'Account ready');
});
