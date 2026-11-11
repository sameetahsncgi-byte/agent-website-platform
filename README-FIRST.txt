EDITABLE AGENT WEBSITE NAMES

This fixes the old reservation error when changing a brokerage hostname and adds an agent self-service website name editor.
Example: rizwan-sabbir.brokerage.sncgi.com -> rizz-sabbir.brokerage.sncgi.com
The internal website ID stays site-rizwan-sabbir. Content, profile, login and uploaded images are not moved or recreated.

INSTALL
1. Keep all previous updates, accounts, content, environment variables, DNS and wildcard settings. Back up the matching files.
2. Extract this ZIP and merge its client and supabase folders into your existing project root. Replace matching files only. Do not replace/delete the whole src folder.
3. Supabase > SQL Editor > New query: run ALL of supabase/setup-editable-subdomains.sql. This requires the previous setup-automatic-subdomains.sql migration. Expected result: Editable brokerage subdomains are ready.
4. Commit and push the files to your existing GitHub repository and wait for Vercel to finish deploying.
5. Refresh the agent dashboard and Super Admin. If necessary, log out and back in so the new website settings load.
No new environment variables, dependencies, Vercel API keys, domains or GoDaddy DNS changes are required.

AGENT DASHBOARD
The agent signs in and opens Your website address, above the content editor.
Enter ONLY the changeable part, for example rizz-sabbir, in Website name.
The suffix .brokerage.sncgi.com is shown separately and cannot be edited.
Click Save website name. The current agent's View my website / About Me / Contact / View live page links update after success.
Use 3-40 letters, numbers or single hyphens. Input is trimmed and converted to lowercase. Names must be unique; system names such as admin/api/www are reserved.
An agent can change only their own active account's website. A pending invite recipient must finish onboarding before using the editor.
Unsaved website content edits remain in the editor when the address changes. Save the content separately as usual.
Changing the website address does not change the public Full name; that remains editable under About Me.

SUPER ADMIN
Continue using Website management > the agent > Website hostname.
For the screenshot example enter the full hostname:
rizz-sabbir.brokerage.sncgi.com
Click Save hostname. Brokerage hostnames now use the atomic reservation/rename operation instead of the old direct mapping update that caused the error.
Super Admin can rename a pending or active agent's address. The agent's internal website ID remains unchanged.
If the agent already has a separate custom primary hostname, it stays primary; this rename changes their automatic brokerage address. The Automatic address link in Website management shows the updated name. Purchased custom domains still use the existing manual Vercel/DNS setup.

PREVIOUS LINKS AND RESERVATIONS
Previous brokerage subdomains keep opening the same website as aliases. They do not redirect in this version. Another agent cannot claim them. The current address is shown as the automatic/default address.
Website Enable/Disable controls apply to all brokerage aliases and custom hostnames. Renaming never enables a disabled website or activates a pending/disabled account.
Old names are intentionally retained; there is no interface to release an old reservation in this update.
Browser sign-in is per hostname: opening a new hostname may require logging in there once. Existing content remains tied to the same website ID.

DATABASE SAFETY
The migration adds a private handle reservation table and a current subdomain field. Public visitors can resolve only enabled website addresses, not list the reservation table.
The self-service RPC identifies the agent from their authenticated user ID; the browser cannot supply another site or user ID. Super Admin renames pass the token-verified administrator ID from the server. Names are reserved and current settings updated in a single transaction.
Existing custom domains, disabled states, website content and user accounts are preserved. New accounts created by the existing provisioning function reserve their handles automatically via a database trigger.
The migration is rerunnable. If you rerun older migrations, run setup-editable-subdomains.sql LAST so the newest reservation and hostname functions are retained. You do not need to rerun older migrations for this installation.

VALIDATION
40 automated tests passed and production build passed. Isolated PostgreSQL-compatible checks verified owner rename, unchanged content/site ID, preserved aliases, cross-agent denial, anonymous denial, service-only administrative operation, pending account restrictions, invalid/reserved names, custom domain and disabled-state preservation, protection against future accounts reclaiming aliases, fresh website provisioning, and migration reruns.
Local browser checks verified the new name editor, updated dashboard links, preserved unsaved content, success feedback and duplicate-name feedback. Temporary QA adapters were restored before packaging. Your live Supabase database and Vercel deployment have not been changed by this download.
