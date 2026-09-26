/**
 * Roadbook shared ledger and trip-data endpoint.
 * Bind this script to the existing trip spreadsheet before deploying.
 * The public app never contains the spreadsheet ID or invite token.
 */
const SHEET_NAMES = {
  config: 'AppConfig',
  days: 'AppItinerary',
  members: 'AppMembers',
  expenses: 'AppExpenses',
  history: 'AppHistory',
};
const MONEY_POOL_SHEET_NAME = 'Money Pool';

const HEADERS = {
  config: ['key', 'value'],
  days: ['id', 'date', 'json'],
  members: ['id', 'name', 'active', 'createdAt'],
  expenses: ['id', 'date', 'description', 'category', 'amountCents', 'currency', 'payerId', 'beneficiaryIdsJson', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'],
  history: ['id', 'requestId', 'entity', 'entityId', 'action', 'actor', 'at', 'beforeJson', 'afterJson'],
};

/** Run once from the Apps Script editor, then deploy this project as a web app. */
function setupRoadbook() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Set the SPREADSHEET_ID script property to the existing trip spreadsheet ID first.');

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  Object.keys(SHEET_NAMES).forEach(function (key) {
    const name = SHEET_NAMES[key];
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) sheet = spreadsheet.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS[key].length).setValues([HEADERS[key]]);
    sheet.setFrozenRows(1);
  });

  if (!properties.getProperty('INVITE_TOKEN')) {
    const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    properties.setProperty('INVITE_TOKEN', token);
    Logger.log('Copy this private invite token now. Keep it out of the public repository: ' + token);
  }
  organizeRoadbookTabs();
  Logger.log('Roadbook tabs are ready. Existing planning tabs were left untouched.');
}

/** Keep the human review tab near the front and internal App* tabs at the end. */
function organizeRoadbookTabs() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Spreadsheet is not configured.');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const moneyPool = spreadsheet.getSheetByName(MONEY_POOL_SHEET_NAME);
  if (moneyPool) {
    spreadsheet.setActiveSheet(moneyPool);
    spreadsheet.moveActiveSheet(1);
  }
  [SHEET_NAMES.config, SHEET_NAMES.days, SHEET_NAMES.members, SHEET_NAMES.expenses, SHEET_NAMES.history].forEach(function (name) {
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet) return;
    spreadsheet.setActiveSheet(sheet);
    spreadsheet.moveActiveSheet(spreadsheet.getNumSheets());
  });
  SpreadsheetApp.flush();
}

/**
 * Import rows from the existing Money Pool tab into AppExpenses once. The
 * read path also includes the source tab, so this is optional for display but
 * keeps the two spreadsheet views physically aligned for future edits.
 */
function syncMoneyPoolLedger() {
  const imported = syncMoneyPoolToAppExpenses_();
  SpreadsheetApp.flush();
  Logger.log('Imported ' + imported + ' Money Pool transaction(s) into AppExpenses.');
}

