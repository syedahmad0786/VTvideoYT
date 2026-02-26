/**
 * hrmny Sales Dashboard V2 — Google Apps Script Webhook
 *
 * Two data tabs (Companies, Outreach) with gated approval workflow.
 * Handles POST requests from Claude commands and GET requests for /dashboard.
 *
 * Setup: Deploy as web app (Execute as: Me, Access: Anyone)
 */

// --- Configuration ---

var SPREADSHEET_ID = '1wKQvEHPHuHemKRJu7oQBfz6jCmHm40AlDmX7xSHB1u8';

var LOGO_URL = 'https://drive.google.com/uc?export=view&id=1M3E1-ML3CnamXrLtvAiHas736UHQMB__';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

var SHEET_NAMES = {
  companies: 'Companies',
  outreach: 'Outreach',
  dashboard: 'Dashboard',
  log: 'Log'
};

var COMPANIES_HEADERS = [
  'Company', 'Sector', 'ICP Fit', 'Why This Company', 'Services Match',
  'Est. Value (AED)', 'Outreach Angle', 'Evidence/Sources', 'Lead Source',
  'Stage', 'Feedback', 'Asana Task ID', 'Date Added', 'Date Updated'
];

var OUTREACH_HEADERS = [
  'Company', 'Contact Name', 'Title', 'Email', 'Email Status', 'LinkedIn URL',
  'Seniority', 'Why This Contact', 'Contact Stage', 'Feedback',
  'Email Subject', 'Email Body', 'Email Stage', 'Email Date Sent',
  'Email Response Date', 'Email Response Summary',
  'LI Connection Message', 'LI Connection Stage',
  'LI Follow-up Message', 'LI Follow-up Stage',
  'Follow-up Due', 'Date Added'
];

var LOG_HEADERS = ['Timestamp', 'Action', 'Details'];

// --- Brand Colors ---

var COLORS = {
  headerBg:       '#1a1a2e',
  headerText:     '#ffffff',
  accentPrimary:  '#e94560',
  accentSecondary:'#0f3460',
  cardBg:         '#16213e',
  statusResearched:     '#ffeaa7',
  statusApproved:       '#fdcb6e',
  statusContactsFound:  '#81ecec',
  statusOutreachReady:  '#a29bfe',
  statusSent:           '#74b9ff',
  statusReplied:        '#55efc4',
  statusConnected:      '#00b894',
  statusRejected:       '#fab1a0',
  statusRework:         '#ff7675',
  statusReworked:       '#c7ecee',
  fitHot:   '#ff7675',
  fitWarm:  '#fdcb6e',
  fitCool:  '#74b9ff',
  emailVerified:   '#55efc4',
  emailUnverified: '#ffeaa7',
  emailUnavailable:'#fab1a0',
  contactFound:    '#81ecec',
  contactApproved: '#fdcb6e',
  drafted:         '#ffeaa7',
  approved:        '#fdcb6e',
  draftCreated:    '#74b9ff',
  sent:            '#74b9ff',
  replied:         '#55efc4',
  noResponse:      '#fab1a0',
  bounced:         '#d63031',
  accepted:        '#55efc4',
  rowEven:   '#f8f9fa',
  rowOdd:    '#ffffff',
  border:    '#dee2e6',
  textDark:  '#2d3436',
  textMuted: '#636e72',
  dashBg:        '#f0f3f8',
  dashCardBg:    '#ffffff',
  dashCardBorder:'#e2e8f0',
  dashSectionBg: '#1a1a2e',
  dashSectionText:'#ffffff',
  dashMetricBg:  '#f7f9fc',
  dashAccent:    '#e94560',
  dashGreen:     '#00b894',
  dashAmber:     '#fdcb6e',
  dashRed:       '#e94560'
};

// --- Newsletter Recipients ---

function getNewsletterRecipients() {
  var props = PropertiesService.getScriptProperties();
  var recipientsStr = props.getProperty('newsletter_recipients');
  if (recipientsStr) {
    return recipientsStr.split(',').map(function(e) { return e.trim(); }).filter(function(e) { return e; });
  }
  return [Session.getEffectiveUser().getEmail()];
}

function setNewsletterRecipients(emails) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('newsletter_recipients', emails.join(','));
  logAction('config', 'Newsletter recipients set: ' + emails.join(', '));
  return { success: true, recipients: emails };
}

// --- Install / Setup ---

function onInstall() {
  setupSheet();
}

function setupSheet() {
  var ss = getSpreadsheet();

  setupCompaniesTab(ss);
  setupOutreachTab(ss);
  setupLogTab(ss);
  createDashboardTab(ss);

  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    var data = defaultSheet.getDataRange().getValues();
    if (data.length <= 1 && data[0].join('') === '') {
      ss.deleteSheet(defaultSheet);
    }
  }

  var dashSheet = ss.getSheetByName(SHEET_NAMES.dashboard);
  if (dashSheet) ss.setActiveSheet(dashSheet);
  if (dashSheet) ss.moveActiveSheet(1);
}

// --- Tab Setup Functions ---

function setupCompaniesTab(ss) {
  var sheet = getOrCreateSheet(ss, SHEET_NAMES.companies);
  setHeaders(sheet, COMPANIES_HEADERS);
  setColumnWidths(sheet, [200, 140, 90, 300, 180, 120, 250, 250, 130, 130, 250, 120, 100, 100]);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  setDropdown(sheet, 'C2:C', ['Hot', 'Warm', 'Cool']);
  setDropdown(sheet, 'I2:I', ['Cold Outbound', 'Intent Signal', 'Inbound', 'Contact', 'Referral']);
  setDropdown(sheet, 'J2:J', ['Researched', 'Reworked', 'Approved', 'Contacts Found', 'Outreach Ready', 'Sent', 'Replied', 'Connected', 'Rejected', 'Rework']);

  addConditionalFormat(sheet, 'C2:C', 'Hot', COLORS.fitHot, COLORS.textDark);
  addConditionalFormat(sheet, 'C2:C', 'Warm', COLORS.fitWarm, COLORS.textDark);
  addConditionalFormat(sheet, 'C2:C', 'Cool', COLORS.fitCool, COLORS.textDark);

  addConditionalFormat(sheet, 'J2:J', 'Researched', COLORS.statusResearched, COLORS.textDark);
  addConditionalFormat(sheet, 'J2:J', 'Approved', COLORS.statusApproved, COLORS.textDark);
  addConditionalFormat(sheet, 'J2:J', 'Contacts Found', COLORS.statusContactsFound, COLORS.textDark);
  addConditionalFormat(sheet, 'J2:J', 'Outreach Ready', COLORS.statusOutreachReady, '#ffffff');
  addConditionalFormat(sheet, 'J2:J', 'Sent', COLORS.statusSent, COLORS.textDark);
  addConditionalFormat(sheet, 'J2:J', 'Replied', COLORS.statusReplied, COLORS.textDark);
  addConditionalFormat(sheet, 'J2:J', 'Connected', COLORS.statusConnected, '#ffffff');
  addConditionalFormat(sheet, 'J2:J', 'Rejected', COLORS.statusRejected, COLORS.textDark);
  addConditionalFormat(sheet, 'J2:J', 'Rework', COLORS.statusRework, '#ffffff');
  addConditionalFormat(sheet, 'J2:J', 'Reworked', COLORS.statusReworked, COLORS.textDark);

  sheet.getRange('F2:F').setNumberFormat('#,##0');
  applyBanding(sheet, COMPANIES_HEADERS.length);
}

function setupOutreachTab(ss) {
  var sheet = getOrCreateSheet(ss, SHEET_NAMES.outreach);
  setHeaders(sheet, OUTREACH_HEADERS);
  setColumnWidths(sheet, [180, 160, 180, 220, 100, 240, 100, 250, 130, 250, 250, 400, 120, 100, 100, 250, 350, 120, 350, 120, 100, 100]);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  sheet.getRange('L2:L').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sheet.getRange('Q2:Q').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sheet.getRange('S2:S').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  setDropdown(sheet, 'E2:E', ['Verified', 'Unverified', 'Unavailable']);
  setDropdown(sheet, 'G2:G', ['C-Suite', 'VP', 'Director', 'Head', 'Manager']);
  setDropdown(sheet, 'I2:I', ['Contact Found', 'Reworked', 'Contact Approved', 'Rejected', 'Rework']);
  setDropdown(sheet, 'M2:M', ['Drafted', 'Rework', 'Reworked', 'Approved', 'Draft Created', 'Sent', 'Replied', 'No Response', 'Bounced']);
  setDropdown(sheet, 'R2:R', ['Drafted', 'Rework', 'Reworked', 'Approved', 'Sent', 'Accepted', 'No Response']);
  setDropdown(sheet, 'T2:T', ['Drafted', 'Rework', 'Reworked', 'Approved', 'Sent', 'Replied', 'No Response']);

  // Conditional formatting — Email Status
  addConditionalFormat(sheet, 'E2:E', 'Verified', COLORS.emailVerified, COLORS.textDark);
  addConditionalFormat(sheet, 'E2:E', 'Unverified', COLORS.emailUnverified, COLORS.textDark);
  addConditionalFormat(sheet, 'E2:E', 'Unavailable', COLORS.emailUnavailable, COLORS.textDark);

  // Conditional formatting — Contact Stage
  addConditionalFormat(sheet, 'I2:I', 'Contact Found', COLORS.contactFound, COLORS.textDark);
  addConditionalFormat(sheet, 'I2:I', 'Contact Approved', COLORS.contactApproved, COLORS.textDark);
  addConditionalFormat(sheet, 'I2:I', 'Rejected', COLORS.statusRejected, COLORS.textDark);
  addConditionalFormat(sheet, 'I2:I', 'Rework', COLORS.statusRework, '#ffffff');
  addConditionalFormat(sheet, 'I2:I', 'Reworked', COLORS.statusReworked, COLORS.textDark);

  // Conditional formatting — Email Stage
  addConditionalFormat(sheet, 'M2:M', 'Drafted', COLORS.drafted, COLORS.textDark);
  addConditionalFormat(sheet, 'M2:M', 'Rework', COLORS.statusRework, '#ffffff');
  addConditionalFormat(sheet, 'M2:M', 'Reworked', COLORS.statusReworked, COLORS.textDark);
  addConditionalFormat(sheet, 'M2:M', 'Approved', COLORS.approved, COLORS.textDark);
  addConditionalFormat(sheet, 'M2:M', 'Draft Created', COLORS.draftCreated, COLORS.textDark);
  addConditionalFormat(sheet, 'M2:M', 'Sent', COLORS.sent, COLORS.textDark);
  addConditionalFormat(sheet, 'M2:M', 'Replied', COLORS.replied, COLORS.textDark);
  addConditionalFormat(sheet, 'M2:M', 'No Response', COLORS.noResponse, COLORS.textDark);
  addConditionalFormat(sheet, 'M2:M', 'Bounced', COLORS.bounced, '#ffffff');

  // Conditional formatting — LI Connection Stage
  addConditionalFormat(sheet, 'R2:R', 'Drafted', COLORS.drafted, COLORS.textDark);
  addConditionalFormat(sheet, 'R2:R', 'Rework', COLORS.statusRework, '#ffffff');
  addConditionalFormat(sheet, 'R2:R', 'Reworked', COLORS.statusReworked, COLORS.textDark);
  addConditionalFormat(sheet, 'R2:R', 'Approved', COLORS.approved, COLORS.textDark);
  addConditionalFormat(sheet, 'R2:R', 'Sent', COLORS.sent, COLORS.textDark);
  addConditionalFormat(sheet, 'R2:R', 'Accepted', COLORS.accepted, COLORS.textDark);
  addConditionalFormat(sheet, 'R2:R', 'No Response', COLORS.noResponse, COLORS.textDark);

  // Conditional formatting — LI Follow-up Stage
  addConditionalFormat(sheet, 'T2:T', 'Drafted', COLORS.drafted, COLORS.textDark);
  addConditionalFormat(sheet, 'T2:T', 'Rework', COLORS.statusRework, '#ffffff');
  addConditionalFormat(sheet, 'T2:T', 'Reworked', COLORS.statusReworked, COLORS.textDark);
  addConditionalFormat(sheet, 'T2:T', 'Approved', COLORS.approved, COLORS.textDark);
  addConditionalFormat(sheet, 'T2:T', 'Sent', COLORS.sent, COLORS.textDark);
  addConditionalFormat(sheet, 'T2:T', 'Replied', COLORS.replied, COLORS.textDark);
  addConditionalFormat(sheet, 'T2:T', 'No Response', COLORS.noResponse, COLORS.textDark);

  applyBanding(sheet, OUTREACH_HEADERS.length);
}

