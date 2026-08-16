const SPREADSHEET_ID = '1O6zm-V9g_CKrjd3I5Ol9aysQFgtzrNoq70OuYRQ9tmQ';
const REQUEST_SHEET_NAME = 'Requests';
const FEEDBACK_SHEET_NAME = 'RecommendationFeedback';

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.parameter && e.parameter.payload) || '{}');
    if (payload.action === 'candidateRequest') {
      saveCandidateRequest_(payload.data || {});
    } else if (payload.action === 'recommendationFeedback') {
      saveRecommendationFeedback_(payload.data || {});
    } else {
      throw new Error('Unknown action');
    }
    return text_('OK');
  } catch (err) {
    console.error(err);
    return text_('ERROR');
  }
}

function saveCandidateRequest_(data) {
  const source = clean_(data.source, 160);
  const candidate = clean_(data.candidate, 160);
  const mode = data.mode === 'test' ? '友人テスト' : '通常版';
  if (!source || !candidate) throw new Error('Missing required field');

  const duplicateKey = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source + '\n' + candidate)
  ).slice(0, 48);
  const cache = CacheService.getScriptCache();
  if (cache.get(duplicateKey)) return;
  cache.put(duplicateKey, '1', 60);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(REQUEST_SHEET_NAME);
    if (!sheet) throw new Error('Requests sheet not found');
    sheet.appendRow([new Date(), safeCell_(source), safeCell_(candidate), mode, '', '']);
  } finally {
    lock.releaseLock();
  }
}

function saveRecommendationFeedback_(data) {
  const source = clean_(data.source, 160);
  const target = clean_(data.target, 160);
  const verdict = String(data.verdict || '').trim();
  const mode = data.mode === 'test' ? '友人テスト' : '通常版';
  if (!source || !target) throw new Error('Missing required field');
  if (verdict !== 'fit' && verdict !== 'doubt') throw new Error('Invalid verdict');

  const label = verdict === 'fit' ? 'しっくりくる' : '違うかも';
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FEEDBACK_SHEET_NAME);
    if (!sheet) throw new Error('RecommendationFeedback sheet not found');
    sheet.appendRow([new Date(), safeCell_(source), safeCell_(target), label, mode, '']);
  } finally {
    lock.releaseLock();
  }
}

function clean_(value, max) {
  return String(value || '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function safeCell_(value) {
  const s = String(value || '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function text_(value) {
  return ContentService.createTextOutput(value)
    .setMimeType(ContentService.MimeType.TEXT);
}
