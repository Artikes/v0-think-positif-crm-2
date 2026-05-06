import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'auth-url':
        return handleGetAuthUrl(req, res);
      case 'callback':
        return handleCallback(req, res);
      case 'fetch-events':
        return handleFetchEvents(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Google Calendar API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

// Generate OAuth URL for Google Calendar access
function handleGetAuthUrl(req, res) {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: req.query.userId || ''
  });

  return res.status(200).json({ authUrl });
}

// Handle OAuth callback and exchange code for tokens
async function handleCallback(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Return tokens to be stored client-side (in this simplified version)
    // In production, you'd want to store these securely server-side
    return res.status(200).json({ 
      success: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      }
    });
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
}

// Fetch calendar events
async function handleFetchEvents(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessToken, startDate, endDate } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'No access token provided' });
  }

  try {
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const timeMin = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
    const timeMax = endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items?.map(event => ({
      id: event.id,
      title: event.summary || 'Sans titre',
      description: event.description || '',
      start_time: event.start?.dateTime || event.start?.date,
      end_time: event.end?.dateTime || event.end?.date,
      location: event.location || '',
      isAllDay: !event.start?.dateTime,
      source: 'google'
    })) || [];

    return res.status(200).json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    if (error.code === 401) {
      return res.status(401).json({ error: 'Token expired or invalid' });
    }
    return res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
}
