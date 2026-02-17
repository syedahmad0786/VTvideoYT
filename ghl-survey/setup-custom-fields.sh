#!/bin/bash

# GHL Disc Assessment Survey — Custom Fields Setup
# Creates all custom fields in GoHighLevel for the survey.
# Usage: bash ghl-survey/setup-custom-fields.sh

API_BASE="https://services.leadconnectorhq.com"
API_KEY="pit-d71f92a0-4b3b-4bbf-8b93-91ec0b9edba1"
LOCATION_ID="3dHuFKR0LR9rJQCBD6tx"
API_VERSION="2021-07-28"

HEADERS=(
  -H "Authorization: Bearer $API_KEY"
  -H "Content-Type: application/json"
  -H "Version: $API_VERSION"
)

echo "=== GHL Disc Assessment Survey — Custom Fields Setup ==="
echo ""

# Step 1: Create folder
echo "Creating folder: Disc Assessment Survey..."
FOLDER_RESP=$(curl -s -X POST "$API_BASE/locations/$LOCATION_ID/customFields" \
  "${HEADERS[@]}" \
  -d '{
    "name": "Disc Assessment Survey",
    "dataType": "TEXT",
    "model": "contact",
    "documentType": "folder"
  }')
echo "Folder response: $FOLDER_RESP"
FOLDER_ID=$(echo "$FOLDER_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
fid = d.get('customFieldFolder',{}).get('id','') or d.get('customField',{}).get('id','')
print(fid)
" 2>/dev/null)

if [ -z "$FOLDER_ID" ]; then
  echo "Could not create folder. Checking if it already exists..."
  EXISTING=$(curl -s "$API_BASE/locations/$LOCATION_ID/customFields" "${HEADERS[@]}")
  FOLDER_ID=$(echo "$EXISTING" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for f in data.get('customFields', []):
    if f.get('name') == 'Disc Assessment Survey' and f.get('documentType') == 'folder':
        print(f['id'])
        break
" 2>/dev/null)
fi

echo "Folder ID: $FOLDER_ID"
echo ""

if [ -z "$FOLDER_ID" ]; then
  echo "ERROR: Could not create or find folder. Exiting."
  exit 1
fi

# Helper function
create_field() {
  local NAME="$1"
  local DATA_TYPE="$2"
  local OPTIONS="$3"

  local BODY="{\"name\":\"$NAME\",\"dataType\":\"$DATA_TYPE\",\"model\":\"contact\",\"parentId\":\"$FOLDER_ID\""
  if [ -n "$OPTIONS" ]; then
    BODY="$BODY,\"options\":$OPTIONS"
  fi
  BODY="$BODY}"

  echo "Creating: $NAME ($DATA_TYPE)..."
  RESP=$(curl -s -X POST "$API_BASE/locations/$LOCATION_ID/customFields" \
    "${HEADERS[@]}" \
    -d "$BODY")
  FIELD_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('customField',{}).get('id','ERROR'))" 2>/dev/null)
  FIELD_KEY=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('customField',{}).get('fieldKey','ERROR'))" 2>/dev/null)
  echo "  -> ID: $FIELD_ID | Key: $FIELD_KEY"
  sleep 0.3
}

# Step 2: Create all fields
echo "Creating survey custom fields..."
echo ""

create_field "Disc Survey - Symptom Profile" "SINGLE_OPTIONS" \
  '["Back pain only","Back pain with leg pain","Leg pain below the knee","Numbness, tingling, or weakness","Pain is constant and worsening"]'

create_field "Disc Survey - Pain Duration" "SINGLE_OPTIONS" \
  '["Less than 2 weeks","2-6 weeks","6 weeks to 6 months","More than 6 months","Comes and goes but never fully settles"]'

create_field "Disc Survey - Failed Standard Care" "SINGLE_OPTIONS" \
  '["Yes","No"]'

create_field "Disc Survey - Red Flag Indicators" "CHECKBOX" \
  '["Pain worse with sitting","Pain with bending or lifting","Coughing or sneezing increases pain","Morning stiffness that takes time to ease","MRI or scan has shown disc bulge or herniation","None of the above"]'

create_field "Disc Survey - Life Impact" "SINGLE_OPTIONS" \
  '["Mild inconvenience","Stopping exercise or sport","Affecting work or sleep","Constantly on my mind","I am worried about long-term damage"]'

create_field "Disc Survey - Commitment Level" "SINGLE_OPTIONS" \
  '["Just curious","Open to options","Actively looking for a solution"]'

create_field "Disc Survey - Qualification Score" "TEXT" ""

create_field "Disc Survey - Qualification Tier" "SINGLE_OPTIONS" \
  '["Low","Medium","High"]'

create_field "Disc Survey - Completed At" "TEXT" ""

echo ""
echo "=== Setup Complete ==="
echo ""
echo "IMPORTANT: Update the CONFIG.fields object in disc-assessment-survey.html"
echo "with the field keys printed above."
