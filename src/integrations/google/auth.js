// ─── Google OAuth 2.0 Authentication ──────────────────────────
// Handles OAuth flow for all Google APIs.

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, '..', '..', '..', 'google-tokens.json');

// All scopes Malik needs
const SCOPES = [
  // Gmail
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  // Calendar
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  // Drive
  'https://www.googleapis.com/auth/drive',
  // Docs
  'https://www.googleapis.com/auth/documents',
  // Sheets
  'https://www.googleapis.com/auth/spreadsheets',
  // Tasks
  'https://www.googleapis.com/auth/tasks',
  // Chat
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.spaces',
];

let oAuth2Client = null;

/**
 * Get or create OAuth2 client
 */
export function getAuthClient() {
  if (oAuth2Client) return oAuth2Client;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3100/auth/google/callback';

  if (!clientId || !clientSecret) {
    logger.warn('GOOGLE_AUTH', 'Google OAuth credentials not configured');
    return null;
  }

  oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Load saved tokens if they exist
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oAuth2Client.setCredentials(tokens);
      logger.info('GOOGLE_AUTH', 'Loaded saved tokens');

      // Auto-refresh
      oAuth2Client.on('tokens', (newTokens) => {
        const existing = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        const merged = { ...existing, ...newTokens };
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
        logger.info('GOOGLE_AUTH', 'Tokens refreshed and saved');
      });
    } catch (err) {
      logger.error('GOOGLE_AUTH', 'Failed to load tokens', { error: err.message });
    }
  }

  return oAuth2Client;
}

/**
 * Generate the OAuth consent URL
 */
export function getAuthUrl() {
  const client = getAuthClient();
  if (!client) return null;

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function handleCallback(code) {
  const client = getAuthClient();
  if (!client) throw new Error('OAuth client not configured');

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Save tokens
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  logger.info('GOOGLE_AUTH', 'OAuth tokens saved successfully');

  return tokens;
}

/**
 * Check if authenticated
 */
export function isAuthenticated() {
  const client = getAuthClient();
  return client && client.credentials && client.credentials.access_token;
}

/**
 * Get authenticated Google API service
 */
export function getService(serviceName, version) {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) {
    logger.warn('GOOGLE_AUTH', `Cannot create ${serviceName} service — not authenticated`);
    return null;
  }
  return google.discover(serviceName)
    ? google[serviceName]({ version, auth })
    : null;
}
