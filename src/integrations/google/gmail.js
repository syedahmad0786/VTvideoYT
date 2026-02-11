// ─── Gmail Integration ──────────────────────────────────────
// Inbox triage, draft creation, email sending (with approval gate).

import { google } from 'googleapis';
import { getAuthClient, isAuthenticated } from './auth.js';
import { logger } from '../../utils/logger.js';

function getGmail() {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) return null;
  return google.gmail({ version: 'v1', auth });
}

/**
 * List recent emails from inbox
 */
export async function listInboxMessages(maxResults = 20, query = 'is:unread') {
  const gmail = getGmail();
  if (!gmail) return { error: 'Gmail not authenticated' };

  try {
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
    });

    if (!res.data.messages) return { messages: [], count: 0 };

    const messages = await Promise.all(
      res.data.messages.map(async (msg) => {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        const headers = full.data.payload.headers;
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: full.data.snippet,
          labelIds: full.data.labelIds,
        };
      })
    );

    return { messages, count: messages.length };
  } catch (error) {
    logger.error('GMAIL', 'Failed to list messages', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Get full email content
 */
export async function getEmailContent(messageId) {
  const gmail = getGmail();
  if (!gmail) return { error: 'Gmail not authenticated' };

  try {
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = res.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    // Extract body
    let body = '';
    if (res.data.payload.body?.data) {
      body = Buffer.from(res.data.payload.body.data, 'base64').toString('utf8');
    } else if (res.data.payload.parts) {
      const textPart = res.data.payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
      }
    }

    return {
      id: messageId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body,
      labelIds: res.data.labelIds,
    };
  } catch (error) {
    logger.error('GMAIL', 'Failed to get email', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Create a draft email (does NOT send — safe for autonomous use)
 */
export async function createDraft(to, subject, body) {
  const gmail = getGmail();
  if (!gmail) return { error: 'Gmail not authenticated' };

  try {
    const raw = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw },
      },
    });

    logger.info('GMAIL', `Draft created: ${subject}`);
    return { draftId: res.data.id, subject };
  } catch (error) {
    logger.error('GMAIL', 'Failed to create draft', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Send an email (REQUIRES APPROVAL — only called after approval gate)
 */
export async function sendEmail(to, subject, body) {
  const gmail = getGmail();
  if (!gmail) return { error: 'Gmail not authenticated' };

  try {
    const raw = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    logger.info('GMAIL', `Email SENT (approved): ${subject} → ${to}`);
    return { messageId: res.data.id, subject, to };
  } catch (error) {
    logger.error('GMAIL', 'Failed to send email', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Add label to email
 */
export async function addLabel(messageId, labelId) {
  const gmail = getGmail();
  if (!gmail) return { error: 'Gmail not authenticated' };

  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
    return { success: true };
  } catch (error) {
    logger.error('GMAIL', 'Failed to add label', { error: error.message });
    return { error: error.message };
  }
}

/**
 * List all labels
 */
export async function listLabels() {
  const gmail = getGmail();
  if (!gmail) return { error: 'Gmail not authenticated' };

  try {
    const res = await gmail.users.labels.list({ userId: 'me' });
    return res.data.labels;
  } catch (error) {
    logger.error('GMAIL', 'Failed to list labels', { error: error.message });
    return { error: error.message };
  }
}
