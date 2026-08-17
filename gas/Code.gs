const SPREADSHEET_ID = '1O6zm-V9g_CKrjd3I5Ol9aysQFgtzrNoq70OuYRQ9tmQ';
const REQUEST_SHEET_NAME = 'Requests';
const FEEDBACK_SHEET_NAME = 'RecommendationFeedback';
const USAGE_SHEET_NAME = 'UsageEvents';
const PUBLIC_STATUS = '公開OK';
const SCENARIO_INTRO_COLUMN = 15;

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || '');
    if (action === 'refreshIntros') {
      return text_(JSON.stringify({ ok: true, updated: refreshScenarioIntros_(5) }));
    }
    if (action !== 'siteSync') return text_('ERROR');
    return ContentService.createTextOutput(buildSiteSyncJs_())
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput('window.COC_SHEET_SYNC={sources:[],edges:[],feedback:{},error:true};')
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
    } else if (payload.action === 'usageEvent') {
      saveUsageEvent_(payload.data || {});
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
  const scope = composeScope_(data.scope, data.scopeDetail);
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
    sheet.appendRow([
      new Date(),
      safeCell_(source),
      safeCell_(candidate),
      mode,
      '要確認',
      '',
      '',
      safeCell_(scope)
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

function saveUsageEvent_(data) {
  const event = clean_(data.event, 60);
  const sessionId = clean_(data.sessionId, 80);
  if (!event || !sessionId) throw new Error('Missing usage event field');

  const allowed = {
    page_view: true,
    search_commit: true,
    result_view: true,
    scope_filter: true,
    market_click: true,
    recommendation_vote: true,
    candidate_submit: true
  };
  if (!allowed[event]) throw new Error('Invalid usage event');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USAGE_SHEET_NAME);
    if (!sheet) throw new Error('UsageEvents sheet not found');
    sheet.appendRow([
      new Date(),
      safeCell_(sessionId),
      safeCell_(event),
      safeCell_(clean_(data.sourceScenario, 160)),
      safeCell_(clean_(data.targetScenario, 160)),
      safeCell_(clean_(data.scope, 120)),
      safeCell_(clean_(data.verdict, 40)),
      safeCell_(clean_(data.market, 40)),
      safeCell_(clean_(data.mode, 30)),
      safeCell_(clean_(data.referrer, 180)),
      safeCell_(clean_(data.deviceClass, 20)),
      safeCell_(clean_(data.appVersion, 30)),
      data.success === true ? true : data.success === false ? false : '',
      safeCell_(clean_(data.note, 240))
    ]);
  } finally {
    lock.releaseLock();
  }
}

function buildSiteSyncJs_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(REQUEST_SHEET_NAME);
  if (!sheet) throw new Error('Requests sheet not found');
  const lastRow = sheet.getLastRow();
  const edgeMap = {};
  const sourceSet = {};

  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 15).getDisplayValues();
    rows.forEach(function(row) {
      const source = clean_(row[1], 160);
      const target = clean_(row[2], 160);
      const status = clean_(row[4], 40);
      if (!source || !target || status !== PUBLIC_STATUS) return;

      const memo = clean_(row[5], 500);
      const publicType = clean_(row[6], 20) || '推薦';
      const explicitScope = clean_(row[7], 160);
      const evidence = clean_(row[8], 80) || '利用者提供・確認済み';
      const reason = clean_(row[9], 300) || '利用者から寄せられ、確認済みの継続候補です。';
      const scope = inferScope_(explicitScope, memo, reason);
      const scenarioIntro = clean_(row[14], 240);
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
        i: scenarioIntro,
        st: publicType === '注意' ? '注意' : '推薦',
        d: markets
      };
    });
  }

  const sources = Object.keys(sourceSet).sort().map(function(name) { return { n: name }; });
  const edges = Object.keys(edgeMap).sort().map(function(key) { return edgeMap[key]; });
  const feedback = buildFeedbackSummary_(ss);
  const payload = {sources: sources, edges: edges, feedback: feedback, generatedAt: new Date().toISOString()};
  return 'window.COC_SHEET_SYNC=' + JSON.stringify(payload) + ';';
}

function refreshScenarioIntros_(limit) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(REQUEST_SHEET_NAME);
  if (!sheet) throw new Error('Requests sheet not found');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const rows = sheet.getRange(2, 1, lastRow - 1, 15).getDisplayValues();
  let updated = 0;
  const maxRows = Math.max(1, Math.min(Number(limit) || 5, 10));

  for (let i = 0; i < rows.length && updated < maxRows; i++) {
    const row = rows[i];
    if (clean_(row[14], 240)) continue;
    const boothUrl = [row[11], row[13]].map(safeHttpUrl_).find(isBoothUrl_);
    if (!boothUrl) continue;

    try {
      const intro = fetchBoothIntro_(boothUrl);
      if (!intro) continue;
      sheet.getRange(i + 2, SCENARIO_INTRO_COLUMN).setValue(safeCell_(intro)).setWrap(true);
      updated++;
      Utilities.sleep(250);
    } catch (err) {
      console.warn('scenario_intro failed row ' + (i + 2) + ': ' + err);
    }
  }
  return updated;
}

