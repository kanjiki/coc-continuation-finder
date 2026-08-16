const SPREADSHEET_ID = '1O6zm-V9g_CKrjd3I5Ol9aysQFgtzrNoq70OuYRQ9tmQ';
const REQUEST_SHEET_NAME = 'Requests';
const FEEDBACK_SHEET_NAME = 'RecommendationFeedback';
const PUBLIC_STATUS = '公開OK';

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || '');
    if (action !== 'siteSync') return text_('ERROR');
    return ContentService.createTextOutput(buildSiteSyncJs_())
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput('window.COC_SHEET_SYNC={sources:[],edges:[],error:true};')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

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
  const scope = normalizeScope_(data.scope);
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
    // A:H。H列へユーザー指定の継続形態を保存する。未指定なら空欄。
    sheet.appendRow([
      new Date(),
      safeCell_(source),
      safeCell_(candidate),
      mode,
      '要確認',
      '',
      '',
      scope
    ]);
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

function buildSiteSyncJs_() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(REQUEST_SHEET_NAME);
  if (!sheet) throw new Error('Requests sheet not found');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'window.COC_SHEET_SYNC={sources:[],edges:[],generatedAt:"' + new Date().toISOString() + '"};';

  // A:N
  const rows = sheet.getRange(2, 1, lastRow - 1, 14).getDisplayValues();
  const edgeMap = {};
  const sourceSet = {};

  rows.forEach(function(row) {
    const source = clean_(row[1], 160);
    const target = clean_(row[2], 160);
    const status = clean_(row[4], 40);
    if (!source || !target || status !== PUBLIC_STATUS) return;

    const memo = clean_(row[5], 500);
    const publicType = clean_(row[6], 20) || '推薦';
    const explicitScope = clean_(row[7], 80);
    const evidence = clean_(row[8], 80) || '利用者提供・確認済み';
    const reason = clean_(row[9], 300) || '利用者から寄せられ、確認済みの継続候補です。';
    const scope = inferScope_(explicitScope, memo, reason);
    const markets = [];
    const market1 = clean_(row[10], 40);
    const url1 = safeHttpUrl_(row[11]);
    const market2 = clean_(row[12], 40);
    const url2 = safeHttpUrl_(row[13]);
    if (market1 && url1) markets.push([market1, url1]);
    if (market2 && url2) markets.push([market2, url2]);

    sourceSet[source] = true;
    edgeMap[source + '\u0000' + target] = {
      s: source,
      t: target,
      c: scope,
      e: evidence,
      r: reason,
      st: publicType === '注意' ? '注意' : '推薦',
      d: markets
    };
  });

  const sources = Object.keys(sourceSet).sort().map(function(name) { return { n: name }; });
  const edges = Object.keys(edgeMap).sort().map(function(key) { return edgeMap[key]; });
  const payload = {
    sources: sources,
    edges: edges,
    generatedAt: new Date().toISOString()
  };
  return 'window.COC_SHEET_SYNC=' + JSON.stringify(payload) + ';';
}

function normalizeScope_(value) {
  const s = clean_(value, 80);
  if (!s || /^(指定なし|不明|未設定|問わない)$/.test(s)) return '';
  if (/1人|一人|ソロ|HO単位|片ロス/.test(s)) return '1人・HO単位';
  if (/タイマン|KPC|PC|ペア|2人|二人|ふたり/.test(s)) return 'ペア';
  if (/自陣全員|複数人|複数|全員|グループ|3人|三人|4人|四人|5人|五人|6人|六人/.test(s)) return '自陣全員・複数人';
  return s;
}

function inferScope_(explicitScope, memo, reason) {
  const explicit = normalizeScope_(explicitScope);
  if (explicit) return explicit;

  const text = clean_([memo, reason].filter(Boolean).join(' '), 800);
  if (!text) return '指定なし';

  // より限定的な表現を先に評価する。
  if (/片ロス|1人|一人|ソロ|HO単位/.test(text)) return '1人・HO単位';
  if (/HO\d+KPC|KPC|\/PC|／PC|タイマン|ペア|2人|二人|ふたり/.test(text)) return 'ペア';
  if (/自陣全員|複数人|複数|全員|グループ|3人|三人|4人|四人|5人|五人|6人|六人/.test(text)) return '自陣全員・複数人';
  return '指定なし';
}

function safeHttpUrl_(value) {
  const s = String(value || '').trim();
  return /^https:\/\//i.test(s) ? s.slice(0, 500) : '';
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
