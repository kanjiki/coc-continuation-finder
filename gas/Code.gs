const SPREADSHEET_ID = '1O6zm-V9g_CKrjd3I5Ol9aysQFgtzrNoq70OuYRQ9tmQ';
const SHEET_NAME = 'Requests';

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.parameter && e.parameter.payload) || '{}');
    if (payload.action !== 'candidateRequest') throw new Error('Unknown action');

    const data = payload.data || {};
    const source = clean_(data.source, 160);
    const candidate = clean_(data.candidate, 160);
    const mode = data.mode === 'test' ? '友人テスト' : '通常版';

    if (!source || !candidate) throw new Error('Missing required field');

    // 同じ組み合わせの連打だけ軽く抑止する。個人識別情報は保存しない。
    const duplicateKey = Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, source + '\n' + candidate)
    ).slice(0, 48);
    const cache = CacheService.getScriptCache();
    if (cache.get(duplicateKey)) return text_('OK');
    cache.put(duplicateKey, '1', 60);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      if (!sheet) throw new Error('Requests sheet not found');
      sheet.appendRow([new Date(), safeCell_(source), safeCell_(candidate), mode, '', '']);
    } finally {
      lock.releaseLock();
    }

    return text_('OK');
  } catch (err) {
    console.error(err);
    return text_('ERROR');
  }
}

function clean_(value, max) {
  return String(value || '')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// 公開フォーム由来の文字列が数式として解釈されないようにする。
function safeCell_(value) {
  const s = String(value || '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function text_(value) {
  return ContentService.createTextOutput(value)
    .setMimeType(ContentService.MimeType.TEXT);
}