function setupLogTab(ss) {
  var sheet = getOrCreateSheet(ss, SHEET_NAMES.log);
  setHeaders(sheet, LOG_HEADERS);
  setColumnWidths(sheet, [180, 140, 500]);
  sheet.setFrozenRows(1);
  sheet.getRange('A:C').setFontSize(9).setFontColor(COLORS.textMuted);
  sheet.getRange('1:1').setFontSize(10).setFontColor(COLORS.headerText);
}

function createDashboardTab(ss) {
  var sheet = ss.getSheetByName(SHEET_NAMES.dashboard);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.dashboard);
  }
  sheet.clear();
  sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
  sheet.clearConditionalFormatRules();

  sheet.setColumnWidth(1, 30);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 30);
  sheet.setColumnWidth(5, 200);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 30);
  sheet.setColumnWidth(8, 200);

  sheet.getRange('A1:H50').setBackground(COLORS.dashBg);

  // === ROW 1-2: Title bar ===
  sheet.setRowHeight(1, 8);
  sheet.setRowHeight(2, 50);
  sheet.getRange('A2:H2').setBackground(COLORS.headerBg);
  sheet.getRange('B2').setValue('hrmny Sales Dashboard').setFontSize(20).setFontWeight('bold').setFontColor('#ffffff').setVerticalAlignment('middle');

  // === ROW 3: Spacer ===
  sheet.setRowHeight(3, 15);

  // === ROW 4-7: Top KPI cards ===
  sheet.setRowHeight(4, 30);
  sheet.getRange('B4').setValue('TOTAL COMPANIES').setFontSize(9).setFontWeight('bold').setFontColor(COLORS.textMuted);
  sheet.getRange('B5').setFormula('=COUNTA(Companies!A:A)-1').setFontSize(28).setFontWeight('bold').setFontColor(COLORS.headerBg);
  sheet.getRange('B4:C5').setBackground(COLORS.dashCardBg);
  addCardBorder(sheet, 'B4:C5');

  sheet.getRange('E4').setValue('PIPELINE VALUE').setFontSize(9).setFontWeight('bold').setFontColor(COLORS.textMuted);
  sheet.getRange('E5').setFormula('="AED " & TEXT(SUMPRODUCT((Companies!F2:F<>"")*1,Companies!F2:F),"#,##0")').setFontSize(22).setFontWeight('bold').setFontColor(COLORS.headerBg);
  sheet.getRange('E4:F5').setBackground(COLORS.dashCardBg);
  addCardBorder(sheet, 'E4:F5');

  sheet.setRowHeight(5, 45);
  sheet.setRowHeight(6, 8);

  sheet.getRange('B6').setValue('CONTACTS').setFontSize(9).setFontWeight('bold').setFontColor(COLORS.textMuted);
  sheet.getRange('B7').setFormula('=COUNTA(Outreach!A:A)-1').setFontSize(28).setFontWeight('bold').setFontColor(COLORS.accentSecondary);
  sheet.getRange('B6:C7').setBackground(COLORS.dashCardBg);
  addCardBorder(sheet, 'B6:C7');

  sheet.getRange('E6').setValue('EMAIL RESPONSE RATE').setFontSize(9).setFontWeight('bold').setFontColor(COLORS.textMuted);
  sheet.getRange('E7').setFormula('=IFERROR(TEXT(COUNTIF(Outreach!M:M,"Replied")/(COUNTIF(Outreach!M:M,"Sent")+COUNTIF(Outreach!M:M,"Replied")+COUNTIF(Outreach!M:M,"No Response")),"0%"),"--")').setFontSize(28).setFontWeight('bold').setFontColor(COLORS.dashGreen);
  sheet.getRange('E6:F7').setBackground(COLORS.dashCardBg);
  addCardBorder(sheet, 'E6:F7');

  sheet.setRowHeight(7, 45);
  sheet.setRowHeight(8, 20);

  // === ROW 9-16: Companies by Stage + ICP Fit ===
  sheet.getRange('B9').setValue('COMPANIES BY STAGE').setFontSize(10).setFontWeight('bold').setFontColor(COLORS.headerBg);
  sheet.getRange('E9').setValue('COMPANIES BY ICP FIT').setFontSize(10).setFontWeight('bold').setFontColor(COLORS.headerBg);
  sheet.getRange('B9:C9').setBackground(COLORS.dashCardBg).setBorder(false, false, true, false, false, false, COLORS.accentPrimary, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange('E9:F9').setBackground(COLORS.dashCardBg).setBorder(false, false, true, false, false, false, COLORS.accentPrimary, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  var stageRows = [
    ['Researched',     '=COUNTIF(Companies!J:J,"Researched")',     'Hot',  '=COUNTIF(Companies!C:C,"Hot")'],
    ['Approved',       '=COUNTIF(Companies!J:J,"Approved")',       'Warm', '=COUNTIF(Companies!C:C,"Warm")'],
    ['Contacts Found', '=COUNTIF(Companies!J:J,"Contacts Found")', 'Cool', '=COUNTIF(Companies!C:C,"Cool")'],
    ['Outreach Ready', '=COUNTIF(Companies!J:J,"Outreach Ready")', '',     ''],
    ['Sent',           '=COUNTIF(Companies!J:J,"Sent")',           '',     ''],
    ['Replied',        '=COUNTIF(Companies!J:J,"Replied")',        '',     ''],
    ['Connected',      '=COUNTIF(Companies!J:J,"Connected")',      '',     '']
  ];

  var stageColors = [COLORS.statusResearched, COLORS.statusApproved, COLORS.statusContactsFound, COLORS.statusOutreachReady, COLORS.statusSent, COLORS.statusReplied, COLORS.statusConnected];
  var fitColors = [COLORS.fitHot, COLORS.fitWarm, COLORS.fitCool];

  for (var i = 0; i < stageRows.length; i++) {
    var r = 10 + i;
    sheet.getRange('B' + r).setValue(stageRows[i][0]).setFontSize(10).setFontColor(COLORS.textDark);
    sheet.getRange('C' + r).setFormula(stageRows[i][1]).setFontSize(12).setFontWeight('bold').setFontColor(COLORS.textDark).setHorizontalAlignment('right');
    sheet.getRange('B' + r + ':C' + r).setBackground(COLORS.dashCardBg);
    sheet.getRange('A' + r).setBackground(stageColors[i]);

    if (stageRows[i][2] !== '') {
      sheet.getRange('E' + r).setValue(stageRows[i][2]).setFontSize(10).setFontColor(COLORS.textDark);
      sheet.getRange('F' + r).setFormula(stageRows[i][3]).setFontSize(12).setFontWeight('bold').setFontColor(COLORS.textDark).setHorizontalAlignment('right');
      sheet.getRange('E' + r + ':F' + r).setBackground(COLORS.dashCardBg);
      sheet.getRange('D' + r).setBackground(fitColors[i]);
    }
  }

  sheet.setRowHeight(17, 20);

  // === ROW 18-23: Email Performance + LinkedIn Performance ===
  sheet.getRange('B18').setValue('EMAIL PERFORMANCE').setFontSize(10).setFontWeight('bold').setFontColor(COLORS.headerBg);
  sheet.getRange('E18').setValue('LINKEDIN PERFORMANCE').setFontSize(10).setFontWeight('bold').setFontColor(COLORS.headerBg);
  sheet.getRange('B18:C18').setBackground(COLORS.dashCardBg).setBorder(false, false, true, false, false, false, COLORS.accentPrimary, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheet.getRange('E18:F18').setBackground(COLORS.dashCardBg).setBorder(false, false, true, false, false, false, COLORS.accentPrimary, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  var perfRows = [
    ['Drafted',           '=COUNTIF(Outreach!M:M,"Drafted")',                                          'Requests Drafted', '=COUNTIF(Outreach!R:R,"Drafted")'],
    ['Approved/Created',  '=COUNTIF(Outreach!M:M,"Approved")+COUNTIF(Outreach!M:M,"Draft Created")',   'Requests Sent',    '=COUNTIF(Outreach!R:R,"Sent")'],
    ['Sent',              '=COUNTIF(Outreach!M:M,"Sent")',                                             'Accepted',         '=COUNTIF(Outreach!R:R,"Accepted")'],
    ['Replied',           '=COUNTIF(Outreach!M:M,"Replied")',                                          'Follow-ups Sent',  '=COUNTIF(Outreach!T:T,"Sent")'],
    ['No Response',       '=COUNTIF(Outreach!M:M,"No Response")',                                      'Follow-ups Replied','=COUNTIF(Outreach!T:T,"Replied")']
  ];

  for (var i = 0; i < perfRows.length; i++) {
    var r = 19 + i;
    sheet.getRange('B' + r).setValue(perfRows[i][0]).setFontSize(10).setFontColor(COLORS.textDark);
    sheet.getRange('C' + r).setFormula(perfRows[i][1]).setFontSize(12).setFontWeight('bold').setFontColor(COLORS.textDark).setHorizontalAlignment('right');
    sheet.getRange('B' + r + ':C' + r).setBackground(COLORS.dashCardBg);
    sheet.getRange('E' + r).setValue(perfRows[i][2]).setFontSize(10).setFontColor(COLORS.textDark);
    sheet.getRange('F' + r).setFormula(perfRows[i][3]).setFontSize(12).setFontWeight('bold').setFontColor(COLORS.textDark).setHorizontalAlignment('right');
    sheet.getRange('E' + r + ':F' + r).setBackground(COLORS.dashCardBg);
  }

  sheet.setRowHeight(24, 20);

  // === ROW 25-30: Needs Action ===
  sheet.getRange('B25').setValue('NEEDS ACTION').setFontSize(10).setFontWeight('bold').setFontColor('#ffffff');
  sheet.getRange('B25:F25').setBackground(COLORS.dashRed);

  var actionRows = [
    ['Companies awaiting review',    '=COUNTIF(Companies!J:J,"Researched")+COUNTIF(Companies!J:J,"Reworked")'],
    ['Contacts awaiting review',     '=COUNTIF(Outreach!I:I,"Contact Found")+COUNTIF(Outreach!I:I,"Reworked")'],
    ['Outreach awaiting approval',   '=COUNTIF(Outreach!M:M,"Drafted")+COUNTIF(Outreach!R:R,"Drafted")+COUNTIF(Outreach!T:T,"Drafted")+COUNTIF(Outreach!M:M,"Reworked")+COUNTIF(Outreach!R:R,"Reworked")+COUNTIF(Outreach!T:T,"Reworked")'],
    ['Rework items',                 '=COUNTIF(Companies!J:J,"Rework")+COUNTIF(Outreach!I:I,"Rework")+COUNTIF(Outreach!M:M,"Rework")+COUNTIF(Outreach!R:R,"Rework")+COUNTIF(Outreach!T:T,"Rework")'],
    ['Follow-ups overdue',           '=COUNTIFS(Outreach!U:U,"<"&TODAY(),Outreach!U:U,"<>",Outreach!M:M,"Sent")']
  ];

  for (var i = 0; i < actionRows.length; i++) {
    var r = 26 + i;
    sheet.getRange('B' + r).setValue(actionRows[i][0]).setFontSize(10).setFontColor(COLORS.textDark);
    sheet.getRange('C' + r).setFormula(actionRows[i][1]).setFontSize(12).setFontWeight('bold').setFontColor(COLORS.dashRed).setHorizontalAlignment('right');
    sheet.getRange('B' + r + ':F' + r).setBackground(COLORS.dashCardBg);
  }

  sheet.setRowHeight(31, 15);
  sheet.getRange('B32').setValue('Auto-updated by Claude commands via webhook').setFontSize(8).setFontColor(COLORS.textMuted).setFontStyle('italic');
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(0);
}

// --- Formatting Helpers ---

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function setHeaders(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold').setFontSize(10).setFontColor(COLORS.headerText).setBackground(COLORS.headerBg).setVerticalAlignment('middle').setHorizontalAlignment('left');
  sheet.setRowHeight(1, 36);
}

function setColumnWidths(sheet, widths) {
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }
}

function setDropdown(sheet, range, values) {
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
  sheet.getRange(range).setDataValidation(rule);
}

function addConditionalFormat(sheet, range, value, bgColor, textColor) {
  var rules = sheet.getConditionalFormatRules();
  var rule = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(value).setBackground(bgColor).setFontColor(textColor).setBold(true).setRanges([sheet.getRange(range)]).build();
  rules.push(rule);
  sheet.setConditionalFormatRules(rules);
}

function applyBanding(sheet, numCols) {
  var bandings = sheet.getBandings();
  for (var i = 0; i < bandings.length; i++) {
    bandings[i].remove();
  }
  var lastRow = Math.max(sheet.getMaxRows(), 100);
  var range = sheet.getRange(2, 1, lastRow - 1, numCols);
  range.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY).setFirstRowColor(COLORS.rowOdd).setSecondRowColor(COLORS.rowEven).setHeaderRowColor(null);
  sheet.getRange(1, 1, lastRow, numCols).setBorder(true, true, true, true, true, true, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
}

function addCardBorder(sheet, range) {
  sheet.getRange(range).setBorder(true, true, true, true, false, false, COLORS.dashCardBorder, SpreadsheetApp.BorderStyle.SOLID);
}

// --- POST Handler ---

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data;
    var result;

    switch (action) {
      case 'add_company':
        result = addCompany(data);
        break;
      case 'update_company':
        result = updateCompany(data);
        break;
      case 'add_contact':
        result = addContact(data);
        break;
      case 'update_contact':
        result = updateContact(data);
        break;
      case 'update_outreach':
        result = updateOutreach(data);
        break;
      case 'update_stage':
        result = updateStage(data);
        break;
      case 'send_daily_summary':
        result = sendDailySummary(data);
        break;
      case 'set_newsletter_recipients':
        result = setNewsletterRecipients(data.emails || []);
        break;
      case 'setup':
        setupSheet();
        result = { success: true, message: 'Sheet setup complete' };
        break;
      case 'migrate_v2':
        result = migrateToV2();
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    logAction(action, JSON.stringify(data).substring(0, 500));

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    logAction('error', err.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- GET Handler ---

function doGet(e) {
  try {
    var tab = (e.parameter.tab || 'summary').toLowerCase();
    var result;

    switch (tab) {
      case 'companies':
        result = getSheetData(SHEET_NAMES.companies);
        break;
      case 'outreach':
        result = getSheetData(SHEET_NAMES.outreach);
        break;
      case 'summary':
        result = getSummary();
        break;
      case 'list_tabs':
        var sheets = getSpreadsheet().getSheets();
        var tabNames = [];
        for (var i = 0; i < sheets.length; i++) {
          tabNames.push({ name: sheets[i].getName(), rows: sheets[i].getLastRow(), cols: sheets[i].getLastColumn() });
        }
        result = { tabs: tabNames };
        break;
      default:
        // Try to read any tab by exact name (case-insensitive match)
        var ss = getSpreadsheet();
        var allSheets = ss.getSheets();
        var matchedSheet = null;
        for (var i = 0; i < allSheets.length; i++) {
          if (allSheets[i].getName().toLowerCase() === tab) {
            matchedSheet = allSheets[i];
            break;
          }
        }
        if (matchedSheet) {
          result = getSheetData(matchedSheet.getName());
        } else {
          result = { error: 'Unknown tab: ' + tab };
        }
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Data Operations ---

function addCompany(data) {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.companies);
  var now = new Date().toISOString().split('T')[0];

  var companies = sheet.getRange('A:A').getValues().flat();
  var existingRow = companies.findIndex(function(c) {
    return c.toString().toLowerCase() === (data.company || '').toLowerCase();
  });

  if (existingRow > 0) {
    return { success: false, error: 'Company already exists', row: existingRow + 1 };
  }

  var row = [
    data.company || '',
    data.sector || '',
    data.icp_fit || '',
    data.why_this_company || '',
    data.services || '',
    data.est_value || '',
    data.outreach_angle || '',
    data.evidence || '',
    data.lead_source || '',
    data.stage || 'Researched',
    data.feedback || '',
    data.asana_task_id || '',
    now,
    now
  ];

  sheet.appendRow(row);
  return { success: true, action: 'added', company: data.company, row: sheet.getLastRow() };
}

function updateCompany(data) {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.companies);
  var companies = sheet.getRange('A:A').getValues().flat();
  var now = new Date().toISOString().split('T')[0];

  var rowIndex = companies.findIndex(function(c) {
    return c.toString().toLowerCase() === (data.company || '').toLowerCase();
  });

  if (rowIndex <= 0) {
    return { success: false, error: 'Company not found: ' + data.company };
  }

  var row = rowIndex + 1;
  var fieldMap = {
    sector: 2, icp_fit: 3, why_this_company: 4, services: 5, est_value: 6,
    outreach_angle: 7, evidence: 8, lead_source: 9, stage: 10,
    feedback: 11, asana_task_id: 12
  };

  for (var field in fieldMap) {
    if (data[field] !== undefined && data[field] !== null) {
      sheet.getRange(row, fieldMap[field]).setValue(data[field]);
    }
  }

  sheet.getRange(row, 14).setValue(now);
  return { success: true, action: 'updated', company: data.company, row: row };
}

function addContact(data) {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.outreach);
  var now = new Date().toISOString().split('T')[0];
  var contactName = data.name || data.contact_name || '';

  var existingData = sheet.getDataRange().getValues();
  for (var i = 1; i < existingData.length; i++) {
    if (existingData[i][0].toString().toLowerCase() === (data.company || '').toLowerCase() &&
        existingData[i][1].toString().toLowerCase() === contactName.toLowerCase()) {
      return { success: false, error: 'Contact already exists', row: i + 1 };
    }
  }

  var row = [
    data.company || '',
    contactName,
    data.title || '',
    data.email || '',
    data.email_status || 'Unavailable',
    data.linkedin_url || '',
    data.seniority || '',
    data.why_this_person || '',
    data.contact_stage || 'Contact Found',
    data.feedback || '',
    '', '', '', '', '', '', '', '', '', '', '',
    now
  ];

  sheet.appendRow(row);
  return { success: true, action: 'added', name: contactName, company: data.company, row: sheet.getLastRow() };
}

function updateContact(data) {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.outreach);
  var contactName = data.name || data.contact_name || '';

  var existingData = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < existingData.length; i++) {
    if (existingData[i][0].toString().toLowerCase() === (data.company || '').toLowerCase() &&
        existingData[i][1].toString().toLowerCase() === contactName.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'Contact not found: ' + contactName + ' at ' + data.company };
  }

  var fieldMap = {
    new_name: 2, title: 3, email: 4, email_status: 5, linkedin_url: 6,
    seniority: 7, why_this_person: 8, contact_stage: 9, feedback: 10
  };

  var updated = [];
  for (var field in fieldMap) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      sheet.getRange(rowIndex, fieldMap[field]).setValue(data[field]);
      updated.push(field);
    }
  }

  return { success: true, action: 'updated', name: contactName, company: data.company, row: rowIndex, fields_updated: updated };
}

