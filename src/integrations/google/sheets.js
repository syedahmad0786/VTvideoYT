// ─── Google Sheets Integration ──────────────────────────────────
// Create and manage spreadsheets (trackers, templates).

import { google } from 'googleapis';
import { getAuthClient, isAuthenticated } from './auth.js';
import { logger } from '../../utils/logger.js';

function getSheets() {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) return null;
  return google.sheets({ version: 'v4', auth });
}

function getDrive() {
  const auth = getAuthClient();
  if (!auth || !isAuthenticated()) return null;
  return google.drive({ version: 'v3', auth });
}

/**
 * Create a new spreadsheet
 */
export async function createSpreadsheet(title, sheetNames = ['Sheet1'], folderId = null) {
  const sheets = getSheets();
  const drive = getDrive();
  if (!sheets || !drive) return { error: 'Sheets not authenticated' };

  try {
    const res = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: sheetNames.map(name => ({
          properties: { title: name },
        })),
      },
    });

    // Move to folder if specified
    if (folderId) {
      await drive.files.update({
        fileId: res.data.spreadsheetId,
        addParents: folderId,
        fields: 'id, parents',
      });
    }

    logger.info('SHEETS', `Spreadsheet created: ${title}`);
    return {
      spreadsheetId: res.data.spreadsheetId,
      title,
      link: res.data.spreadsheetUrl,
    };
  } catch (error) {
    logger.error('SHEETS', 'Failed to create spreadsheet', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Write data to a sheet
 */
export async function writeToSheet(spreadsheetId, range, values) {
  const sheets = getSheets();
  if (!sheets) return { error: 'Sheets not authenticated' };

  try {
    const res = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    logger.info('SHEETS', `Data written to sheet: ${spreadsheetId} (${range})`);
    return { updatedCells: res.data.updatedCells };
  } catch (error) {
    logger.error('SHEETS', 'Failed to write to sheet', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Read data from a sheet
 */
export async function readSheet(spreadsheetId, range) {
  const sheets = getSheets();
  if (!sheets) return { error: 'Sheets not authenticated' };

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return { values: res.data.values || [] };
  } catch (error) {
    logger.error('SHEETS', 'Failed to read sheet', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Append rows to a sheet
 */
export async function appendToSheet(spreadsheetId, range, values) {
  const sheets = getSheets();
  if (!sheets) return { error: 'Sheets not authenticated' };

  try {
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    logger.info('SHEETS', `Rows appended to sheet: ${spreadsheetId}`);
    return { updatedRows: res.data.updates?.updatedRows };
  } catch (error) {
    logger.error('SHEETS', 'Failed to append to sheet', { error: error.message });
    return { error: error.message };
  }
}
