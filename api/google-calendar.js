import { google } from 'googleapis';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Debug: Log which env vars are present (without revealing values)
  console.log('[v0] Google Calendar API called, checking env vars...');
  console.log('[v0] GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
  console.log('[v0] GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
  console.log('[v0] GOOGLE_REDIRECT_URI exists:', !!process.env.GOOGLE_REDIRECT_URI);
  
  // Get environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  // Check if all required env vars are present
  const missingVars = [];
  if (!clientId) missingVars.push('GOOGLE_CLIENT_ID');
  if (!clientSecret) missingVars.push('GOOGLE_CLIENT_SECRET');
  if (!redirectUri) missingVars.push('GOOGLE_REDIRECT_URI');

  if (missingVars.length > 0) {
    console.error('[v0] Missing environment variables:', missingVars);
    return res.status(500).json({ 
      error: 'Google Calendar non configuré',
      details: `Variables manquantes: ${missingVars.join(', ')}`,
      missing: missingVars
    });
  }

  // Create OAuth client
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const { action } = req.query;
  console.log('[v0] Action requested:', action);

  try {
    switch (action) {
      case 'auth-url':
        return handleGetAuthUrl(req, res, oauth2Client);
      case 'callback':
        return handleCallback(req, res, oauth2Client);
      case 'fetch-events':
        return handleFetchEvents(req, res, oauth2Client);
      default:
        return res.status(400).json({ error: 'Action invalide' });
    }
  } catch (error) {
    console.error('[v0] Google Calendar API error:', error);
    return res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
}

// Generate OAuth URL for Google Calendar access
function handleGetAuthUrl(req, res, oauth2Client) {
  try {
    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: req.query.userId || ''
    });

    console.log('[v0] Generated auth URL successfully');
    return res.status(200).json({ authUrl });
  } catch (error) {
    console.error('[v0] Error generating auth URL:', error);
    return res.status(500).json({ error: 'Erreur lors de la génération de l\'URL' });
  }
}

// Handle OAuth callback and exchange code for tokens
async function handleCallback(req, res, oauth2Client) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Code d\'autorisation manquant' });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('[v0] Token exchange successful');
    
    return res.status(200).json({ 
      success: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      }
    });
  } catch (error) {
    console.error('[v0] Error exchanging code for tokens:', error);
    return res.status(500).json({ error: 'Échec de l\'échange du code d\'autorisation' });
  }
}

// Fetch calendar events
async function handleFetchEvents(req, res, oauth2Client) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { accessToken, startDate, endDate } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Token d\'accès manquant' });
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

    console.log('[v0] Fetched', events.length, 'events from Google Calendar');
    return res.status(200).json({ events });
  } catch (error) {
    console.error('[v0] Error fetching calendar events:', error);
    if (error.code === 401) {
      return res.status(401).json({ error: 'Token expiré ou invalide' });
    }
    return res.status(500).json({ error: 'Échec de la récupération des événements' });
  }
}
