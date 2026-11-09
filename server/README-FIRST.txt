AGENT LOGIN + ADMIN DASHBOARD — FIRST MILESTONE

This patch is for the React/Node project built in our conversation, including
its Active/Pending API listing update. Back up your project folder first if
you have made further changes. This adds login and a dashboard only; the
About Me and Contact editing forms will come in the next milestone.

1. COPY FILES
Stop both servers with Ctrl+C. Extract this ZIP.
Merge the included client folder into D:\Demo agent website\client.
Merge the included server folder into D:\Demo agent website\server.
Replace matching files. Do NOT delete either existing folder or src.
Keep both package.json files, lockfiles, installed packages, and server/.env.
The included server/index.js preserves the existing SimplyRETS demo endpoint.
If you added unrelated custom backend routes, merge them into it first.

2. CHECK SERVER SETTINGS
Keep your existing server/.env. Add this line if it is missing:
APP_ORIGIN=http://localhost:5173
Keep PORT=3001 and your existing SIMPLYRETS_USERNAME and SIMPLYRETS_PASSWORD.
.env.example is a reference, not an instruction to overwrite your .env.
The included Vite configuration uses port 5173 and forwards all /api requests.
Always use http://localhost:5173 in the browser, not the 127.0.0.1 frontend URL.

3. CREATE YOUR AGENT ACCOUNT (ONCE)
Open PowerShell in VS Code and run:
cd "D:\Demo agent website\server"
node scripts/create-agent.cjs

Enter your own ID, name, password, and password confirmation when prompted.
Example ID: agent001. Password must contain 12–128 characters.
Password input is visible in the terminal while typing; do not share it.
There is no built-in password, public sign-up, or fake browser-only login.
The ID is normalized to lowercase. Passwords are case-sensitive.
You can run this script again with a different ID for another demo account.
Account records contain a salt/hash, not the plain password.

4. START BOTH SERVERS
Backend terminal:
cd "D:\Demo agent website\server"
node index.js

Separate frontend terminal:
cd "D:\Demo agent website\client"
npm run dev

The existing server requires express and dotenv. If they are missing, run
npm install express dotenv from the server folder. No new client packages
are needed. Use a current supported Node.js LTS release.

5. OPEN THE PORTAL
http://localhost:5173/#/admin
Or click Agent Login in the public website navigation.
Sign in with the ID/password you just created.
The dashboard shows the server-verified account, site ID, and role.
Try refreshing the page, Check session, Log out, and an incorrect password.
About Me and Contact links currently VIEW those pages; they do not edit them.

HOW THIS LOCAL DEMO STORES LOGIN DATA
- Account hashes persist in server/data/agents.json (created by the script).
- Login sessions live in backend memory and expire after eight hours.
- Refreshing the browser preserves login; restarting the backend signs out
  every session. Logout revokes the current session on the server.
- Session cookies are HttpOnly and SameSite=Strict. Tokens/passwords are
  not placed in localStorage. Backend endpoints enforce login.
- Ten sign-in attempts per IP are allowed per 15-minute window. A successful
  login clears that IP's attempt counter. Restarting the local backend also
  resets the in-memory counters.
- Agents have different account/site IDs, but their public sites are not
  yet separated in this milestone. No content-editing endpoints are included.
- To deactivate a local demo account, stop the backend, set active to false
  on its record, save, and restart. To reset a forgotten demo password, stop
  the backend, remove ONLY that agent's record from agents.json, recreate
  the same ID with the script, and restart. This is temporary developer setup;
  an administrator UI will replace these steps later.

BEFORE GITHUB / ONLINE DEPLOYMENT
Add the patterns in .gitignore-additions.txt to your root .gitignore.
Do not commit .env or server/data/agents.json.
This patch is for localhost, not a production hosting configuration.
Before hosting, move accounts/sessions to a managed database/auth service,
configure HTTPS and your actual APP_ORIGIN, and configure the public backend
and frontend proxy. The backend currently binds to 127.0.0.1 deliberately.
Do not use temporary local JSON files as a Vercel database.

TROUBLESHOOTING
- Invalid credentials: use the ID/password you created, not the API demo keys.
- Cannot reach backend / proxy errors: confirm node index.js is running.
- Request not allowed: APP_ORIGIN must match the browser origin exactly.
- Port 5173 in use: stop the old Vite process before restarting; strictPort
  prevents silently switching to a port that the backend does not allow.
- Account disappears: keep server/data/agents.json when updating code.

FILES CHANGED
client/src/App.jsx
client/src/hooks/usePage.js
client/src/components/Header.jsx
client/src/pages/AgentAdmin.jsx (new)
client/src/services/auth.js (new)
client/src/styles/AgentAdmin.css (new)
client/vite.config.js
server/index.js
server/auth.cjs (new)
server/scripts/create-agent.cjs (new)
server/.env.example (reference)
.gitignore-additions.txt (instructions)

Validation performed: production frontend build and real HTTP authentication
checks for invalid/valid credentials, cookies, session restore, protected
endpoint rejection, logout/revocation, expiration, account deactivation,
origin validation, malformed JSON, and login attempt limiting.
