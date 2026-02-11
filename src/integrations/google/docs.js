// ─── Google Docs Integration ──────────────────────────────────
// Create and manage documents.

import { docs as docsApi } from '@googleapis/docs';
import { drive as driveApi } from '@googleapis/drive';
import { getAuthClient, isAuthenticated } from './auth.js';
import { logger } from '../../utils/logger.js';

function getDocs() {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) return null;
  return docsApi({ version: 'v1', auth });
}

function getDrive() {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) return null;
  return driveApi({ version: 'v3', auth });
}

/**
 * Create a new Google Doc
 */
export async function createDocument(title, folderId = null) {
  const docs = getDocs();
  const drive = getDrive();
  if (!docs || !drive) return { error: 'Docs not authenticated' };

  try {
    const doc = await docs.documents.create({
      requestBody: { title },
    });

    // Move to folder if specified
    if (folderId) {
      await drive.files.update({
        fileId: doc.data.documentId,
        addParents: folderId,
        fields: 'id, parents',
      });
    }

    logger.info('DOCS', `Document created: ${title}`);
    return {
      documentId: doc.data.documentId,
      title: doc.data.title,
      link: `https://docs.google.com/document/d/${doc.data.documentId}/edit`,
    };
  } catch (error) {
    logger.error('DOCS', 'Failed to create document', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Write content to a Google Doc
 */
export async function writeToDocument(documentId, content) {
  const docs = getDocs();
  if (!docs) return { error: 'Docs not authenticated' };

  try {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });

    logger.info('DOCS', `Content written to document: ${documentId}`);
    return { success: true, documentId };
  } catch (error) {
    logger.error('DOCS', 'Failed to write to document', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Read content from a Google Doc
 */
export async function readDocument(documentId) {
  const docs = getDocs();
  if (!docs) return { error: 'Docs not authenticated' };

  try {
    const doc = await docs.documents.get({ documentId });

    // Extract plain text from the document
    let text = '';
    if (doc.data.body?.content) {
      for (const element of doc.data.body.content) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content) {
              text += elem.textRun.content;
            }
          }
        }
      }
    }

    return {
      documentId,
      title: doc.data.title,
      content: text,
      link: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  } catch (error) {
    logger.error('DOCS', 'Failed to read document', { error: error.message });
    return { error: error.message };
  }
}
