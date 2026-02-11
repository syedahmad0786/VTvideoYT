// ─── Google OAuth 2.0 Authentication ──────────────────────────
// Handles OAuth flow for all Google APIs.
// Stores tokens in DB (IntegrationTokens) for Vercel compatibility.

import { google } from 'googleapis';
import { IntegrationTokens } from '../../db/models.js';
import { logger } from '../../utils/logger.js';

// Read-only scopes for Phase 1
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/tasks.readonly',
];

let oAuth2Client = null;
let _authenticated = false;

export function getAuthClient() {
  if (oAuth2Client) return oAuth2Client;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3100'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    logger.warn('GOOGLE_AUTH', 'Google OAuth credentials not configured');
    return null;
  }

  oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Auto-refresh: save new tokens to DB
  oAuth2Client.on('tokens', async (newTokens) => {
    try {
      const existing = await IntegrationTokens.get('google');
      const current = existing ? JSON.parse(existing.token_data) : {};
      const merged = { ...current, ...newTokens };
      await IntegrationTokens.set('google', { ...merged, scopes: SCOPES.join(',') });
      logger.info('GOOGLE_AUTH', 'Tokens refreshed and saved to DB');
    } catch (err) {
      logger.error('GOOGLE_AUTH', 'Failed to save refreshed tokens', { error: err.message });
    }
  });

  return oAuth2Client;
}

export async function loadTokensFromDb() {
  try {
    const record = await IntegrationTokens.get('google');
    if (record) {
      const tokens = JSON.parse(record.token_data);
      const client = getAuthClient();
      if (client && tokens.access_token) {
        client.setCredentials(tokens);
        _authenticated = true;
        logger.info('GOOGLE_AUTH', 'Loaded tokens from DB');
        return true;
      }
    }
  } catch (err) {
    logger.error('GOOGLE_AUTH', 'Failed to load tokens from DB', { error: err.message });
  }
  return false;
}

export function getAuthUrl() {
  const client = getAuthClient();
  if (!client) return null;

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function handleCallback(code) {
  const client = getAuthClient();
  if (!client) throw new Error('OAuth client not configured');

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  _authenticated = true;

  await IntegrationTokens.set('google', { ...tokens, scopes: SCOPES.join(',') });
  logger.info('GOOGLE_AUTH', 'OAuth tokens saved to DB');

  return tokens;
}

export function isAuthenticated() {
  const client = getAuthClient();
  if (_authenticated) return true;
  return client && client.credentials && !!client.credentials.access_token;
}

export function getService(serviceName, version) {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) {
    logger.warn('GOOGLE_AUTH', `Cannot create ${serviceName} service — not authenticated`);
    return null;
  }
  return google[serviceName]({ version, auth });
}