function updateOutreach(data) {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.outreach);
  var contactName = data.contact_name || '';

  var existingData = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < existingData.length; i++) {
    if (existingData[i][0].toString().toLowerCase() === (data.company || '').toLowerCase() &&
        existingData[i][1].toString().toLowerCase() === contactName.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'Contact not found for outreach: ' + contactName + ' at ' + data.company };
  }

  // Clear any stale data validation on message body columns
  sheet.getRange(rowIndex, 12).clearDataValidations();
  sheet.getRange(rowIndex, 17).clearDataValidations();
  sheet.getRange(rowIndex, 19).clearDataValidations();

  var fieldMap = {
    email_subject: 11, email_body: 12, email_stage: 13,
    li_connection_msg: 17, li_connection_stage: 18,
    li_follow_up_msg: 19, li_follow_up_stage: 20
  };

  var updated = [];
  for (var field in fieldMap) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      sheet.getRange(rowIndex, fieldMap[field]).setValue(data[field]);
      updated.push(field);
    }
  }

  return { success: true, action: 'outreach_updated', company: data.company, contact_name: contactName, row: rowIndex, fields_updated: updated };
}

function updateStage(data) {
  var targetTab = data.tab || 'companies';
  var now = new Date().toISOString().split('T')[0];

  if (targetTab === 'outreach') {
    var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.outreach);
    var existingData = sheet.getDataRange().getValues();
    var contactName = data.name || data.contact_name || '';

    for (var i = 1; i < existingData.length; i++) {
      if (existingData[i][0].toString().toLowerCase() === (data.company || '').toLowerCase() &&
          existingData[i][1].toString().toLowerCase() === contactName.toLowerCase()) {
        var stageCol = data.stage_column || 'contact_stage';
        var colMap = { contact_stage: 9, email_stage: 13, li_connection_stage: 18, li_follow_up_stage: 20 };
        var col = colMap[stageCol] || 9;
        sheet.getRange(i + 1, col).setValue(data.stage);
        return { success: true, action: 'stage_updated', tab: 'outreach', row: i + 1, column: stageCol };
      }
    }
    return { success: false, error: 'Contact not found' };
  } else {
    var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.companies);
    var companies = sheet.getRange('A:A').getValues().flat();
    var rowIndex = companies.findIndex(function(c) {
      return c.toString().toLowerCase() === (data.company || '').toLowerCase();
    });

    if (rowIndex <= 0) {
      return { success: false, error: 'Company not found: ' + data.company };
    }

    sheet.getRange(rowIndex + 1, 10).setValue(data.stage);
    sheet.getRange(rowIndex + 1, 14).setValue(now);
    return { success: true, action: 'stage_updated', tab: 'companies', row: rowIndex + 1 };
  }
}

// --- Read Operations ---

function getSheetData(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return { error: 'Sheet not found: ' + sheetName };

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { headers: data[0] || [], rows: [] };

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }

  return { headers: headers, rows: rows, count: rows.length };
}

function getSummary() {
  var ss = getSpreadsheet();
  var companiesSheet = ss.getSheetByName(SHEET_NAMES.companies);
  var outreachSheet = ss.getSheetByName(SHEET_NAMES.outreach);

  var companiesData = companiesSheet ? companiesSheet.getDataRange().getValues() : [[]];
  var outreachData = outreachSheet ? outreachSheet.getDataRange().getValues() : [[]];

  // Companies by stage and ICP fit
  var companiesByStage = {};
  var companiesByFit = {};
  var totalValue = 0;

  for (var i = 1; i < companiesData.length; i++) {
    var stage = companiesData[i][9] || 'Unknown';
    var fit = companiesData[i][2] || 'Unknown';
    var value = parseFloat(companiesData[i][5]) || 0;

    companiesByStage[stage] = (companiesByStage[stage] || 0) + 1;
    companiesByFit[fit] = (companiesByFit[fit] || 0) + 1;
    totalValue += value;
  }

  // Outreach contacts by stage
  var contactsByStage = {};
  var emailsByStage = {};
  var liConnByStage = {};
  var liFuByStage = {};

  for (var i = 1; i < outreachData.length; i++) {
    var cStage = outreachData[i][8] || 'Unknown';
    var eStage = outreachData[i][12] || '';
    var lcStage = outreachData[i][17] || '';
    var lfStage = outreachData[i][19] || '';

    contactsByStage[cStage] = (contactsByStage[cStage] || 0) + 1;
    if (eStage) emailsByStage[eStage] = (emailsByStage[eStage] || 0) + 1;
    if (lcStage) liConnByStage[lcStage] = (liConnByStage[lcStage] || 0) + 1;
    if (lfStage) liFuByStage[lfStage] = (liFuByStage[lfStage] || 0) + 1;
  }

  var totalEmailSent = (emailsByStage['Sent'] || 0) + (emailsByStage['Replied'] || 0) + (emailsByStage['No Response'] || 0);
  var emailResponseRate = totalEmailSent > 0 ? ((emailsByStage['Replied'] || 0) / totalEmailSent * 100).toFixed(1) + '%' : 'N/A';

  // Count rework items
  var reworkCount = (companiesByStage['Rework'] || 0);
  for (var i = 1; i < outreachData.length; i++) {
    if (outreachData[i][8] === 'Rework') reworkCount++;
    if (outreachData[i][12] === 'Rework') reworkCount++;
    if (outreachData[i][17] === 'Rework') reworkCount++;
    if (outreachData[i][19] === 'Rework') reworkCount++;
  }

  return {
    companies: {
      total: companiesData.length - 1,
      by_stage: companiesByStage,
      by_icp_fit: companiesByFit,
      total_pipeline_value: totalValue
    },
    contacts: {
      total: outreachData.length - 1,
      by_contact_stage: contactsByStage
    },
    email: {
      by_stage: emailsByStage,
      response_rate: emailResponseRate
    },
    linkedin_connection: {
      by_stage: liConnByStage
    },
    linkedin_followup: {
      by_stage: liFuByStage
    },
    needs_action: {
      companies_awaiting_review: companiesByStage['Researched'] || 0,
      contacts_awaiting_review: contactsByStage['Contact Found'] || 0,
      outreach_not_approved: (emailsByStage['Drafted'] || 0) + (liConnByStage['Drafted'] || 0) + (liFuByStage['Drafted'] || 0),
      rework_items: reworkCount,
      drafts_pending_send: (emailsByStage['Draft Created'] || 0)
    }
  };
}

