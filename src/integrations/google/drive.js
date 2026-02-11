// ─── Google Drive Integration ──────────────────────────────────
// File management with predictable folder structure.

import { google } from 'googleapis';
import { getAuthClient, isAuthenticated } from './auth.js';
import { logger } from '../../utils/logger.js';

function getDrive() {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) return null;
  return google.drive({ version: 'v3', auth });
}

// Malik's folder structure
const FOLDER_STRUCTURE = {
  root: 'Malik Zaid Workspace',
  children: {
    'Drafts': {
      children: { 'Emails': {}, 'Proposals': {}, 'Decks': {}, 'Documents': {} }
    },
    'Research': {
      children: { 'Market': {}, 'Competitors': {}, 'Tools': {}, 'Vendors': {} }
    },
    'Deliverables': {
      children: { 'Active': {}, 'Archive': {} }
    },
    'Systems': {
      children: { 'Templates': {}, 'SOPs': {}, 'Trackers': {}, 'Automations': {} }
    },
    'Talent': {
      children: { 'Creative': {}, 'Operations': {}, 'Shortlists': {} }
    },
    'Meeting Prep': {},
    'Approvals': {
      children: { 'Pending': {}, 'Approved': {}, 'Rejected': {} }
    },
  },
};

/**
 * Find or create a folder by name under a parent
 */
async function findOrCreateFolder(name, parentId = null) {
  const drive = getDrive();
  if (!drive) return null;

  try {
    // Search for existing folder
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) query += ` and '${parentId}' in parents`;

    const res = await drive.files.list({ q: query, fields: 'files(id, name)' });

    if (res.data.files.length > 0) {
      return res.data.files[0];
    }

    // Create folder
    const fileMetadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) fileMetadata.parents = [parentId];

    const created = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name',
    });

    logger.info('DRIVE', `Folder created: ${name}`);
    return created.data;
  } catch (error) {
    logger.error('DRIVE', `Failed to find/create folder: ${name}`, { error: error.message });
    return null;
  }
}

/**
 * Initialize the full folder structure
 */
export async function initializeFolderStructure() {
  const drive = getDrive();
  if (!drive) return { error: 'Drive not authenticated' };

  const created = {};

  async function createTree(structure, parentId = null, path = '') {
    for (const [name, config] of Object.entries(structure)) {
      const fullPath = path ? `${path}/${name}` : name;
      const folder = await findOrCreateFolder(name, parentId);
      if (folder) {
        created[fullPath] = folder.id;
        if (config.children) {
          await createTree(config.children, folder.id, fullPath);
        }
      }
    }
  }

  // Create root
  const root = await findOrCreateFolder(FOLDER_STRUCTURE.root);
  if (root) {
    created[FOLDER_STRUCTURE.root] = root.id;
    await createTree(FOLDER_STRUCTURE.children, root.id, FOLDER_STRUCTURE.root);
  }

  logger.info('DRIVE', `Folder structure initialized: ${Object.keys(created).length} folders`);
  return { folders: created };
}

/**
 * Upload a file to a specific folder
 */
export async function uploadFile(name, content, mimeType, folderId) {
  const drive = getDrive();
  if (!drive) return { error: 'Drive not authenticated' };

  try {
    const res = await drive.files.create({
      requestBody: {
        name,
        parents: folderId ? [folderId] : [],
      },
      media: {
        mimeType,
        body: content,
      },
      fields: 'id, name, webViewLink',
    });

    logger.info('DRIVE', `File uploaded: ${name}`);
    return { fileId: res.data.id, name: res.data.name, link: res.data.webViewLink };
  } catch (error) {
    logger.error('DRIVE', 'Failed to upload file', { error: error.message });
    return { error: error.message };
  }
}

/**
 * List files in a folder
 */
export async function listFiles(folderId, maxResults = 50) {
  const drive = getDrive();
  if (!drive) return { error: 'Drive not authenticated' };

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
      pageSize: maxResults,
      orderBy: 'modifiedTime desc',
    });

    return { files: res.data.files };
  } catch (error) {
    logger.error('DRIVE', 'Failed to list files', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Search files across Malik's workspace
 */
export async function searchFiles(query) {
  const drive = getDrive();
  if (!drive) return { error: 'Drive not authenticated' };

  try {
    const res = await drive.files.list({
      q: `fullText contains '${query}' and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents)',
      pageSize: 20,
      orderBy: 'modifiedTime desc',
    });

    return { files: res.data.files };
  } catch (error) {
    logger.error('DRIVE', 'Failed to search files', { error: error.message });
    return { error: error.message };
  }
}