function doGet(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  const callback = String(parameters.callback || '');
  const isAuthorized = validToken_(parameters.token);
  const result = isAuthorized
    ? { ok: true, ...readData_() }
    : { ok: false, error: 'Invite link not recognized.' };

  if (!/^RoadbookCallbacks\.cb_[A-Za-z0-9_]+$/.test(callback)) {
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  const body = callback + '(' + JSON.stringify(result) + ');';
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  const response = { ok: false };
  if (!validToken_(parameters.token)) return jsonOutput_({ ok: false, error: 'Invite link not recognized.' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const payload = JSON.parse(String(parameters.payload || '{}'));
    const requestId = String(parameters.requestId || payload.requestId || '').slice(0, 100);
    const actor = cleanText_(parameters.actor || payload.actor || 'Traveler', 48);
    if (!requestId) throw new Error('Missing request ID.');
    if (findHistoryByRequestId_(requestId)) return jsonOutput_({ ok: true, duplicate: true, requestId: requestId });

    const action = String(parameters.action || payload.action || '');
    if (action === 'initialize') initializeTrip_(payload, actor, requestId);
    else if (action === 'create') createExpense_(payload.expense, actor, requestId);
    else if (action === 'update') updateExpense_(payload.expense, actor, requestId);
    else if (action === 'updateDay') updateDay_(payload.day, actor, requestId);
    else if (action === 'delete') deleteExpense_(payload.expenseId, actor, requestId);
    else if (action === 'addMember') addMember_(payload.member, actor, requestId);
    else if (action === 'removeMember') removeMember_(payload.memberId, actor, requestId);
    else throw new Error('Unknown action.');

    SpreadsheetApp.flush();
    return jsonOutput_({ ok: true, requestId: requestId });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error && error.message ? error.message : 'The change could not be saved.' });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function initializeTrip_(payload, actor, requestId) {
  const source = payload.source || {};
  const trip = source.trip;
  const members = Array.isArray(source.members) ? source.members : [];
  if (!trip || !trip.id || !trip.title || !members.length) throw new Error('The trip plan is incomplete.');
  if (configValue_('trip_json')) throw new Error('This shared spreadsheet already has a trip.');

  const tripWithoutDays = Object.assign({}, trip);
  const days = Array.isArray(tripWithoutDays.days) ? tripWithoutDays.days : [];
  delete tripWithoutDays.days;
  if (!days.length) throw new Error('The trip plan has no itinerary dates.');

  setConfigValue_('trip_json', JSON.stringify(tripWithoutDays));
  const daySheet = sheet_(SHEET_NAMES.days);
  const dayRows = days.map(function (day) { return [String(day.id), String(day.date), JSON.stringify(day)]; });
  if (dayRows.length) daySheet.getRange(2, 1, dayRows.length, HEADERS.days.length).setValues(dayRows);

  const memberSheet = sheet_(SHEET_NAMES.members);
  const memberRows = members.map(function (member) {
    return [cleanText_(member.id, 80), cleanText_(member.name, 48), true, new Date().toISOString()];
  });
  memberSheet.getRange(2, 1, memberRows.length, HEADERS.members.length).setValues(memberRows);
  appendHistory_({ requestId: requestId, entity: 'trip', entityId: trip.id, action: 'initialized', actor: actor, before: null, after: { title: trip.title, days: days.length, members: members.length } });
}

function createExpense_(rawExpense, actor, requestId) {
  const expense = normalizeExpense_(rawExpense);
  if (findExpenseRow_(expense.id)) throw new Error('That expense ID already exists.');
  if (findMoneyPoolTransactionRow_(expense.id)) throw new Error('That expense ID already exists in the Money Pool tab.');
  const now = new Date().toISOString();
  expense.createdAt = now;
  expense.createdBy = actor;
  sheet_(SHEET_NAMES.expenses).appendRow(expenseRow_(expense));
  appendMoneyPoolExpense_(expense);
  appendHistory_({ requestId: requestId, entity: 'expense', entityId: expense.id, action: 'created', actor: actor, before: null, after: expense });
}

function updateExpense_(rawExpense, actor, requestId) {
  const expense = normalizeExpense_(rawExpense);
  const rowNumber = findExpenseRow_(expense.id);
  const moneyPoolRow = findMoneyPoolTransactionRow_(expense.id);
  const before = readExpenses_().find(function (item) { return item.id === expense.id; });
  if (!before || (!rowNumber && !moneyPoolRow)) throw new Error('This expense no longer exists. Refresh the ledger and try again.');
  expense.createdAt = before.createdAt;
  expense.createdBy = before.createdBy;
  expense.updatedAt = new Date().toISOString();
  expense.updatedBy = actor;
  if (rowNumber) {
    const sheet = sheet_(SHEET_NAMES.expenses);
    sheet.getRange(rowNumber, 1, 1, HEADERS.expenses.length).setValues([expenseRow_(expense)]);
  } else {
    sheet_(SHEET_NAMES.expenses).appendRow(expenseRow_(expense));
  }
  if (moneyPoolRow) updateMoneyPoolExpense_(moneyPoolRow, expense);
  else appendMoneyPoolExpense_(expense);
  appendHistory_({ requestId: requestId, entity: 'expense', entityId: expense.id, action: 'edited', actor: actor, before: before, after: expense });
}

function updateDay_(rawDay, actor, requestId) {
  const dayId = cleanText_(rawDay && rawDay.id, 80);
  const sheet = sheet_(SHEET_NAMES.days);
  const rowNumber = findRowByValue_(sheet, 1, dayId);
  if (!rowNumber) throw new Error('This itinerary day no longer exists. Refresh the trip and try again.');
  const before = JSON.parse(String(sheet.getRange(rowNumber, 3).getValue() || '{}'));
  if (!before || before.id !== dayId) throw new Error('This itinerary day could not be read. Refresh the trip and try again.');

  const title = cleanText_(rawDay && rawDay.title, 120);
  const drive = cleanText_(rawDay && rawDay.drive, 180);
  const plan = Array.isArray(rawDay && rawDay.plan)
    ? rawDay.plan.map(function (item) { return cleanText_(item, 240); }).filter(Boolean).slice(0, 20)
    : [];
  const stay = cleanText_(rawDay && rawDay.stay, 180);
  const stayNote = cleanText_(rawDay && rawDay.stayNote, 600);
  const stayUrl = cleanText_(rawDay && rawDay.stayUrl, 300);
  if (stayUrl && !/^https:\/\/[^\s]+$/i.test(stayUrl)) throw new Error('Lodging links must use HTTPS.');
  const meals = Array.isArray(rawDay && rawDay.meals)
    ? rawDay.meals.slice(0, 8).map(function (meal) {
        const url = cleanText_(meal && meal.url, 300);
        if (url && !/^https:\/\/[^\s]+$/i.test(url)) throw new Error('Meal links must use HTTPS.');
        return {
          label: cleanText_(meal && meal.label, 32),
          suggestion: cleanText_(meal && meal.suggestion, 140),
          detail: cleanText_(meal && meal.detail, 300),
          url: url,
        };
      }).filter(function (meal) { return meal.label && meal.suggestion; })
    : [];
  if (!title || !stay) throw new Error('Add a day title and place to stay.');

  const after = Object.assign({}, before, {
    title: title,
    drive: drive,
    plan: plan,
    stay: stay,
    stayNote: stayNote,
    stayUrl: stayUrl,
    meals: meals,
  });
  sheet.getRange(rowNumber, 3).setValue(JSON.stringify(after));
  appendHistory_({ requestId: requestId, entity: 'itinerary-day', entityId: dayId, action: 'edited', actor: actor, before: before, after: after });
}

function deleteExpense_(expenseId, actor, requestId) {
  const rowNumber = findExpenseRow_(String(expenseId || ''));
  const moneyPoolRow = findMoneyPoolTransactionRow_(String(expenseId || ''));
  const before = readExpenses_().find(function (item) { return item.id === String(expenseId || ''); });
  if (!before || (!rowNumber && !moneyPoolRow)) throw new Error('This expense no longer exists. Refresh the ledger and try again.');
  if (rowNumber) sheet_(SHEET_NAMES.expenses).deleteRow(rowNumber);
  if (moneyPoolRow) deleteMoneyPoolExpense_(moneyPoolRow);
  appendHistory_({ requestId: requestId, entity: 'expense', entityId: before.id, action: 'deleted', actor: actor, before: before, after: null });
}

function addMember_(rawMember, actor, requestId) {
  const member = { id: cleanText_(rawMember && rawMember.id, 80), name: cleanText_(rawMember && rawMember.name, 48) };
  if (!member.id || !member.name) throw new Error('A traveler ID and name are required.');
  const current = readMembers_();
  if (current.some(function (item) { return item.id === member.id || item.name.toLowerCase() === member.name.toLowerCase(); })) throw new Error('That traveler is already in the group.');
  sheet_(SHEET_NAMES.members).appendRow([member.id, member.name, true, new Date().toISOString()]);
  appendHistory_({ requestId: requestId, entity: 'member', entityId: member.id, action: 'added', actor: actor, before: null, after: member });
}

function removeMember_(memberId, actor, requestId) {
  const current = readMembers_();
  const member = current.find(function (item) { return item.id === String(memberId); });
  if (!member) throw new Error('Traveler not found.');
  const expenses = readExpenses_();
  const used = expenses.some(function (expense) { return expense.payerId === member.id || expense.beneficiaryIds.indexOf(member.id) >= 0; });
  if (used) throw new Error('This traveler appears in the ledger. Edit those expenses before removing them.');
  const sheet = sheet_(SHEET_NAMES.members);
  const rowNumber = findRowByValue_(sheet, 1, member.id);
  if (!rowNumber) throw new Error('Traveler not found.');
  sheet.deleteRow(rowNumber);
  appendHistory_({ requestId: requestId, entity: 'member', entityId: member.id, action: 'removed', actor: actor, before: member, after: null });
}

function normalizeExpense_(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Expense details are missing.');
  const expense = {
    id: cleanText_(raw.id, 100),
    date: cleanText_(raw.date, 10),
    description: cleanText_(raw.description, 120),
    category: cleanText_(raw.category, 30),
    amountCents: Number(raw.amountCents),
    currency: String(raw.currency),
    payerId: cleanText_(raw.payerId, 80),
    beneficiaryIds: Array.isArray(raw.beneficiaryIds) ? raw.beneficiaryIds.map(function (id) { return cleanText_(id, 80); }) : [],
    createdAt: String(raw.createdAt || ''),
    createdBy: cleanText_(raw.createdBy || '', 48),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : '',
    updatedBy: cleanText_(raw.updatedBy || '', 48),
  };
  if (!expense.id || !/^\d{4}-\d{2}-\d{2}$/.test(expense.date) || !expense.description) throw new Error('Add a description and valid date.');
  if (!Number.isSafeInteger(expense.amountCents) || expense.amountCents <= 0) throw new Error('Enter a positive amount in cents.');
  if (expense.currency !== 'USD' && expense.currency !== 'HKD') throw new Error('Currency must be USD or HKD.');
  const members = readMembers_();
  if (!members.some(function (member) { return member.id === expense.payerId; })) throw new Error('The payer is not in this trip group.');
  if (!expense.beneficiaryIds.length || expense.beneficiaryIds.some(function (id) { return !members.some(function (member) { return member.id === id; }); })) throw new Error('Choose at least one valid traveler this expense was for.');
  expense.beneficiaryIds = members.filter(function (member) { return expense.beneficiaryIds.indexOf(member.id) >= 0; }).map(function (member) { return member.id; });
  return expense;
}

function readData_() {
  const storedTrip = configValue_('trip_json');
  let trip = null;
  if (storedTrip) {
    trip = JSON.parse(storedTrip);
    trip.days = readDays_();
  }
  return {
    trip: trip,
    members: readMembers_(),
    expenses: readExpenses_(),
    history: readHistory_(),
  };
}

function readDays_() {
  const sheet = sheet_(SHEET_NAMES.days);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.days.length).getValues().map(function (row) { return JSON.parse(String(row[2])); });
}

function readMembers_() {
  const sheet = sheet_(SHEET_NAMES.members);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.members.length).getValues()
    .filter(function (row) { return row[2] !== false && row[2] !== 'FALSE'; })
    .map(function (row) { return { id: String(row[0]), name: String(row[1]) }; });
}

