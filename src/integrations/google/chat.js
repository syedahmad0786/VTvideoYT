// ─── Google Chat Integration ──────────────────────────────────
// Internal communication channel for Malik + A'Y.

import { chat as chatApi } from '@googleapis/chat';
import { getAuthClient, isAuthenticated } from './auth.js';
import { logger } from '../../utils/logger.js';

function getChat() {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) return null;
  return chatApi({ version: 'v1', auth });
}

/**
 * List spaces (chat rooms) Malik has access to
 */
export async function listSpaces() {
  const chat = getChat();
  if (!chat) return { error: 'Chat not authenticated' };

  try {
    const res = await chat.spaces.list();
    return {
      spaces: res.data.spaces?.map(s => ({
        name: s.name,
        displayName: s.displayName,
        type: s.type,
      })) || [],
    };
  } catch (error) {
    logger.error('CHAT', 'Failed to list spaces', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Send a message to a Google Chat space
 * Note: Phase 1 — internal only, no external messaging
 */
export async function sendMessage(spaceName, text) {
  const chat = getChat();
  if (!chat) return { error: 'Chat not authenticated' };

  try {
    const res = await chat.spaces.messages.create({
      parent: spaceName,
      requestBody: { text },
    });

    logger.info('CHAT', `Message sent to ${spaceName}`);
    return {
      messageName: res.data.name,
      createTime: res.data.createTime,
    };
  } catch (error) {
    logger.error('CHAT', 'Failed to send message', { error: error.message });
    return { error: error.message };
  }
}

/**
 * List messages in a space
 */
export async function listMessages(spaceName, maxResults = 20) {
  const chat = getChat();
  if (!chat) return { error: 'Chat not authenticated' };

  try {
    const res = await chat.spaces.messages.list({
      parent: spaceName,
      pageSize: maxResults,
    });

    return {
      messages: res.data.messages?.map(m => ({
        name: m.name,
        text: m.text,
        sender: m.sender?.displayName,
        createTime: m.createTime,
      })) || [],
    };
  } catch (error) {
    logger.error('CHAT', 'Failed to list messages', { error: error.message });
    return { error: error.message };
  }
}