function countIf(data, col1, val1, col2, val2) {
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][col1] === val1) {
      if (col2 === null || data[i][col2] === val2) {
        count++;
      }
    }
  }
  return count;
}

// --- Logging ---

function logAction(action, details) {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.log);
  if (!sheet) return;
  sheet.appendRow([new Date().toISOString(), action, details]);
}

// --- Gmail Auto-Send (Per-Channel Approval) ---

function convertToHtml(text) {
  var escaped = escHtml(text);
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#222;">'
    + escaped.replace(/\n/g, '<br>')
    + '</div>';
}

function getGmailSignature() {
  try {
    var aliases = Gmail.Users.Settings.SendAs.list('me');
    var sendAsList = aliases.sendAs || [];
    for (var i = 0; i < sendAsList.length; i++) {
      if (sendAsList[i].isDefault) {
        return sendAsList[i].signature || '';
      }
    }
  } catch (err) {
    logAction('signature_error', 'Could not fetch Gmail signature: ' + err.toString());
  }
  return '';
}

function sendEmailFromRow(sheet, rowIndex) {
  var row = sheet.getRange(rowIndex, 1, 1, OUTREACH_HEADERS.length).getValues()[0];

  var company = row[0];
  var contactName = row[1];
  var email = row[3];
  var emailSubject = row[10];
  var emailBody = row[11];

  if (!email || email.toString().trim() === '') {
    sheet.getRange(rowIndex, 13).setValue('Send Failed');
    logAction('send_failed', 'Row ' + rowIndex + ' (' + company + '): No email address');
    return;
  }

  if (!emailBody || emailBody.toString().trim() === '') {
    sheet.getRange(rowIndex, 13).setValue('Send Failed');
    logAction('send_failed', 'Row ' + rowIndex + ' (' + company + '): No email body');
    return;
  }

  if (!emailSubject || emailSubject.toString().trim() === '') {
    emailSubject = 'Introduction - hrmny x ' + company;
  }

  try {
    var htmlBody = convertToHtml(emailBody.toString().trim());
    var signature = getGmailSignature();
    if (signature) {
      htmlBody += '<br>' + signature;
    }

    GmailApp.sendEmail(
      email.toString().trim(),
      emailSubject.toString().trim(),
      '', // plain text fallback left empty; htmlBody takes priority
      {
        htmlBody: htmlBody,
        name: 'Ayham Homsi'
      }
    );

    var sentDate = new Date().toISOString().split('T')[0];
    sheet.getRange(rowIndex, 13).setValue('Sent');
    sheet.getRange(rowIndex, 14).setValue(sentDate);
    sheet.getRange(rowIndex, 21).setValue(addBusinessDays(sentDate, 5));
    logAction('email_sent', 'Email sent to ' + contactName + ' at ' + company + ' (' + email + ')');
  } catch (err) {
    sheet.getRange(rowIndex, 13).setValue('Send Failed');
    logAction('send_error', 'Row ' + rowIndex + ' (' + company + '): ' + err.toString());
  }
}

// --- LinkedIn Notification ---

function sendLinkedInNotification(sheet, rowIndex, channelType) {
  var row = sheet.getRange(rowIndex, 1, 1, OUTREACH_HEADERS.length).getValues()[0];

  var company = row[0];
  var contactName = row[1];
  var linkedinUrl = row[5];

  var isConnectionRequest = (channelType === 'connection');
  var message = isConnectionRequest ? row[16] : row[18];
  var stageCol = isConnectionRequest ? 18 : 20;

  if (!message || message.toString().trim() === '') {
    sheet.getRange(rowIndex, stageCol).setValue('Send Failed');
    logAction('linkedin_failed', 'Row ' + rowIndex + ' (' + company + '): No message body');
    return;
  }

  var channelLabel = isConnectionRequest ? 'Connection Request' : 'Follow-up Message';
  var channelColor = isConnectionRequest ? '#0077B5' : '#00A0DC';

  var recipientEmail = Session.getEffectiveUser().getEmail();
  var emailSubject = 'LinkedIn ' + channelLabel + ': ' + contactName + ' at ' + company;

  var logoHtml = LOGO_URL
    ? '<img src="' + LOGO_URL + '" alt="hrmny" style="height:28px;width:auto;" />'
    : '<span style="color:#FEFFFF;font-size:20px;font-weight:800;letter-spacing:1px;">hrmny</span>';

  var h = '';
  h += '<div style="font-family:Montserrat,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;">';

  h += '<div style="background:#000000;padding:24px 28px;border-bottom:3px solid #0077B5;">';
  h += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
  h += '<td>' + logoHtml + '</td>';
  h += '<td style="text-align:right;">';
  h += '<span style="display:inline-block;background:' + channelColor + ';color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:12px;letter-spacing:0.5px;">LinkedIn ' + channelLabel + '</span>';
  h += '</td></tr></table></div>';

  h += '<div style="background:#ffffff;padding:24px 28px;border-bottom:1px solid #eee;">';
  h += '<div style="font-size:10px;font-weight:700;color:#0077B5;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">Send To</div>';
  h += '<div style="font-size:18px;font-weight:700;color:#000;">' + escHtml(contactName) + '</div>';
  h += '<div style="font-size:14px;color:#666;margin-top:4px;">' + escHtml(company) + '</div>';

  if (linkedinUrl && linkedinUrl.toString().trim() !== '') {
    h += '<div style="margin-top:16px;">';
    h += '<a href="' + escHtml(linkedinUrl.toString().trim()) + '" style="display:inline-block;background:#0077B5;color:#ffffff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:6px;text-decoration:none;">Open LinkedIn Profile &rarr;</a></div>';
  } else {
    h += '<div style="margin-top:12px;padding:8px 12px;background:#FFF8E1;border-radius:4px;font-size:12px;color:#F57F17;">No LinkedIn URL found. Search for ' + escHtml(contactName) + ' on LinkedIn manually.</div>';
  }
  h += '</div>';

  h += '<div style="background:#ffffff;padding:24px 28px;">';
  h += '<div style="font-size:10px;font-weight:700;color:#E47300;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">Message to Copy</div>';
  h += '<div style="background:#f8f9fa;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;font-size:14px;color:#222;line-height:1.6;white-space:pre-wrap;">';
  h += escHtml(message.toString().trim());
  h += '</div>';

  if (isConnectionRequest) {
    var charCount = message.toString().trim().length;
    var countColor = charCount <= 300 ? '#00b894' : '#e94560';
    h += '<div style="margin-top:8px;font-size:11px;color:' + countColor + ';font-weight:600;">' + charCount + '/300 characters</div>';
  }
  h += '</div>';

  h += '<div style="background:#000000;padding:20px 28px;">';
  h += '<div style="font-size:10px;font-weight:700;color:#E47300;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Steps</div>';
  h += '<div style="font-size:13px;color:#ccc;line-height:1.8;">';
  h += '<span style="color:#E47300;font-weight:700;">1.</span> Set LI stage to "Approved" in the <a href="https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '" style="color:#E47300;text-decoration:none;">dashboard</a><br>';
  h += '<span style="color:#E47300;font-weight:700;">2.</span> Run <code>/send-linkedin</code> to send via LinkedIn MCP<br>';
  h += '<span style="color:#E47300;font-weight:700;">3.</span> Status updates to "Sent" automatically';
  h += '</div></div>';

  h += '<div style="background:#000000;padding:12px 28px;border-top:1px solid #333;">';
  h += '<span style="color:#555;font-size:11px;">hrmny Sales Workspace</span></div>';
  h += '</div>';

  try {
    MailApp.sendEmail({ to: recipientEmail, subject: emailSubject, htmlBody: h });
    logAction('linkedin_notified', 'Notification sent for ' + channelLabel + ': ' + contactName + ' at ' + company);
  } catch (err) {
    sheet.getRange(rowIndex, stageCol).setValue('Send Failed');
    logAction('linkedin_notify_error', 'Row ' + rowIndex + ' (' + company + '): ' + err.toString());
  }
}

// --- onEdit Trigger (Per-Channel Approval) ---

function onOutreachEdit(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAMES.outreach) return;

  var col = e.range.getColumn();
  var newValue = e.range.getValue();
  var rowIndex = e.range.getRow();
  if (rowIndex <= 1) return;

  // Handle "Approved" actions (per-channel)
  if (newValue === 'Approved') {
    // Column M (13) = Email Stage → auto-send email via Gmail
    if (col === 13) {
      sendEmailFromRow(sheet, rowIndex);
    }
    // Column R (18) = LI Connection Stage → no action needed (sent via /send-linkedin MCP)
    // Column T (20) = LI Follow-up Stage → no action needed (sent via /send-linkedin MCP)
  }

  // Auto-set Follow-up Due when LI Connection Stage → "Sent"
  if (col === 18 && newValue === 'Sent') {
    var followUpDueCell = sheet.getRange(rowIndex, 21); // Column U = Follow-up Due
    if (!followUpDueCell.getValue()) {
      var todayStr = new Date().toISOString().split('T')[0];
      var dueDate = addBusinessDays(todayStr, 5);
      followUpDueCell.setValue(dueDate);
      logAction('li_followup_due_set', sheet.getRange(rowIndex, 1).getValue() + ' / ' + sheet.getRange(rowIndex, 2).getValue() + ' — Follow-up Due set to ' + dueDate);
    }
  }
}

function setupOutreachTrigger() {
  var ss = getSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onOutreachEdit') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onOutreachEdit').forSpreadsheet(ss).onEdit().create();
  logAction('setup', 'Outreach approval trigger installed (per-channel)');
}

// --- Automated Email Tracking ---