function readExpenses_() {
  const moneyPoolExpenses = readMoneyPoolExpenses_();
  const appExpenses = readAppExpenses_();
  const seenIds = {};
  return moneyPoolExpenses.concat(appExpenses).filter(function (expense) {
    if (!expense.id || seenIds[expense.id]) return false;
    seenIds[expense.id] = true;
    return true;
  });
}

function readAppExpenses_() {
  const sheet = sheet_(SHEET_NAMES.expenses);
  if (sheet.getLastRow() < 2) return [];
  const seenIds = {};
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.expenses.length).getValues()
    .map(expenseFromRow_)
    .filter(function (expense) {
      if (!expense.id || seenIds[expense.id]) return false;
      seenIds[expense.id] = true;
      return true;
    });
}

function readMoneyPoolExpenses_() {
  const sheet = moneyPoolSheet_();
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const headerRow = findMoneyPoolHeaderRow_(values);
  if (headerRow < 0) return [];
  const members = readMembers_();
  const expenses = [];
  for (let index = headerRow + 1; index < values.length; index += 1) {
    const row = values[index];
    const id = cleanText_(row[3], 100);
    const description = cleanText_(row[4], 120);
    const currency = String(row[5] || 'USD').trim().toUpperCase();
    const amount = Number(row[6]);
    const payerName = cleanText_(row[7], 48);
    const paidFor = cleanText_(row[8], 240);
    if (!id || !description || !isFinite(amount) || amount <= 0 || (currency !== 'USD' && currency !== 'HKD')) continue;
    const payer = memberByName_(members, payerName);
    if (!payer) continue;
    const beneficiaryIds = beneficiaryIdsFromLabel_(paidFor, members);
    if (!beneficiaryIds.length) continue;
    const createdAt = moneyPoolTimestamp_(row[9]);
    expenses.push({
      id: id,
      date: expenseDateFromId_(id, createdAt),
      description: description,
      category: categoryFromDescription_(description),
      amountCents: Math.round(amount * 100),
      currency: currency,
      payerId: payer.id,
      beneficiaryIds: beneficiaryIds,
      createdAt: createdAt,
      createdBy: payer.name,
    });
  }
  return expenses;
}

