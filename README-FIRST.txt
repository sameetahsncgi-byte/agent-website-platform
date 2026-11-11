AUTOMATIC BROKERAGE SUBDOMAINS

Your public address format: https://<chosen-handle>.brokerage.sncgi.com/
This update uses the wildcard already added to the existing Vercel project.
It does not require per-agent Vercel domains, new DNS records, or Vercel API tokens.

INSTALL IN THIS ORDER
1. Keep all existing accounts, content, environment variables, DNS records and Vercel domains. Back up matching code files.
2. Extract this ZIP. Merge the included client and supabase folders into your existing project root. Replace matching files only; do not delete the entire src folder.
3. Supabase > SQL Editor > New query: paste and run ALL of supabase/setup-automatic-subdomains.sql. This requires your previous setup-website-controls.sql and onboarding setup to have been installed. Expected result: Automatic brokerage subdomains are ready.
4. Commit/push the included code to your existing GitHub repository. Wait for Vercel's production deployment. No new packages or environment variables are required. Keep APP_URL=https://agent-website-platform.vercel.app.
5. Refresh Super Admin at https://agent-website-platform.vercel.app/#/super-admin.

CREATE A NEW WEBSITE
Enter agent name, an unused login email, and a unique website handle. Example handle: yasir.
The form previews yasir.brokerage.sncgi.com. Click Create website & onboarding link.
The backend creates the pending account, starter content and hostname settings in one database transaction. The website becomes public immediately, while editor access remains locked until the invitation is accepted and the password is set.
The result shows TWO links: a public website address and a private onboarding link. Share the public address with anyone; share the onboarding link only with its intended agent. No invitation email is sent automatically.
The site starts with the supplied name, a generic biography/headline, default theme and sample listings. The private login email is not copied into public contact information. Agents can fill their real public details, photos and branding after onboarding.
No action in Vercel or GoDaddy is needed for each new agent under this wildcard.

EXISTING AGENTS
Do not recreate existing accounts. The migration gives agents created through Super Admin an automatic address based on their EXISTING website handle, including accounts still waiting for onboarding. Existing disabled states, content and primary/custom hostnames are preserved.
Example: site-yasir-fareed gets yasir-fareed.brokerage.sncgi.com, not yasir.brokerage.sncgi.com. The chosen handle determines the address.
In Website management, click Refresh websites. Each onboarded agent now has an Automatic address link. If an existing primary hostname is already set, Visit website continues using it; the new automatic address works as well. To make the automatic address primary, save it in that agent's Website hostname field.
The original manually enrolled demo account without an onboarding handle is left unchanged.
If the migration reports a hostname conflict, its transaction rolls back; do not delete existing rows to force it through. Review the exact error first.

ENABLE / DISABLE
Existing controls remain. Disable website blocks its generated subdomain, assigned custom/legacy hostname, and older platform query link. Enable restores it.
A starter can show Website live · account setup pending; this does NOT give the recipient editor access before verification. Completed accounts whose account access is later disabled remain unavailable publicly as well.
Removing a primary hostname mapping does not release the reserved default subdomain. Disable the website if you want all of its public addresses unavailable.
Existing visible pages recheck publishing status about every 30 seconds and on focus; refresh checks it immediately.

DNS
Keep GoDaddy's main nameservers and existing email/website records unchanged. Keep *.brokerage.sncgi.com attached to the existing Vercel project and preserve the certificate delegation and wildcard CNAME records. The root brokerage.sncgi.com is not covered by the wildcard; it does not need to be used as a public agent page.
A DNS Change Recommended label can remain when Vercel recommends moving the whole DNS zone. What matters for the external-DNS setup is correct wildcard routing and working HTTPS. Before this package was prepared, yasir.brokerage.sncgi.com returned HTTPS 200 from this environment; this verifies connectivity, not that Yasir's content mapping was already installed.
Custom domains outside brokerage.sncgi.com still require separate Vercel/DNS setup. That workflow has not been automated here.

IMPORTANT
This SQL intentionally publishes enabled pending starter websites. Disabled websites remain disabled. It never activates a pending agent profile or changes an auth password. Existing Supabase Row Level Security continues to protect editing, private settings and onboarding records.
If you ever rerun older setup-onboarding.sql, setup-content.sql or setup-website-controls.sql, run setup-automatic-subdomains.sql LAST to restore the newest function definitions. No old scripts need rerunning for this installation.
Wildcard HTTPS/DNS alone does not select agent content. This migration and code update are both necessary.

VALIDATION
37 automated tests passed; production build passed. PostgreSQL-compatible checks verified immediate public starters, editor lockout before onboarding, duplicate-handle rollback, hostname reservation ownership, preserved disabled/custom-domain state, unknown-host rejection, onboarding completion and later account suspension. Browser checks with local sample data verified URL preview, separate public/private links and the live-site/pending-account status. Temporary QA adapters were restored before packaging. Live Supabase and Vercel application code have not been modified by this download.