function sanitizeGmailQuery(text) {
  if (!text) return '';
  return text.replace(/["\(\)\{\}\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
}

function addBusinessDays(dateStr, days) {
  var date = new Date(dateStr + 'T00:00:00');
  var added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    var dow = date.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return date.toISOString().split('T')[0];
}

function extractEmail(fromField) {
  var match = fromField.match(/<(.+?)>/);
  if (match) return match[1];
  return fromField.trim();
}

function parseDateField(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  var dateStr = value.toString().trim();
  if (dateStr === '') return null;
  var parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return new Date(dateStr);
}

function formatDateField(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return value.toString().trim();
}

// --- Feature 1: Sent Detection ---

function checkSentEmails() {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.outreach);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var updatedCount = 0;

  for (var i = 1; i < data.length; i++) {
    var emailStage = data[i][12];
    var email = data[i][3];
    var emailSubject = data[i][10];

    if (emailStage !== 'Draft Created') continue;
    if (!email || email.toString().trim() === '') continue;

    try {
      var cleanEmail = email.toString().trim();
      var cleanSubject = sanitizeGmailQuery(emailSubject ? emailSubject.toString().trim() : '');
      var query = 'in:sent to:' + cleanEmail;
      if (cleanSubject) query += ' subject:"' + cleanSubject + '"';

      var threads = GmailApp.search(query, 0, 1);

      if (threads.length > 0) {
        var rowIndex = i + 1;
        var messages = threads[0].getMessages();
        var sentDate = messages[messages.length - 1].getDate().toISOString().split('T')[0];

        sheet.getRange(rowIndex, 13).setValue('Sent');
        sheet.getRange(rowIndex, 14).setValue(sentDate);
        sheet.getRange(rowIndex, 21).setValue(addBusinessDays(sentDate, 5));

        updatedCount++;
        logAction('sent_detected', data[i][0] + ' / ' + data[i][1] + ' — sent to ' + cleanEmail + ' on ' + sentDate);
      }
    } catch (err) {
      logAction('sent_check_error', 'Row ' + (i + 1) + ': ' + err.toString());
    }
  }

  if (updatedCount > 0) {
    logAction('sent_check_complete', updatedCount + ' row(s) updated to Sent');
  }
}

// --- Feature 2: Reply Detection ---

function checkReplies() {
  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.outreach);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var now = new Date();
  var repliedCount = 0;
  var noResponseCount = 0;
  var bouncedCount = 0;

  for (var i = 1; i < data.length; i++) {
    var emailStage = data[i][12];
    var email = data[i][3];
    var emailSubject = data[i][10];
    var dateSent = data[i][13];

    if (emailStage !== 'Sent') continue;
    if (!email || email.toString().trim() === '') continue;

    var cleanEmail = email.toString().trim();

    try {
      var cleanSubject = sanitizeGmailQuery(emailSubject ? emailSubject.toString().trim() : '');
      var query = 'to:' + cleanEmail;
      if (cleanSubject) query += ' subject:"' + cleanSubject + '"';

      var threads = GmailApp.search(query, 0, 1);

      if (threads.length > 0) {
        var messages = threads[0].getMessages();
        var replyFound = false;
        var bounceFound = false;

        for (var m = 0; m < messages.length; m++) {
          var fromEmail = extractEmail(messages[m].getFrom());
          var fromLower = fromEmail.toLowerCase();

          // Check for bounce notifications (mailer-daemon, postmaster, delivery failures)
          if (fromLower.indexOf('mailer-daemon') !== -1 ||
              fromLower.indexOf('postmaster') !== -1 ||
              fromLower === 'noreply@google.com') {
            var bodyText = messages[m].getPlainBody().toLowerCase();
            var subjectText = messages[m].getSubject().toLowerCase();
            if (bodyText.indexOf('delivery') !== -1 ||
                bodyText.indexOf('undeliverable') !== -1 ||
                bodyText.indexOf('failed') !== -1 ||
                bodyText.indexOf('bounced') !== -1 ||
                bodyText.indexOf('rejected') !== -1 ||
                bodyText.indexOf('couldn\'t be delivered') !== -1 ||
                bodyText.indexOf('could not be delivered') !== -1 ||
                bodyText.indexOf('does not exist') !== -1 ||
                bodyText.indexOf('no such user') !== -1 ||
                bodyText.indexOf('unknown user') !== -1 ||
                subjectText.indexOf('delivery') !== -1 ||
                subjectText.indexOf('undeliverable') !== -1 ||
                subjectText.indexOf('returned') !== -1 ||
                subjectText.indexOf('failure') !== -1) {
              bounceFound = true;
              var bounceRowIndex = i + 1;
              var bounceDate = messages[m].getDate().toISOString().split('T')[0];
              var bounceSnippet = messages[m].getPlainBody().substring(0, 200).replace(/\n/g, ' ').trim();

              sheet.getRange(bounceRowIndex, 13).setValue('Bounced');
              sheet.getRange(bounceRowIndex, 15).setValue(bounceDate);
              sheet.getRange(bounceRowIndex, 16).setValue(bounceSnippet);

              bouncedCount++;
              logAction('bounce_detected', data[i][0] + ' / ' + data[i][1] + ' — email to ' + cleanEmail + ' bounced on ' + bounceDate);

              // Bounce recovery: find alt contacts and suggest LinkedIn pivot
              handleBounce(sheet, data, i, bounceDate);
              break;
            }
          }

          // Check for actual replies from the contact
          if (fromLower === cleanEmail.toLowerCase()) {
            replyFound = true;
            var rowIndex = i + 1;
            var replyDate = messages[m].getDate().toISOString().split('T')[0];
            var replySnippet = messages[m].getPlainBody().substring(0, 200).replace(/\n/g, ' ').trim();

            sheet.getRange(rowIndex, 13).setValue('Replied');
            sheet.getRange(rowIndex, 15).setValue(replyDate);
            sheet.getRange(rowIndex, 16).setValue(replySnippet);

            repliedCount++;
            logAction('reply_detected', data[i][0] + ' / ' + data[i][1] + ' — reply from ' + cleanEmail + ' on ' + replyDate);
            break;
          }
        }

        if (bounceFound || replyFound) continue;
      }

      if (dateSent) {
        var sentDate = parseDateField(dateSent);
        if (sentDate) {
          var daysSinceSent = Math.floor((now - sentDate) / (1000 * 60 * 60 * 24));
          if (daysSinceSent >= 7) {
            sheet.getRange(i + 1, 13).setValue('No Response');
            noResponseCount++;
            logAction('no_response_set', data[i][0] + ' / ' + data[i][1] + ' — no reply after ' + daysSinceSent + ' days');
          }
        }
      }
    } catch (err) {
      logAction('reply_check_error', 'Row ' + (i + 1) + ': ' + err.toString());
    }
  }

  if (repliedCount > 0 || noResponseCount > 0 || bouncedCount > 0) {
    logAction('reply_check_complete', repliedCount + ' replied, ' + noResponseCount + ' no response, ' + bouncedCount + ' bounced');
  }
}

// --- Bounce Recovery ---

function handleBounce(sheet, data, bouncedRowIdx, bounceDate) {
  var company = data[bouncedRowIdx][0];
  var bouncedContact = data[bouncedRowIdx][1];
  var liConnMsg = data[bouncedRowIdx][16];
  var liConnStage = data[bouncedRowIdx][17];
  var feedbackCol = 10; // Column J = Feedback

  // 1. Check if this contact has LinkedIn outreach available — suggest pivot
  var feedbackParts = [];
  if (liConnMsg && liConnMsg.toString().trim() !== '' && (!liConnStage || liConnStage === 'Drafted' || liConnStage === 'Reworked')) {
    feedbackParts.push('Email bounced ' + bounceDate + '. LinkedIn connection request is drafted — approve LI Connection Stage and run /send-linkedin to pivot.');
    logAction('bounce_recovery', company + ' / ' + bouncedContact + ' — LinkedIn pivot available');
  } else if (!liConnMsg || liConnMsg.toString().trim() === '') {
    feedbackParts.push('Email bounced ' + bounceDate + '. No LinkedIn outreach drafted — run /draft-outreach to create LinkedIn messages for this contact.');
    logAction('bounce_recovery', company + ' / ' + bouncedContact + ' — no LinkedIn outreach, needs drafting');
  } else {
    feedbackParts.push('Email bounced ' + bounceDate + '. LinkedIn outreach already ' + (liConnStage || 'in progress') + '.');
  }

  // 2. Find alternative contacts at the same company
  var altContacts = [];
  for (var j = 1; j < data.length; j++) {
    if (j === bouncedRowIdx) continue;
    if (data[j][0] && data[j][0].toString().trim() === company.toString().trim()) {
      var altName = data[j][1];
      var altEmailStage = data[j][12];
      var altEmail = data[j][3];
      var altLiStage = data[j][17];
      altContacts.push({
        name: altName,
        hasEmail: altEmail && altEmail.toString().trim() !== '',
        emailStage: altEmailStage,
        liStage: altLiStage
      });
    }
  }

  if (altContacts.length > 0) {
    var altNames = altContacts.map(function(c) { return c.name; }).join(', ');
    feedbackParts.push('Alt contacts at ' + company + ': ' + altNames + '.');
    logAction('bounce_recovery', company + ' — ' + altContacts.length + ' alternative contact(s) available: ' + altNames);
  } else {
    feedbackParts.push('No alternative contacts at ' + company + '. Consider running /fetch-contacts to find more.');
    logAction('bounce_recovery', company + ' — no alternative contacts found');
  }

  // Write feedback to the bounced row
  var existingFeedback = sheet.getRange(bouncedRowIdx + 1, feedbackCol).getValue();
  var newFeedback = feedbackParts.join(' ');
  if (existingFeedback && existingFeedback.toString().trim() !== '') {
    newFeedback = existingFeedback + ' | ' + newFeedback;
  }
  sheet.getRange(bouncedRowIdx + 1, feedbackCol).setValue(newFeedback);
}

// --- Feature 3: Follow-up Reminder Digest ---

function checkFollowUpReminders() {
  var props = PropertiesService.getScriptProperties();
  var lastReminderDate = props.getProperty('last_reminder_date') || '';
  var todayStr = new Date().toISOString().split('T')[0];

  if (lastReminderDate === todayStr) return;

  var sheet = getSpreadsheet().getSheetByName(SHEET_NAMES.outreach);
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  var now = new Date();

  var emailFollowUps = [];
  var linkedInReminders = [];

  for (var i = 1; i < data.length; i++) {
    var company = data[i][0];
    var contactName = data[i][1];
    var email = data[i][3];
    var linkedinUrl = data[i][5];
    var emailSubject = data[i][10];
    var emailStage = data[i][12];
    var emailDateSent = data[i][13];
    var liConnStage = data[i][17];
    var liFollowUpMsg = data[i][18];
    var liFollowUpStage = data[i][19];
    var followUpDue = data[i][20];

    // Email follow-ups: Sent or No Response with overdue Follow-up Due
    if ((emailStage === 'Sent' || emailStage === 'No Response') && followUpDue) {
      var dueDate = parseDateField(followUpDue);
      if (dueDate && dueDate <= now) {
        emailFollowUps.push({
          company: company,
          contactName: contactName,
          subject: emailSubject,
          recipientEmail: email,
          status: emailStage,
          dateSent: formatDateField(emailDateSent),
          followUpDue: formatDateField(followUpDue),
          daysOverdue: Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)),
          linkedInFollowUp: (liFollowUpMsg && liFollowUpStage === 'Drafted') ? { body: liFollowUpMsg } : null
        });
      }
    }

    // LinkedIn-only follow-ups: connection sent/accepted, follow-up message drafted, Follow-up Due overdue
    if ((liConnStage === 'Sent' || liConnStage === 'Accepted') && liFollowUpMsg && liFollowUpStage === 'Drafted' && followUpDue) {
      var liDueDate = parseDateField(followUpDue);
      if (liDueDate && liDueDate <= now) {
        // Skip if already captured as an email follow-up (avoid duplicate)
        var alreadyCaptured = false;
        for (var j = 0; j < emailFollowUps.length; j++) {
          if (emailFollowUps[j].contactName === contactName && emailFollowUps[j].company === company) {
            alreadyCaptured = true;
            break;
          }
        }
        if (!alreadyCaptured) {
          linkedInReminders.push({
            company: company,
            contactName: contactName,
            linkedinUrl: linkedinUrl,
            followUpMessage: liFollowUpMsg,
            followUpDue: formatDateField(followUpDue),
            daysOverdue: Math.floor((now - liDueDate) / (1000 * 60 * 60 * 24)),
            connectionStatus: liConnStage
          });
        }
      }
    }
  }

  if (emailFollowUps.length === 0 && linkedInReminders.length === 0) {
    props.setProperty('last_reminder_date', todayStr);
    return;
  }

  var htmlBody = buildFollowUpReminderEmail(emailFollowUps, linkedInReminders, todayStr);
  var totalItems = emailFollowUps.length + linkedInReminders.length;
  var emailSubjectLine = 'hrmny Follow-up Digest — '
    + totalItems + ' action' + (totalItems !== 1 ? 's' : '')
    + ' due (' + formatShortDate(todayStr) + ')';

  try {
    var recipientEmail = Session.getEffectiveUser().getEmail();
    MailApp.sendEmail({ to: recipientEmail, subject: emailSubjectLine, htmlBody: htmlBody });
    props.setProperty('last_reminder_date', todayStr);
    logAction('followup_reminder_sent', emailFollowUps.length + ' email follow-ups, ' + linkedInReminders.length + ' LinkedIn reminders');
  } catch (err) {
    logAction('followup_reminder_error', err.toString());
  }
}