function syncMoneyPoolToAppExpenses_() {
  const appSheet = sheet_(SHEET_NAMES.expenses);
  let imported = 0;
  readMoneyPoolExpenses_().forEach(function (expense) {
    if (!findExpenseRow_(expense.id)) {
      appSheet.appendRow(expenseRow_(expense));
      imported += 1;
    }
  });
  return imported;
}

function moneyPoolSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Spreadsheet is not configured.');
  return SpreadsheetApp.openById(spreadsheetId).getSheetByName(MONEY_POOL_SHEET_NAME);
}

function findMoneyPoolHeaderRow_(values) {
  for (let index = 0; index < values.length; index += 1) {
    if (String(values[index][3] || '').trim().toLowerCase() === 'transaction id') return index;
  }
  return -1;
}

function findMoneyPoolTransactionRow_(id) {
  const sheet = moneyPoolSheet_();
  if (!sheet || !id) return null;
  const values = sheet.getDataRange().getValues();
  const headerRow = findMoneyPoolHeaderRow_(values);
  if (headerRow < 0) return null;
  for (let index = headerRow + 1; index < values.length; index += 1) {
    if (String(values[index][3] || '').trim() === String(id)) return index + 1;
  }
  return null;
}

function appendMoneyPoolExpense_(expense) {
  const sheet = moneyPoolSheet_();
  if (!sheet || findMoneyPoolTransactionRow_(expense.id)) return;
  const values = sheet.getDataRange().getValues();
  const headerRow = findMoneyPoolHeaderRow_(values);
  if (headerRow < 0) return;
  let lastTransactionRow = headerRow + 1;
  for (let index = headerRow + 1; index < values.length; index += 1) {
    if (String(values[index][3] || '').trim()) lastTransactionRow = index + 1;
  }
  const rowNumber = lastTransactionRow + 1;
  sheet.getRange(rowNumber, 4, 1, 7).setValues([[
    expense.id,
    expense.description,
    expense.currency,
    expense.amountCents / 100,
    memberName_(expense.payerId),
    paidForLabel_(expense.beneficiaryIds),
    new Date(expense.createdAt || new Date().toISOString()),
  ]]);
}

