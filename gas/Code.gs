const SPREADSHEET_ID = '1O6zm-V9g_CKrjd3I5Ol9aysQFgtzrNoq70OuYRQ9tmQ';
const SHEET_NAME = 'Requests';
const ALLOWED_SOURCES = [
  'VOID',
  '庭師は何を口遊む',
  '四季送り',
  'ソープスクール',
  '彼方からの君に捧ぐ',
  'かいぶつたちとマホラカルト',
  '誰がロックを殺すのか',
  '蹂躙するは我が手にて',
  '海も枯れるまで',
  'ドロップアウトディスパイア',
  '片鱗',
  'プルガトリウムの夜',
  '嗤う人間師',
  'キルキルイキル',
  '口渇ルルパ',
  'ロトカ・ヴォルテラの愛堕討ち',
  'ようこそ！迷冥市役所都市伝説課へ！',
  'エンジェル・デビル・インプロパー',
  '同居人',
  '沼男は誰だ？'
];

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.parameter && e.parameter.payload) || '{}');
    if (payload.action !== 'candidateRequest') throw new Error('Unknown action');

    const data = payload.data || {};
    const source = clean_(data.source, 160);
    const candidate = clean_(data.candidate, 160);
    const mode = data.mode === 'test' ? '友人テスト' : '通常版';

    if (!source || !candidate) throw new Error('Missing required field');
    if (ALLOWED_SOURCES.indexOf(source) < 0) throw new Error('Unknown source scenario');

    // 同じ内容の連打だけ軽く抑止する。個人識別情報は保存しない。
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
      sheet.appendRow([new Date(), source, candidate, mode, '', '']);
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

function text_(value) {
  return ContentService.createTextOutput(value)
    .setMimeType(ContentService.MimeType.TEXT);
}