function buildFollowUpReminderEmail(emailFollowUps, linkedInReminders, todayStr) {
  var dashboardUrl = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID;
  var shortDate = formatShortDate(todayStr);
  var totalItems = emailFollowUps.length + linkedInReminders.length;

  var logoHtml = LOGO_URL
    ? '<img src="' + LOGO_URL + '" alt="hrmny" style="height:32px;width:auto;" />'
    : '<span style="color:#FEFFFF;font-size:24px;font-weight:800;letter-spacing:2px;">hrmny</span>';
  var logoSmallHtml = LOGO_URL
    ? '<img src="' + LOGO_URL + '" alt="hrmny" style="height:16px;width:auto;opacity:0.5;" />'
    : '<span style="color:#555;font-size:11px;font-weight:700;letter-spacing:1px;">hrmny</span>';

  var h = '';
  h += '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
  h += '<div style="font-family:Montserrat,Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#f5f5f5;">';

  h += '<div style="background:#000000;padding:28px 32px 24px;">';
  h += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
  h += '<td>' + logoHtml + '</td>';
  h += '<td style="text-align:right;">';
  h += '<span style="color:#E47300;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Follow-up Digest</span><br>';
  h += '<span style="color:#888;font-size:11px;">' + shortDate + '</span>';
  h += '</td></tr></table>';
  h += '<div style="height:3px;background:#E47300;margin-top:16px;border-radius:2px;"></div>';
  h += '<p style="color:#ccc;font-size:14px;margin:16px 0 0;">'
    + totalItems + ' follow-up' + (totalItems !== 1 ? 's' : '') + ' need your attention today.</p>';
  h += '</div>';

  if (emailFollowUps.length > 0) {
    h += '<div style="background:#FEFFFF;padding:24px 32px;">';
    h += '<div style="font-size:10px;font-weight:700;color:#E47300;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #E47300;">Email Follow-ups (' + emailFollowUps.length + ')</div>';

    emailFollowUps.sort(function(a, b) { return b.daysOverdue - a.daysOverdue; });

    for (var i = 0; i < emailFollowUps.length; i++) {
      var item = emailFollowUps[i];
      var urgencyColor = item.daysOverdue >= 3 ? '#e94560' : (item.daysOverdue >= 1 ? '#E47300' : '#00b894');
      var urgencyLabel = item.daysOverdue >= 1
        ? item.daysOverdue + ' day' + (item.daysOverdue !== 1 ? 's' : '') + ' overdue'
        : 'Due today';

      h += '<div style="margin-bottom:14px;padding:16px 20px;background:#fafafa;border-radius:8px;border-left:4px solid ' + urgencyColor + ';">';
      h += '<div style="font-size:16px;font-weight:700;color:#000;">' + escHtml(item.contactName) + '</div>';
      h += '<div style="font-size:13px;color:#666;margin-top:2px;">' + escHtml(item.company) + '</div>';
      h += '<div style="margin-top:10px;">';
      h += '<span style="display:inline-block;background:' + urgencyColor + ';color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:10px;">' + urgencyLabel + '</span>';
      h += ' <span style="display:inline-block;background:#f0f0f0;color:#666;font-size:10px;font-weight:600;padding:3px 10px;border-radius:10px;">Sent: ' + escHtml(item.dateSent) + '</span>';
      h += ' <span style="display:inline-block;background:#f0f0f0;color:#666;font-size:10px;font-weight:600;padding:3px 10px;border-radius:10px;">' + escHtml(item.status) + '</span>';
      h += '</div>';
      h += '<div style="font-size:12px;color:#888;margin-top:10px;">Subject: ' + escHtml(item.subject) + '</div>';
      h += '<div style="font-size:12px;color:#888;">To: ' + escHtml(item.recipientEmail) + '</div>';

      if (item.linkedInFollowUp && item.linkedInFollowUp.body) {
        h += '<div style="margin-top:12px;padding:12px 16px;background:#E3F2FD;border-radius:6px;">';
        h += '<div style="font-size:10px;font-weight:700;color:#0077B5;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">LinkedIn Follow-up Ready</div>';
        h += '<div style="font-size:13px;color:#222;line-height:1.5;white-space:pre-wrap;">' + escHtml(item.linkedInFollowUp.body) + '</div>';
        h += '</div>';
      }

      h += '</div>';
    }
    h += '</div>';
  }

  if (linkedInReminders.length > 0) {
    h += '<div style="background:#FEFFFF;padding:24px 32px;">';
    h += '<div style="font-size:10px;font-weight:700;color:#0077B5;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #0077B5;">LinkedIn Follow-ups (' + linkedInReminders.length + ')</div>';

    linkedInReminders.sort(function(a, b) { return b.daysOverdue - a.daysOverdue; });

    for (var j = 0; j < linkedInReminders.length; j++) {
      var li = linkedInReminders[j];
      var liUrgencyColor = li.daysOverdue >= 3 ? '#e94560' : (li.daysOverdue >= 1 ? '#E47300' : '#00b894');
      var liUrgencyLabel = li.daysOverdue >= 1
        ? li.daysOverdue + ' day' + (li.daysOverdue !== 1 ? 's' : '') + ' overdue'
        : 'Due today';

      h += '<div style="margin-bottom:14px;padding:16px 20px;background:#fafafa;border-radius:8px;border-left:4px solid #0077B5;">';
      h += '<div style="font-size:16px;font-weight:700;color:#000;">' + escHtml(li.contactName) + '</div>';
      h += '<div style="font-size:13px;color:#666;margin-top:2px;">' + escHtml(li.company) + '</div>';
      h += '<div style="margin-top:10px;">';
      h += '<span style="display:inline-block;background:' + liUrgencyColor + ';color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:10px;">' + liUrgencyLabel + '</span>';
      h += ' <span style="display:inline-block;background:#E3F2FD;color:#0077B5;font-size:10px;font-weight:600;padding:3px 10px;border-radius:10px;">Connection ' + escHtml(li.connectionStatus) + '</span>';
      h += '</div>';

      // Follow-up message ready to copy
      h += '<div style="margin-top:12px;padding:12px 16px;background:#E3F2FD;border-radius:6px;">';
      h += '<div style="font-size:10px;font-weight:700;color:#0077B5;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Follow-up Message (approve &amp; run /send-linkedin)</div>';
      h += '<div style="font-size:13px;color:#222;line-height:1.5;white-space:pre-wrap;">' + escHtml(li.followUpMessage) + '</div>';
      h += '</div>';

      // LinkedIn profile link
      if (li.linkedinUrl) {
        h += '<div style="margin-top:10px;">';
        h += '<a href="' + li.linkedinUrl + '" style="display:inline-block;background:#0077B5;color:#fff;font-size:12px;font-weight:700;padding:8px 16px;border-radius:6px;text-decoration:none;">Open LinkedIn Profile &rarr;</a>';
        h += '</div>';
      }

      h += '</div>';
    }
    h += '</div>';
  }

  h += '<div style="background:#000;padding:20px 32px;">';
  h += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
  h += '<td>';
  h += '<div style="font-size:10px;font-weight:700;color:#E47300;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Quick Actions</div>';
  h += '<div style="font-size:13px;color:#ccc;line-height:1.8;">';
  h += '<span style="color:#E47300;font-weight:700;">1.</span> Review follow-ups above<br>';
  h += '<span style="color:#E47300;font-weight:700;">2.</span> Approve overdue items in the dashboard, then run <code>/send-linkedin</code> to send<br>';
  h += '<span style="color:#E47300;font-weight:700;">3.</span> Update status in the dashboard after actioning';
  h += '</div></td>';
  h += '<td style="text-align:right;vertical-align:middle;width:140px;">';
  h += '<a href="' + dashboardUrl + '" style="display:inline-block;background:#E47300;color:#000;font-size:12px;font-weight:700;padding:10px 20px;border-radius:6px;text-decoration:none;">Open Dashboard &rarr;</a>';
  h += '</td></tr></table></div>';

  h += '<div style="background:#000000;padding:16px 32px;border-top:2px solid #E47300;">';
  h += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
  h += '<td>' + logoSmallHtml + '</td>';
  h += '<td style="text-align:right;"><a href="' + dashboardUrl + '" style="color:#E47300;font-size:11px;text-decoration:none;">Open Dashboard</a></td>';
  h += '</tr></table></div>';

  h += '</div>';
  return h;
}

// --- Tracking Trigger ---

function onTrackingTick() {
  try {
    checkSentEmails();
    checkReplies();
    checkFollowUpReminders();
  } catch (err) {
    logAction('tracking_error', err.toString());
  }
}

function setupTrackingTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onTrackingTick') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onTrackingTick').timeBased().everyMinutes(30).create();
  logAction('setup', 'Email tracking trigger installed (every 30 min)');
}

// --- Daily Summary Email ---

function sendDailySummary(data) {
  var recipients = getNewsletterRecipients();
  var recipientStr = recipients.join(',');

  var logoHtml = LOGO_URL
    ? '<img src="' + LOGO_URL + '" alt="hrmny" style="height:28px;width:auto;" />'
    : '<span style="color:#FEFFFF;font-size:20px;font-weight:800;letter-spacing:1px;">hrmny</span>';

  if (data.error === true) {
    var errorSubject = 'hrmny Daily Research — ERROR (' + (data.date || new Date().toISOString().split('T')[0]) + ')';
    var errorBody = '<div style="font-family:Montserrat,Arial,sans-serif;max-width:600px;margin:0 auto;">'
      + '<div style="background:#000000;padding:24px 28px;border-bottom:3px solid #E47300;">'
      + logoHtml + '<span style="color:#E47300;font-size:12px;margin-left:12px;">DAILY RESEARCH</span></div>'
      + '<div style="background:#FFECD8;padding:24px 28px;">'
      + '<h2 style="color:#000000;margin:0 0 12px;font-size:18px;">Pipeline Error</h2>'
      + '<p style="color:#333;font-size:14px;line-height:1.5;margin:0;">' + (data.error_message || 'Unknown error') + '</p>'
      + '<p style="color:#666;font-size:13px;margin:16px 0 0;">Check <code>data/logs/</code> for details.</p></div>'
      + '<div style="background:#000000;padding:12px 28px;border-top:2px solid #E47300;">'
      + '<span style="color:#666;font-size:11px;">hrmny Sales Workspace</span></div></div>';

    MailApp.sendEmail({ to: recipientStr, subject: errorSubject, htmlBody: errorBody });
    return { success: true, action: 'error_email_sent' };
  }

  if (data.test === true) {
    var testBody = '<div style="font-family:Montserrat,Arial,sans-serif;max-width:600px;margin:0 auto;">'
      + '<div style="background:#000000;padding:24px 28px;border-bottom:3px solid #E47300;">'
      + logoHtml + '<span style="color:#E47300;font-size:12px;margin-left:12px;">MORNING BRIEF</span></div>'
      + '<div style="background:#FFECD8;padding:32px 28px;text-align:center;">'
      + '<h2 style="color:#000000;margin:0 0 8px;font-size:22px;">Test Successful</h2>'
      + '<p style="color:#333;font-size:14px;margin:0;">The morning brief email system is working correctly.</p></div>'
      + '<div style="background:#000000;padding:12px 28px;border-top:2px solid #E47300;">'
      + '<span style="color:#666;font-size:11px;">hrmny Sales Workspace</span></div></div>';

    MailApp.sendEmail({ to: recipientStr, subject: 'hrmny Morning Brief — Test Email', htmlBody: testBody });
    return { success: true, action: 'test_email_sent' };
  }

  // Enrich with live pipeline data if not provided
  if (!data.pipeline_snapshot) {
    try {
      var summary = getSummary();
      data.pipeline_snapshot = {
        total_companies: summary.companies.total,
        awaiting_review: summary.needs_action.companies_awaiting_review,
        contacts_pending: summary.needs_action.contacts_awaiting_review,
        drafts_pending: summary.needs_action.outreach_not_approved,
        emails_sent: (summary.email.by_stage['Sent'] || 0) + (summary.email.by_stage['Replied'] || 0) + (summary.email.by_stage['No Response'] || 0),
        replies: summary.email.by_stage['Replied'] || 0,
        response_rate: summary.email.response_rate,
        total_pipeline_value: summary.companies.total_pipeline_value > 0
          ? 'AED ' + (summary.companies.total_pipeline_value >= 1000000
              ? (summary.companies.total_pipeline_value / 1000000).toFixed(1) + 'M'
              : Math.round(summary.companies.total_pipeline_value / 1000) + 'K')
          : null
      };
    } catch (e) {
      logAction('pipeline_snapshot_error', e.toString());
    }
  }

  var signals = data.market_signals || [];
  var signalCount = signals.length;
  var companyCount = data.companies_researched || 0;
  var dateStr = data.date || new Date().toISOString().split('T')[0];
  var shortDate = formatShortDate(dateStr);
  var sectorShort = (data.sector_focus || 'Research').split('+')[0].split('/')[0].trim();

  // Subject line: include tldr if available for better inbox scanning
  var subject;
  if (data.tldr) {
    var tldrShort = data.tldr.length > 60 ? data.tldr.substring(0, 57) + '...' : data.tldr;
    subject = 'hrmny Morning Brief | ' + sectorShort + ' (' + shortDate + ') — ' + tldrShort;
  } else {
    subject = 'hrmny Morning Brief — '
      + signalCount + ' signal' + (signalCount !== 1 ? 's' : '') + ' · '
      + companyCount + ' opportunit' + (companyCount !== 1 ? 'ies' : 'y')
      + ' | ' + sectorShort + ' (' + shortDate + ')';
  }

  var htmlBody = formatSummaryEmail(data, subject);
  MailApp.sendEmail({ to: recipientStr, subject: subject, htmlBody: htmlBody });
  logAction('send_daily_summary', 'Sent to ' + recipientStr + ': ' + subject);

  return { success: true, action: 'summary_email_sent', recipient: recipientStr };
}