function updateMoneyPoolExpense_(rowNumber, expense) {
  const sheet = moneyPoolSheet_();
  if (!sheet || !rowNumber) return;
  sheet.getRange(rowNumber, 4, 1, 7).setValues([[
    expense.id,
    expense.description,
    expense.currency,
    expense.amountCents / 100,
    memberName_(expense.payerId),
    paidForLabel_(expense.beneficiaryIds),
    new Date(expense.createdAt || new Date().toISOString()),
  ]]);
}

function deleteMoneyPoolExpense_(rowNumber) {
  const sheet = moneyPoolSheet_();
  if (sheet && rowNumber) sheet.deleteRow(rowNumber);
}

function memberByName_(members, name) {
  const value = String(name || '').trim().toLowerCase();
  return members.find(function (member) { return member.id.toLowerCase() === value || member.name.toLowerCase() === value; }) || null;
}

function memberName_(memberId) {
  const member = readMembers_().find(function (item) { return item.id === String(memberId); });
  return member ? member.name : String(memberId);
}

function beneficiaryIdsFromLabel_(label, members) {
  const value = String(label || '').trim();
  if (!value || /^(all|everyone)$/i.test(value)) return members.map(function (member) { return member.id; });
  const names = value.split(/,|;|\band\b/i).map(function (part) { return part.trim().toLowerCase(); }).filter(Boolean);
  return members.filter(function (member) { return names.indexOf(member.id.toLowerCase()) >= 0 || names.indexOf(member.name.toLowerCase()) >= 0; }).map(function (member) { return member.id; });
}

function paidForLabel_(beneficiaryIds) {
  const members = readMembers_();
  if (members.length && members.every(function (member) { return beneficiaryIds.indexOf(member.id) >= 0; })) return 'All';
  return members.filter(function (member) { return beneficiaryIds.indexOf(member.id) >= 0; }).map(function (member) { return member.name; }).join(', ');
}

function moneyPoolTimestamp_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  const text = String(value || '').trim();
  const parsed = Date.parse(text);
  return isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function expenseDateFromId_(id, createdAt) {
  const match = String(id).match(/(20\d{2}-\d{2}-\d{2})$/);
  if (match) return match[1];
  return String(createdAt).slice(0, 10);
}

function categoryFromDescription_(description) {
  if (/airbnb|hotel|lodging|stay/i.test(description)) return 'Lodging';
  if (/flight|airline|taxi|uber|lyft|fuel|gas|parking|rental|transport/i.test(description)) return 'Transport';
  if (/lunch|dinner|breakfast|meal|restaurant|food|coffee/i.test(description)) return 'Meals';
  if (/ticket|museum|tour|park|activity/i.test(description)) return 'Activities';
  return 'Other';
}

