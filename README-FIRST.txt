DOMAIN NAME LOCKS, DASHBOARD SYNC AND RETIRED ADDRESSES

INSTALL
1. Keep all accounts, content, prior updates, environment variables, DNS and Vercel settings. Back up matching files.
2. Extract and merge this ZIP's client and supabase folders into your project root. Replace matching files only; do not delete/replace the whole src folder.
3. In Supabase > SQL Editor run ALL of supabase/setup-domain-locks.sql. This requires the earlier setup-editable-subdomains.sql and previous migrations. Expected result: Domain locks and current-address routing are ready.
4. Push the included files to your existing GitHub repository and wait for Vercel to deploy.
5. Refresh both dashboards or log back in to load the new settings.
No new dependencies, environment variables or DNS records are required.

NEW RENAME BEHAVIOR
Changing first.brokerage.sncgi.com to second.brokerage.sncgi.com now makes only second.brokerage.sncgi.com display that agent's website. The old brokerage address shows Website unavailable; it does not redirect or continue displaying the website.
The migration also retires historical brokerage aliases saved by the previous version. Old names remain reserved to the same website so another agent cannot claim them. They are retained only as private reservations, not active public routes.
The wildcard DNS and HTTPS still cover these names. Inactive addresses can still reach the application shell, which displays Website unavailable rather than the agent's content. Already-open public pages recheck within about 30 seconds or on focus/refresh. New page loads check the current mapping immediately.
Internal website IDs, content, images, accounts and the older platform ?site=... link remain unchanged. A brokerage rename does not change a separately configured purchased custom domain.

LOCK / UNLOCK IN SUPER ADMIN
Open Super Admin > Website management > the agent.
Click Lock domain name to prevent the agent from renaming their brokerage address.
The control changes to Unlock domain name and the row shows Domain name locked for agent.
The agent sees exactly: Domain is locked. Please contact support.
Their name input and save button are disabled. The database also rejects agent rename calls while locked, including direct API/RPC attempts or a stale browser form.
Super Admin can still rename a locked domain. Unlock domain name restores the agent's rename option.
Locking controls the domain name only; it does not disable the public website, prevent content edits, or alter the agent login.
All existing domains start unlocked unless you explicitly lock them. New accounts also default to unlocked.

SYNCHRONIZATION
Both dashboards use the same saved hostname, subdomain and lock state.
An agent rename updates the current settings and onboarding handle in the same database transaction. Super Admin reads those updated values in Website management and Agent accounts.
Dashboards refresh on focus and every 10 seconds while visible. Tabs on the same browser origin also notify each other after a settings change. Across different subdomains/origins, use focus or allow up to 10 seconds for the next automatic refresh. Refresh websites / Check session remain available for a manual check.
Background refresh keeps the content editor mounted, so unsaved biography/contact/theme edits are not cleared by a hostname or lock update.
A background network error may delay the displayed update, but the database lock still enforces the current rule immediately.

QUICK TEST
Keep an agent dashboard and Super Admin open in separate tabs/windows.
- Rename the agent address. Confirm Super Admin reflects the new hostname/handle after focus or within 10 seconds.
- Open the old brokerage address in a fresh tab: it should show Website unavailable.
- Lock domain name in Super Admin. Confirm the agent sees the support message and cannot edit the name.
- Rename from Super Admin while locked: the new current address should update in the agent dashboard while the lock stays enabled.
- Unlock, then confirm the agent can rename again.

DATABASE SAFETY
Previous names remain reserved and private. Only the current brokerage slug resolves publicly. Existing custom domains and website enable/disable states are preserved.
Only the token-verified Super Admin backend can change the lock. Lock changes and renames serialize on the same profile row, preventing the agent operation from bypassing a committed lock. The authenticated agent rename wrapper never accepts another site/user ID from the browser.
The migration is rerunnable and does not reset existing locks. If you ever rerun older setup scripts, run setup-domain-locks.sql LAST to retain the latest behavior. Older migrations do not need to be rerun for this installation.

VERIFICATION
44 automated tests passed, including domain lock API authorization, direct-RPC error feedback, dashboard refresh events, lock/hostname reload, existing login/onboarding/website controls, and content validation. Production build passed.
Isolated PostgreSQL-compatible checks passed for retirement of prior addresses, current address resolution, database-enforced agent lock, denial of self-unlock, Super Admin override, agent rename after unlock, consistent settings/onboarding handles, preserved custom domain/disabled state, and migration reruns.
The two-tab browser check could not be completed because the browser transport disconnected. Temporary QA adapters were restored before packaging. Your live Supabase and Vercel application code have not been changed by this download.