function formatSummaryEmail(data, subject) {
  var companies = data.companies || [];
  var signals = data.market_signals || [];
  var errors = data.errors || [];
  var ps = data.pipeline_snapshot || null;
  var rc = data.run_context || null;

  var dashboardUrl = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID;
  var dateStr = data.date || '';
  var shortDate = formatShortDate(dateStr);

  var signalStyles = {
    market_entry: { bg: '#E8F5E9', color: '#2E7D32', label: 'Market Entry' },
    agency_review: { bg: '#FFF3E0', color: '#E65100', label: 'Agency Review' },
    campaign: { bg: '#E3F2FD', color: '#1565C0', label: 'Campaign' },
    expansion: { bg: '#F3E5F5', color: '#7B1FA2', label: 'Expansion' },
    event: { bg: '#E0F2F1', color: '#00695C', label: 'Event' },
    hire: { bg: '#FCE4EC', color: '#C62828', label: 'Key Hire' },
    funding: { bg: '#FFF8E1', color: '#F57F17', label: 'Funding' },
    trend: { bg: '#ECEFF1', color: '#37474F', label: 'Trend' }
  };

  var h = '';
  h += '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
  h += '<div style="font-family:Montserrat,Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#f5f5f5;">';

  // === A. HEADER ===
  h += '<div style="background:#000000;padding:28px 32px 24px;">';
  h += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
  if (LOGO_URL) {
    h += '<td><img src="' + LOGO_URL + '" alt="hrmny" style="height:32px;width:auto;" /></td>';
  } else {
    h += '<td><span style="color:#FEFFFF;font-size:24px;font-weight:800;letter-spacing:2px;">hrmny</span></td>';
  }
  h += '<td style="text-align:right;">';
  h += '<span style="color:#E47300;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Morning Brief</span><br>';
  h += '<span style="color:#888;font-size:11px;">' + shortDate + '</span>';
  h += '</td></tr></table>';
  h += '<div style="height:3px;background:#E47300;margin-top:16px;border-radius:2px;"></div>';
  h += '<div style="margin-top:16px;">';
  h += '<span style="display:inline-block;background:#E47300;color:#000000;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:0.5px;">' + escHtml(data.sector_focus || 'General Research') + '</span>';
  if (data.sector_override) {
    h += ' <span style="color:#888;font-size:11px;margin-left:8px;">Override: ' + escHtml(data.override_reason || 'manual') + '</span>';
  }
  h += '</div>';
  if (data.executive_summary) {
    h += '<p style="color:#ffffff;font-size:14px;line-height:1.5;margin:16px 0 0;font-weight:400;">' + escHtml(data.executive_summary) + '</p>';
  }
  h += '</div>';

  // === B. TL;DR BAR ===
  var tldr = data.tldr || '';
  if (tldr) {
    h += '<div style="background:#FFF8E1;padding:16px 32px;border-bottom:2px solid #E47300;">';
    h += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
    h += '<td style="width:28px;vertical-align:top;"><span style="font-size:18px;">&#9889;</span></td>';
    h += '<td><span style="font-size:15px;font-weight:700;color:#000;line-height:1.4;">' + escHtml(tldr) + '</span></td>';
    h += '</tr></table></div>';
  }

  // === C. QUICK STATS (moved up) ===
  h += '<div style="background:#1a1a1a;padding:16px 32px;">';
  h += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
  h += '<td style="text-align:center;width:25%;"><span style="font-size:20px;font-weight:800;color:#FEFFFF;">' + signals.length + '</span><br><span style="font-size:10px;color:#666;">signals</span></td>';
  h += '<td style="text-align:center;width:25%;border-left:1px solid #333;"><span style="font-size:20px;font-weight:800;color:#FEFFFF;">' + (data.companies_researched || 0) + '</span><br><span style="font-size:10px;color:#666;">new leads</span></td>';
  if (ps) {
    h += '<td style="text-align:center;width:25%;border-left:1px solid #333;"><span style="font-size:20px;font-weight:800;color:#FEFFFF;">' + (ps.total_companies || 0) + '</span><br><span style="font-size:10px;color:#666;">in pipeline</span></td>';
    h += '<td style="text-align:center;width:25%;border-left:1px solid #333;"><span style="font-size:20px;font-weight:800;color:#E47300;">' + (ps.replies || 0) + '</span><br><span style="font-size:10px;color:#666;">replies</span></td>';
  } else {
    h += '<td style="text-align:center;width:25%;border-left:1px solid #333;"><span style="font-size:20px;font-weight:800;color:#FEFFFF;">' + (data.total_contacts_enriched || 0) + '</span><br><span style="font-size:10px;color:#666;">contacts</span></td>';
    h += '<td style="text-align:center;width:25%;border-left:1px solid #333;"><span style="font-size:20px;font-weight:800;color:#E47300;">' + (data.outreach_drafted_count || 0) + '</span><br><span style="font-size:10px;color:#666;">drafts</span></td>';
  }
  h += '</tr></table>';
  if (ps && ps.total_pipeline_value) {
    h += '<div style="text-align:center;margin-top:8px;padding-top:8px;border-top:1px solid #333;">';
    h += '<span style="font-size:11px;color:#888;">Pipeline value: </span><span style="font-size:13px;font-weight:700;color:#E47300;">' + escHtml(ps.total_pipeline_value) + '</span>';
    h += '</div>';
  }
  h += '</div>';

  // === D. MARKET INTELLIGENCE ===
  if (signals.length > 0) {
    h += '<div style="background:#FEFFFF;padding:24px 32px;">';
    h += '<div style="font-size:10px;font-weight:700;color:#E47300;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #E47300;">Market Intelligence</div>';

    for (var s = 0; s < signals.length; s++) {
      var sig = signals[s];
      var sType = sig.signal_type || 'trend';
      var style = signalStyles[sType] || signalStyles.trend;

      h += '<div style="margin-bottom:14px;padding:14px 16px;background:#fafafa;border-radius:8px;border-left:4px solid ' + style.color + ';">';
      h += '<div style="margin-bottom:6px;">';
      h += '<span style="display:inline-block;background:' + style.bg + ';color:' + style.color + ';font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:0.5px;text-transform:uppercase;margin-right:8px;">' + style.label + '</span>';
      // Source: clickable if source_url provided
      if (sig.source) {
        if (sig.source_url) {
          h += '<a href="' + escHtml(sig.source_url) + '" style="color:#999;font-size:10px;text-decoration:underline;">' + escHtml(sig.source) + '</a>';
        } else {
          h += '<span style="color:#999;font-size:10px;">' + escHtml(sig.source) + '</span>';
        }
      }
      h += '</div>';
      // Headline: clickable if source_url provided
      if (sig.source_url) {
        h += '<a href="' + escHtml(sig.source_url) + '" style="font-size:14px;font-weight:700;color:#000;line-height:1.4;text-decoration:none;">' + escHtml(sig.headline || '') + ' <span style="color:#E47300;font-size:12px;">&#8594;</span></a>';
      } else {
        h += '<div style="font-size:14px;font-weight:700;color:#000;line-height:1.4;">' + escHtml(sig.headline || '') + '</div>';
      }
      if (sig.relevance) {
        h += '<div style="font-size:12px;color:#555;margin-top:6px;line-height:1.4;font-style:italic;">' + escHtml(sig.relevance) + '</div>';
      }
      h += '</div>';
    }
    h += '</div>';
  }

  // === E. OPPORTUNITIES ===
  h += '<div style="padding:24px 32px;background:#FEFFFF;">';
  h += '<div style="font-size:10px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #E47300;">Opportunities</div>';

  if (companies.length === 0) {
    h += '<p style="color:#888;font-size:14px;">No companies qualified today.</p>';
  }

  for (var i = 0; i < companies.length; i++) {
    var c = companies[i];
    var fitBg = c.icp_fit === 'Hot' ? '#E47300' : (c.icp_fit === 'Warm' ? '#FFECD8' : '#f0f0f0');
    var fitColor = c.icp_fit === 'Hot' ? '#FEFFFF' : (c.icp_fit === 'Warm' ? '#000000' : '#666');
    var fitBorder = c.icp_fit === 'Hot' ? '#E47300' : (c.icp_fit === 'Warm' ? '#E47300' : '#ddd');

    h += '<div style="border:1px solid #eee;border-radius:8px;margin-bottom:14px;overflow:hidden;border-left:4px solid ' + fitBorder + ';">';
    h += '<div style="padding:16px 20px 12px;">';
    h += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
    h += '<td><span style="font-size:17px;font-weight:800;color:#000;">' + escHtml(c.name || '') + '</span></td>';
    h += '<td style="text-align:right;">';
    h += '<span style="display:inline-block;background:' + fitBg + ';color:' + fitColor + ';font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;">' + escHtml(c.icp_fit || '?') + '</span>';
    h += '</td></tr></table>';
    h += '<div style="font-size:12px;color:#888;margin-top:4px;">' + escHtml(c.sector || '');
    if (c.est_value) h += ' &middot; <span style="color:#000;font-weight:700;">' + escHtml(c.est_value) + '</span>';
    h += '</div></div>';

    var whyNow = c.why_now || c.outreach_angle || '';
    if (whyNow) {
      h += '<div style="padding:0 20px 12px;">';
      h += '<div style="font-size:10px;font-weight:700;color:#E47300;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Why now</div>';
      h += '<div style="font-size:13px;color:#222;line-height:1.5;">' + escHtml(whyNow) + '</div>';
      h += '</div>';
    }

    if (c.opportunity_summary) {
      h += '<div style="padding:0 20px 12px;">';
      h += '<div style="font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Opportunity</div>';
      h += '<div style="font-size:13px;color:#333;line-height:1.5;">' + escHtml(c.opportunity_summary) + '</div>';
      h += '</div>';
    }

    // Service badges
    h += '<div style="padding:0 20px 14px;">';
    if (c.services_match && c.services_match.length > 0) {
      for (var sv = 0; sv < c.services_match.length; sv++) {
        h += '<span style="display:inline-block;background:#f5f5f5;color:#333;font-size:10px;font-weight:600;padding:3px 10px;border-radius:10px;margin-right:5px;margin-bottom:4px;">' + escHtml(c.services_match[sv]) + '</span>';
      }
    }
    h += '</div>';

    // Evidence/Source links (new)
    var evidenceUrls = c.evidence_urls || [];
    if (evidenceUrls.length > 0) {
      h += '<div style="padding:0 20px 14px;border-top:1px solid #f0f0f0;margin-top:2px;padding-top:10px;">';
      h += '<div style="font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Sources</div>';
      for (var eu = 0; eu < evidenceUrls.length; eu++) {
        var ev = evidenceUrls[eu];
        var evUrl = ev.url || '';
        var evTitle = ev.title || evUrl;
        if (evUrl) {
          h += '<a href="' + escHtml(evUrl) + '" style="display:block;font-size:11px;color:#E47300;text-decoration:none;line-height:1.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(evTitle) + ' &#8594;</a>';
        }
      }
      h += '</div>';
    }

    h += '</div>';
  }
  h += '</div>';

  // === F. PIPELINE HEALTH ===
  if (ps) {
    h += '<div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #eee;">';
    h += '<div style="font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">Pipeline Health</div>';
    h += '<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border:1px solid #eee;">';
    h += '<tr>';
    h += '<td style="padding:14px 16px;text-align:center;width:33%;border-right:1px solid #eee;">';
    h += '<div style="font-size:24px;font-weight:800;color:#E47300;">' + (ps.awaiting_review || 0) + '</div>';
    h += '<div style="font-size:10px;color:#888;margin-top:2px;">Awaiting Review</div></td>';
    h += '<td style="padding:14px 16px;text-align:center;width:33%;border-right:1px solid #eee;">';
    h += '<div style="font-size:24px;font-weight:800;color:#000;">' + (ps.contacts_pending || 0) + '</div>';
    h += '<div style="font-size:10px;color:#888;margin-top:2px;">Contacts Pending</div></td>';
    h += '<td style="padding:14px 16px;text-align:center;width:33%;">';
    h += '<div style="font-size:24px;font-weight:800;color:#000;">' + (ps.drafts_pending || 0) + '</div>';
    h += '<div style="font-size:10px;color:#888;margin-top:2px;">Drafts Ready</div></td>';
    h += '</tr></table>';
    // Second row: sent, replies, response rate
    if (ps.emails_sent > 0 || ps.replies > 0) {
      h += '<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border:1px solid #eee;margin-top:8px;">';
      h += '<tr>';
      h += '<td style="padding:12px 16px;text-align:center;width:33%;border-right:1px solid #eee;">';
      h += '<div style="font-size:20px;font-weight:800;color:#000;">' + (ps.emails_sent || 0) + '</div>';
      h += '<div style="font-size:10px;color:#888;margin-top:2px;">Emails Sent</div></td>';
      h += '<td style="padding:12px 16px;text-align:center;width:33%;border-right:1px solid #eee;">';
      h += '<div style="font-size:20px;font-weight:800;color:#2E7D32;">' + (ps.replies || 0) + '</div>';
      h += '<div style="font-size:10px;color:#888;margin-top:2px;">Replies</div></td>';
      h += '<td style="padding:12px 16px;text-align:center;width:33%;">';
      h += '<div style="font-size:20px;font-weight:800;color:#000;">' + escHtml(ps.response_rate || 'N/A') + '</div>';
      h += '<div style="font-size:10px;color:#888;margin-top:2px;">Response Rate</div></td>';
      h += '</tr></table>';
    }
    h += '</div>';
  }

  // === G. ACTION BAR ===
  h += '<div style="background:#000;padding:20px 32px;">';
  h += '<table width="100%" cellpadding="0" cellspacing="0"><tr><td>';
  h += '<div style="font-size:10px;font-weight:700;color:#E47300;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Next Steps</div>';
  h += '<div style="font-size:13px;color:#ccc;line-height:1.8;">';
  var stepNum = 1;
  if (companies.length > 0) {
    h += '<span style="color:#E47300;font-weight:700;">' + stepNum + '.</span> Review ' + companies.length + ' new compan' + (companies.length !== 1 ? 'ies' : 'y') + ' in the dashboard<br>';
    stepNum++;
  }
  if (ps && ps.awaiting_review > 0 && ps.awaiting_review > companies.length) {
    h += '<span style="color:#E47300;font-weight:700;">' + stepNum + '.</span> ' + ps.awaiting_review + ' total companies awaiting approval<br>';
    stepNum++;
  }
  if (ps && ps.drafts_pending > 0) {
    h += '<span style="color:#E47300;font-weight:700;">' + stepNum + '.</span> ' + ps.drafts_pending + ' outreach draft' + (ps.drafts_pending !== 1 ? 's' : '') + ' ready to approve<br>';
    stepNum++;
  }
  if (stepNum === 1) {
    h += 'Review today\'s opportunities in the dashboard';
  }
  h += '</div></td>';
  h += '<td style="text-align:right;vertical-align:middle;width:140px;">';
  h += '<a href="' + dashboardUrl + '" style="display:inline-block;background:#E47300;color:#000;font-size:12px;font-weight:700;padding:10px 20px;border-radius:6px;text-decoration:none;">Open Dashboard &#8594;</a>';
  h += '</td></tr></table>';
  h += '</div>';

  // === H. WEEK CONTEXT ===
  if (rc) {
    h += '<div style="background:#e8e8e8;padding:10px 32px;">';
    h += '<span style="font-size:11px;color:#666;">';
    h += 'Run #' + (rc.run_number || '?') + ' this week';
    h += ' &middot; ' + (rc.companies_this_week || 0) + ' companies researched';
    if (rc.sector_schedule) {
      h += ' &middot; ' + escHtml(rc.sector_schedule);
    }
    h += '</span></div>';
  }

  // === ERRORS ===
  if (errors.length > 0) {
    h += '<div style="background:#FFECD8;padding:12px 32px;border-left:4px solid #E47300;">';
    h += '<div style="font-size:10px;font-weight:700;color:#E47300;margin-bottom:6px;">ISSUES DURING THIS RUN</div>';
    for (var e = 0; e < errors.length; e++) {
      h += '<div style="font-size:12px;color:#666;">' + escHtml(errors[e]) + '</div>';
    }
    h += '</div>';
  }

  // === I. FOOTER ===
  var forwardSubject = encodeURIComponent(subject || 'hrmny Morning Brief');
  var forwardBody = encodeURIComponent('Forwarding today\'s hrmny sales brief. View the full pipeline: ' + dashboardUrl);
  h += '<div style="background:#000000;padding:16px 32px;border-top:2px solid #E47300;">';
  h += '<table width="100%" cellpadding="0" cellspacing="0"><tr>';
  if (LOGO_URL) {
    h += '<td><img src="' + LOGO_URL + '" alt="hrmny" style="height:16px;width:auto;opacity:0.5;" /></td>';
  } else {
    h += '<td><span style="color:#555;font-size:11px;font-weight:700;letter-spacing:1px;">hrmny</span></td>';
  }
  h += '<td style="text-align:center;">';
  h += '<a href="mailto:?subject=' + forwardSubject + '&body=' + forwardBody + '" style="color:#888;font-size:11px;text-decoration:none;">Forward this brief &#8594;</a>';
  h += '</td>';
  h += '<td style="text-align:right;"><a href="' + dashboardUrl + '" style="color:#E47300;font-size:11px;text-decoration:none;">Open Dashboard</a></td>';
  h += '</tr></table></div>';

  h += '</div>';
  return h;
}

