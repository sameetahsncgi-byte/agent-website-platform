const express = require('express');
const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
});

const { createAuth } = require('./auth.cjs');

const app = express();
const port = Number(process.env.PORT) || 3001;

app.disable('x-powered-by');

// Authentication reads its own bounded JSON body.
// Keep this middleware before any body parsers.
const auth = createAuth({
  origin: process.env.APP_ORIGIN || 'http://localhost:5173',
  secure: process.env.NODE_ENV === 'production',
});

app.use(auth.handle);

// Backend health check.
app.get('/', (req, res) => {
  res.json({
    message: 'Real estate demo backend is running',
    listingsEndpoint: '/api/listings',
  });
});

// Retrieve sample listings from SimplyRETS.
app.get('/api/listings', async (req, res) => {
  const username = process.env.SIMPLYRETS_USERNAME;
  const password = process.env.SIMPLYRETS_PASSWORD;

  if (!username || !password) {
    return res.status(500).json({
      error: 'Missing SimplyRETS credentials in server/.env.',
    });
  }

  try {
    const credentials = Buffer.from(
      `${username}:${password}`
    ).toString('base64');

    const response = await fetch(
      'https://api.simplyrets.com/properties',
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        error: 'The listing provider could not complete the request.',
      });
    }

    const listings = await response.json();

    if (!Array.isArray(listings)) {
      return res.status(502).json({
        error: 'Unexpected listing response.',
      });
    }

    return res.json({
      source: 'SimplyRETS demo',
      count: listings.length,
      listings,
    });
  } catch {
    return res.status(502).json({
      error: 'Unable to retrieve listings. Try again shortly.',
    });
  }
});

// Handle unknown endpoints.
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found.',
  });
});

// Start the backend.
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend running on port ${port}`);
});