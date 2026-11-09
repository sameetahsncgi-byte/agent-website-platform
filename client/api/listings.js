export const config = { maxDuration: 30 };

export function makeListingsHandler({ fetcher = fetch, env = process.env } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed.' });
    }
    const username = env.SIMPLYRETS_USERNAME;
    const password = env.SIMPLYRETS_PASSWORD;
    if (!username || !password) return res.status(503).json({ error: 'Add the SimplyRETS demo credentials to Vercel environment variables and redeploy.' });
    try {
      const response = await fetcher('https://api.simplyrets.com/properties', {
        headers: {
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return res.status(502).json({ error: 'The listing provider could not complete the request.' });
      const listings = await response.json();
      if (!Array.isArray(listings)) return res.status(502).json({ error: 'Unexpected listing response.' });
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ source: 'SimplyRETS demo', count: listings.length, listings });
    } catch { return res.status(502).json({ error: 'Unable to retrieve listings. Try again shortly.' }); }
  };
}

export default makeListingsHandler();
