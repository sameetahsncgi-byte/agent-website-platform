export async function authRequest(path, body) {
  let response;
  try {
    response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store',
    });
  } catch { throw Error('Cannot reach the backend. Start the server and try again.'); }
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw Error('Check the /api proxy in client/vite.config.js and restart Vite.');
  const data = await response.json();
  if (!response.ok) {
    const error = Error(data.error || 'The request failed.'); error.status = response.status; throw error;
  }
  return data;
}