/**
 * Run this once from the Apps Script editor if the AppExpenses tab already
 * contains duplicate rows. It removes only repeated transaction IDs, keeping
 * the first row. Different transactions with identical amounts and labels are
 * intentionally preserved.
 */
function repairExpenseDuplicates() {
  const sheet = sheet_(SHEET_NAMES.expenses);
  if (sheet.getLastRow() < 2) return;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.expenses.length).getValues();
  const seenIds = {};
  const duplicateRows = [];
  rows.forEach(function (row, index) {
    const expense = expenseFromRow_(row);
    const duplicate = !expense.id || seenIds[expense.id];
    if (duplicate) duplicateRows.push(index + 2);
    else seenIds[expense.id] = true;
  });
  for (let index = duplicateRows.length - 1; index >= 0; index -= 1) sheet.deleteRow(duplicateRows[index]);
  SpreadsheetApp.flush();
  Logger.log('Removed ' + duplicateRows.length + ' duplicate expense row(s).');
}

function readHistory_() {
  const sheet = sheet_(SHEET_NAMES.history);
  if (sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.history.length).getValues();
  return rows.slice(-150).reverse().map(historyFromRow_);
}

function expenseFromRow_(row) {
  return {
    id: String(row[0]), date: String(row[1]), description: String(row[2]), category: String(row[3]), amountCents: Number(row[4]),
    currency: String(row[5]), payerId: String(row[6]), beneficiaryIds: JSON.parse(String(row[7] || '[]')),
    createdAt: String(row[8]), createdBy: String(row[9]), updatedAt: row[10] ? String(row[10]) : undefined, updatedBy: row[11] ? String(row[11]) : undefined,
  };
}

function expenseRow_(expense) {
  return [expense.id, expense.date, expense.description, expense.category, expense.amountCents, expense.currency, expense.payerId, JSON.stringify(expense.beneficiaryIds), expense.createdAt, expense.createdBy, expense.updatedAt || '', expense.updatedBy || ''];
}

function historyFromRow_(row) {
  return { id: String(row[0]), requestId: String(row[1]), entity: String(row[2]), entityId: String(row[3]), action: String(row[4]), actor: String(row[5]), at: String(row[6]), before: row[7] ? JSON.parse(String(row[7])) : undefined, after: row[8] ? JSON.parse(String(row[8])) : undefined };
}

function appendHistory_(entry) {
  const sheet = sheet_(SHEET_NAMES.history);
  sheet.appendRow([Utilities.getUuid(), entry.requestId, entry.entity, entry.entityId, entry.action, entry.actor, new Date().toISOString(), entry.before ? JSON.stringify(entry.before) : '', entry.after ? JSON.stringify(entry.after) : '']);
  if (sheet.getLastRow() > 501) sheet.deleteRows(2, sheet.getLastRow() - 501);
}

function findHistoryByRequestId_(requestId) {
  const sheet = sheet_(SHEET_NAMES.history);
  if (sheet.getLastRow() < 2) return null;
  const match = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).createTextFinder(requestId).matchEntireCell(true).findNext();
  return match ? match.getRow() : null;
}

function findExpenseRow_(id) { return findRowByValue_(sheet_(SHEET_NAMES.expenses), 1, id); }

function findRowByValue_(sheet, column, value) {
  if (sheet.getLastRow() < 2 || !value) return null;
  const match = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).createTextFinder(String(value)).matchEntireCell(true).findNext();
  return match ? match.getRow() : null;
}

function configValue_(key) {
  const sheet = sheet_(SHEET_NAMES.config);
  if (sheet.getLastRow() < 2) return '';
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const row = rows.find(function (entry) { return String(entry[0]) === key; });
  return row ? String(row[1]) : '';
}

function setConfigValue_(key, value) {
  const sheet = sheet_(SHEET_NAMES.config);
  const row = findRowByValue_(sheet, 1, key);
  if (row) sheet.getRange(row, 2).setValue(value);
  else sheet.appendRow([key, value]);
}

function sheet_(name) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Spreadsheet is not configured.');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error('Run setupRoadbook() before using the web app.');
  return sheet;
}

function validToken_(provided) {
  const expected = PropertiesService.getScriptProperties().getProperty('INVITE_TOKEN') || '';
  const value = String(provided || '');
  if (!expected || value.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ value.charCodeAt(index);
  return difference === 0;
}

function cleanText_(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