function fetchBoothIntro_(url) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    followRedirects: true,
    muteHttpExceptions: true,
    headers: { 'Accept-Language': 'ja,en;q=0.8' }
  });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) return '';
  const html = response.getContentText('UTF-8');
  const raw = extractMeta_(html, 'og:description') || extractMeta_(html, 'description');
  return summarizeBoothDescription_(raw);
}

function extractMeta_(html, key) {
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const property = attr_(tag, 'property');
    const name = attr_(tag, 'name');
    if (property === key || name === key) return decodeHtml_(attr_(tag, 'content'));
  }
  return '';
}

function attr_(tag, name) {
  const patterns = [
    new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i'),
    new RegExp(name + "\\s*=\\s*'([^']*)'", 'i')
  ];
  for (let i = 0; i < patterns.length; i++) {
    const m = String(tag || '').match(patterns[i]);
    if (m) return m[1];
  }
  return '';
}

function summarizeBoothDescription_(value) {
  let s = decodeHtml_(String(value || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(BOOTH|pixivFACTORY)\s*[-｜|:]?\s*/i, '')
    .trim();
  if (!s) return '';

  const sentences = s.split(/(?<=[。！？!?])/).map(function(x) { return x.trim(); }).filter(Boolean);
  let out = '';
  for (let i = 0; i < sentences.length; i++) {
    if ((out + sentences[i]).length > 120) break;
    out += sentences[i];
    if (out.length >= 55) break;
  }
  if (!out) out = s.slice(0, 117) + (s.length > 117 ? '…' : '');
  if (out.length > 120) out = out.slice(0, 117) + '…';
  return out;
}

function decodeHtml_(value) {
  return String(value || '')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(Number(n)); })
    .replace(/&#x([0-9a-f]+);/gi, function(_, n) { return String.fromCharCode(parseInt(n, 16)); });
}

function isBoothUrl_(url) {
  return /^https:\/\/[^/]*booth\.pm\/(?:[a-z]{2}\/)?items\/\d+/i.test(String(url || ''));
}

function buildFeedbackSummary_(ss) {
  const sheet = ss.getSheetByName(USAGE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return {};

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14).getDisplayValues();
  const seen = {};
  const out = {};

  rows.forEach(function(row) {
    if (clean_(row[2], 60) !== 'recommendation_vote') return;
    const sessionId = clean_(row[1], 80);
    const source = clean_(row[3], 160);
    const target = clean_(row[4], 160);
    const verdict = clean_(row[6], 40);
    if (!sessionId || !source || !target || (verdict !== 'fit' && verdict !== 'doubt')) return;

    const voteKey = sessionId + '\u0000' + source + '\u0000' + target + '\u0000' + verdict;
    if (seen[voteKey]) return;
    seen[voteKey] = true;

    const edgeKey = source + '\u0000' + target;
    if (!out[edgeKey]) out[edgeKey] = {fit: 0, doubt: 0};
    out[edgeKey][verdict] += 1;
  });

  return out;
}

function scopeBase_(value) {
  const s = clean_(value, 160);
  if (!s || /^(指定なし|不明|未設定|問わない)$/.test(s)) return '';
  if (/^タイマン(?:｜|$)|KPC/.test(s)) return 'タイマン';
  if (/1人|一人|ソロ|HO単位|片ロス/.test(s)) return '1人・HO単位';
  if (/ペア|2人|二人|ふたり|PC1|PC2|PC①|PC②/.test(s)) return 'ペア';
  if (/自陣全員|複数人|複数|全員|グループ|3人|三人|4人|四人|5人|五人|6人|六人/.test(s)) return '自陣全員・複数人';
  return '';
}

function composeScope_(scopeValue, detailValue) {
  const rawScope = clean_(scopeValue, 80);
  const detail = clean_(detailValue, 180);
  if (!rawScope) return '';
  const base = scopeBase_(rawScope) || rawScope;
  return detail ? clean_(base + '｜' + detail, 240) : base;
}

function normalizeExplicitScope_(value) {
  const s = clean_(value, 240);
  if (!s || /^(指定なし|不明|未設定|問わない)$/.test(s)) return '';
  const base = scopeBase_(s);
  if (!base) return s;
  if (s.indexOf('｜') >= 0) return s;
  if (/KPC|PC|HO\d+|片ロス/.test(s) && s !== base) return s;
  return base;
}

function inferScope_(explicitScope, memo, reason) {
  const explicit = normalizeExplicitScope_(explicitScope);
  if (explicit) return explicit;

  const text = clean_([memo, reason].filter(Boolean).join(' '), 800);
  if (!text) return '指定なし';

  if (/片ロス|1人|一人|ソロ|HO単位/.test(text)) return '1人・HO単位';
  if (/HO\d+KPC|KPC|タイマン/.test(text)) return 'タイマン';
  if (/ペア|2人|二人|ふたり|PC1|PC2|PC①|PC②/.test(text)) return 'ペア';
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