// --- Migration: V1 (3 tabs) → V2 (2 tabs) ---

function migrateToV2() {
  var ss = getSpreadsheet();

  var leadsSheet = ss.getSheetByName('Leads');
  var contactsSheet = ss.getSheetByName('Contacts');
  var outreachSheet = ss.getSheetByName('Outreach');

  if (!leadsSheet && !contactsSheet && !outreachSheet) {
    return { success: false, error: 'No old tabs (Leads, Contacts, Outreach) found to migrate' };
  }

  // Read old data
  var leadsData = leadsSheet ? leadsSheet.getDataRange().getValues() : [[]];
  var contactsData = contactsSheet ? contactsSheet.getDataRange().getValues() : [[]];
  var oldOutreachData = outreachSheet ? outreachSheet.getDataRange().getValues() : [[]];

  // Status mapping for companies
  var statusToStage = {
    'Researched': 'Researched',
    'Contacts Found': 'Contacts Found',
    'Outreach Drafted': 'Outreach Ready',
    'Contacted': 'Sent',
    'Connected': 'Connected'
  };

  // Outreach status mapping for contacts
  var outreachStatusToContactStage = {
    'Not Contacted': 'Contact Found',
    'LinkedIn Sent': 'Contact Approved',
    'Email Sent': 'Contact Approved',
    'Replied': 'Contact Approved',
    'Meeting': 'Contact Approved'
  };

  // Old outreach status mapping
  var oldStatusToEmailStage = {
    'Drafted': 'Drafted',
    'Approved': 'Approved',
    'Draft Created': 'Draft Created',
    'Sent': 'Sent',
    'Replied': 'Replied',
    'No Response': 'No Response',
    'Send Failed': 'Send Failed'
  };

  // 1. Migrate Companies
  var newCompaniesData = [];
  for (var i = 1; i < leadsData.length; i++) {
    var lr = leadsData[i];
    if (!lr[0] || lr[0].toString().trim() === '') continue;

    var oldStatus = lr[3] || 'Researched';
    var newStage = statusToStage[oldStatus] || 'Researched';

    newCompaniesData.push([
      lr[0],             // Company
      lr[1],             // Sector
      lr[2],             // ICP Fit
      lr[6] || lr[14] || '', // Why This Company (from Outreach Angle or Notes)
      lr[4],             // Services Match (was Services Needed)
      lr[5],             // Est. Value
      lr[6],             // Outreach Angle
      lr[8],             // Evidence/Sources
      lr[7],             // Lead Source
      newStage,          // Stage
      '',                // Feedback
      lr[9],             // Asana Task ID
      lr[12],            // Date Added
      lr[13]             // Date Updated
    ]);
  }

  // 2. Migrate Outreach (merge contacts + old outreach rows)
  var newOutreachData = [];
  for (var i = 1; i < contactsData.length; i++) {
    var cr = contactsData[i];
    if (!cr[0] || cr[0].toString().trim() === '') continue;

    var company = cr[0];
    var contactName = cr[1];
    var oldOutreachStatus = cr[9] || 'Not Contacted';
    var contactStage = outreachStatusToContactStage[oldOutreachStatus] || 'Contact Found';

    // Find matching outreach rows (email, LI connection, LI follow-up)
    var emailSubject = '', emailBody = '', emailStage = '', emailDateSent = '', emailResponseDate = '', emailResponseSummary = '';
    var liConnMsg = '', liConnStage = '';
    var liFollowUpMsg = '', liFollowUpStage = '';
    var followUpDue = '';

    for (var j = 1; j < oldOutreachData.length; j++) {
      var or = oldOutreachData[j];
      if (or[0].toString().toLowerCase() === company.toString().toLowerCase() &&
          or[1].toString().toLowerCase() === contactName.toString().toLowerCase()) {
        var channel = or[2];
        var oldStatus = or[6] || 'Drafted';
        var mappedStage = oldStatusToEmailStage[oldStatus] || 'Drafted';

        if (channel === 'Email') {
          emailSubject = or[3];
          emailBody = or[4];
          emailStage = mappedStage;
          emailDateSent = or[8] || '';
          emailResponseDate = or[10] || '';
          emailResponseSummary = or[11] || '';
          followUpDue = or[12] || '';
        } else if (channel === 'LinkedIn Connection') {
          liConnMsg = or[4];
          liConnStage = mappedStage;
        } else if (channel === 'LinkedIn Follow-up') {
          liFollowUpMsg = or[4];
          liFollowUpStage = mappedStage;
        }
      }
    }

    newOutreachData.push([
      company,           // A: Company
      contactName,       // B: Contact Name
      cr[2],             // C: Title
      cr[3],             // D: Email
      cr[4],             // E: Email Status
      cr[5],             // F: LinkedIn URL
      cr[7],             // G: Seniority
      cr[8],             // H: Why This Contact
      contactStage,      // I: Contact Stage
      '',                // J: Feedback
      emailSubject,      // K: Email Subject
      emailBody,         // L: Email Body
      emailStage,        // M: Email Stage
      emailDateSent,     // N: Email Date Sent
      emailResponseDate, // O: Email Response Date
      emailResponseSummary, // P: Email Response Summary
      liConnMsg,         // Q: LI Connection Message
      liConnStage,       // R: LI Connection Stage
      liFollowUpMsg,     // S: LI Follow-up Message
      liFollowUpStage,   // T: LI Follow-up Stage
      followUpDue,       // U: Follow-up Due
      cr[10]             // V: Date Added
    ]);
  }

  // 3. Archive old tabs
  if (leadsSheet) leadsSheet.setName('Leads_Archive');
  if (contactsSheet) contactsSheet.setName('Contacts_Archive');
  if (outreachSheet) outreachSheet.setName('Outreach_Archive');

  // 4. Create new tabs
  setupCompaniesTab(ss);
  setupOutreachTab(ss);

  // 5. Write migrated data
  var companiesSheet = ss.getSheetByName(SHEET_NAMES.companies);
  if (newCompaniesData.length > 0) {
    companiesSheet.getRange(2, 1, newCompaniesData.length, COMPANIES_HEADERS.length).setValues(newCompaniesData);
  }

  var newOutreachSheet = ss.getSheetByName(SHEET_NAMES.outreach);
  if (newOutreachData.length > 0) {
    newOutreachSheet.getRange(2, 1, newOutreachData.length, OUTREACH_HEADERS.length).setValues(newOutreachData);
  }

  // 6. Rebuild dashboard
  createDashboardTab(ss);

  logAction('migration', 'V2 migration complete. ' + newCompaniesData.length + ' companies, ' + newOutreachData.length + ' contacts migrated. Old tabs archived.');

  return {
    success: true,
    message: 'Migration complete',
    companies_migrated: newCompaniesData.length,
    contacts_migrated: newOutreachData.length
  };
}

// --- Utility Functions ---

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  var monthIdx = parseInt(parts[1], 10) - 1;
  var day = parseInt(parts[2], 10);
  if (monthIdx >= 0 && monthIdx < 12) {
    return months[monthIdx] + ' ' + day;
  }
  return dateStr;
}

function escHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
