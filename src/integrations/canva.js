// ─── Canva Integration ──────────────────────────────────────
// Design work for decks and presentations.
// Note: Canva Connect API is limited; this provides base integration.

import { logger } from '../utils/logger.js';

const BASE_URL = 'https://api.canva.com/rest/v1';

function getHeaders() {
  const apiKey = process.env.CANVA_API_KEY;
  if (!apiKey) return null;
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function canvaRequest(endpoint, method = 'GET', body = null) {
  const headers = getHeaders();
  if (!headers) return { error: 'Canva not configured — set CANVA_API_KEY' };

  try {
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await res.json();
    return data;
  } catch (error) {
    logger.error('CANVA', 'Request failed', { error: error.message });
    return { error: error.message };
  }
}

/**
 * List user's designs
 */
export async function listDesigns(query = '') {
  const params = query ? `?query=${encodeURIComponent(query)}` : '';
  return canvaRequest(`/designs${params}`);
}

/**
 * Get design details
 */
export async function getDesign(designId) {
  return canvaRequest(`/designs/${designId}`);
}

/**
 * Create a design from a template
 */
export async function createDesignFromTemplate(templateId, title) {
  return canvaRequest('/designs', 'POST', {
    design_type: 'presentation',
    title,
    template_id: templateId,
  });
}

/**
 * Export a design
 */
export async function exportDesign(designId, format = 'pdf') {
  return canvaRequest(`/designs/${designId}/exports`, 'POST', {
    format,
  });
}
