#!/usr/bin/env node

/**
 * GHL Survey Custom Fields Setup Script
 *
 * Creates all necessary custom fields in GoHighLevel for the
 * Advanced Disc Assessment Survey. Run once to set up the fields.
 *
 * Usage: node ghl-survey/setup-custom-fields.js
 *
 * Note: The GHL API does not support programmatic survey creation.
 * This script creates the custom contact fields that store survey responses,
 * and generates a standalone HTML survey form that submits data via the API.
 */

const API_BASE = 'https://services.leadconnectorhq.com';
const API_KEY = 'pit-d71f92a0-4b3b-4bbf-8b93-91ec0b9edba1';
const LOCATION_ID = '3dHuFKR0LR9rJQCBD6tx';
const API_VERSION = '2021-07-28';

const FOLDER_NAME = 'Disc Assessment Survey';

const SURVEY_FIELDS = [
  {
    name: 'Disc Survey - Symptom Profile',
    dataType: 'SINGLE_OPTIONS',
    options: [
      'Back pain only',
      'Back pain with leg pain',
      'Leg pain below the knee',
      'Numbness, tingling, or weakness',
      'Pain is constant and worsening',
    ],
  },
  {
    name: 'Disc Survey - Pain Duration',
    dataType: 'SINGLE_OPTIONS',
    options: [
      'Less than 2 weeks',
      '2-6 weeks',
      '6 weeks to 6 months',
      'More than 6 months',
      'Comes and goes but never fully settles',
    ],
  },
  {
    name: 'Disc Survey - Failed Standard Care',
    dataType: 'SINGLE_OPTIONS',
    options: ['Yes', 'No'],
  },
  {
    name: 'Disc Survey - Red Flag Indicators',
    dataType: 'CHECKBOX',
    options: [
      'Pain worse with sitting',
      'Pain with bending or lifting',
      'Coughing or sneezing increases pain',
      'Morning stiffness that takes time to ease',
      'MRI or scan has shown disc bulge or herniation',
      'None of the above',
    ],
  },
  {
    name: 'Disc Survey - Life Impact',
    dataType: 'SINGLE_OPTIONS',
    options: [
      'Mild inconvenience',
      'Stopping exercise or sport',
      'Affecting work or sleep',
      'Constantly on my mind',
      'I am worried about long-term damage',
    ],
  },
  {
    name: 'Disc Survey - Commitment Level',
    dataType: 'SINGLE_OPTIONS',
    options: [
      'Just curious',
      'Open to options',
      'Actively looking for a solution',
    ],
  },
  {
    name: 'Disc Survey - Qualification Score',
    dataType: 'TEXT',
  },
  {
    name: 'Disc Survey - Qualification Tier',
    dataType: 'SINGLE_OPTIONS',
    options: ['Low', 'Medium', 'High'],
  },
  {
    name: 'Disc Survey - Completed At',
    dataType: 'TEXT',
  },
];

async function apiRequest(method, path, body) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      Version: API_VERSION,
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`API ${method} ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function getExistingFields() {
  const data = await apiRequest('GET', `/locations/${LOCATION_ID}/customFields`);
  return data.customFields || [];
}

async function createFolder(name) {
  const data = await apiRequest('POST', `/locations/${LOCATION_ID}/customFields`, {
    name,
    dataType: 'TEXT',
    model: 'contact',
    documentType: 'folder',
  });
  return data.customFieldFolder || data.customField;
}

async function createField(field, parentId) {
  const body = {
    name: field.name,
    dataType: field.dataType,
    model: 'contact',
    parentId,
  };
  if (field.options) {
    body.options = field.options;
  }
  const data = await apiRequest('POST', `/locations/${LOCATION_ID}/customFields`, body);
  return data.customField;
}

async function main() {
  console.log('=== GHL Disc Assessment Survey - Custom Fields Setup ===\n');
  console.log(`Location: ${LOCATION_ID}`);
  console.log(`API Base: ${API_BASE}\n`);

  // Check existing fields
  console.log('Fetching existing custom fields...');
  const existing = await getExistingFields();
  console.log(`Found ${existing.length} existing custom fields.\n`);

  // Check if our folder already exists
  const existingFolder = existing.find(
    (f) => f.name === FOLDER_NAME && f.documentType === 'folder'
  );

  let folderId;
  if (existingFolder) {
    console.log(`Folder "${FOLDER_NAME}" already exists (${existingFolder.id}).`);
    folderId = existingFolder.id;
  } else {
    console.log(`Creating folder "${FOLDER_NAME}"...`);
    const folder = await createFolder(FOLDER_NAME);
    folderId = folder.id;
    console.log(`Created folder: ${folderId}`);
  }

  // Create fields
  const createdFields = {};
  for (const field of SURVEY_FIELDS) {
    const existingField = existing.find(
      (f) => f.name === field.name && f.parentId === folderId
    );
    if (existingField) {
      console.log(`Field "${field.name}" already exists (${existingField.id}), skipping.`);
      createdFields[field.name] = {
        id: existingField.id,
        fieldKey: existingField.fieldKey,
      };
      continue;
    }

    console.log(`Creating field: "${field.name}" (${field.dataType})...`);
    const created = await createField(field, folderId);
    createdFields[field.name] = {
      id: created.id,
      fieldKey: created.fieldKey,
    };
    console.log(`  -> ID: ${created.id}, Key: ${created.fieldKey}`);

    // Rate limit: small delay between requests
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n=== Setup Complete ===\n');
  console.log('Created field mapping:');
  console.log(JSON.stringify(createdFields, null, 2));

  console.log('\nUse these field keys in the survey HTML form');
  console.log('and in GHL workflow automation triggers.\n');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
