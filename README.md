# この自陣、次どこ行く？

CoC継続探索者向けのシナリオ候補検索サイトです。CoCプレイヤータイプ診断とは別リポジトリで管理します。

## 公開URL

- 通常版: `https://kanjiki.github.io/coc-continuation-finder/`
- 友人テスト版: `https://kanjiki.github.io/coc-continuation-finder/?test=1`
- 管理画面: `https://kanjiki.github.io/coc-continuation-finder/manage.html`

## 公開画面の仕様

- 元シナリオのプルダウンには正式名称だけを表示
- 継続先ごとに、継続形態・推薦理由・実卓確認種別を表示
- X等の根拠投稿リンクは公開画面に表示しない
- BOOTH、pixiv、TALTO等の販売・配布元を表示
- 直接確認できなかった販売・配布元は「確認中」と表示
- 「出てほしい継続先候補」は専用Googleスプレッドシートへ自動集計できる

## 候補要望の自動集計

保存先は `CoC継続先候補 要望ログ` の `Requests` タブです。
公開フォーム由来の入力はまず `要確認` として保存され、そのままサイトには掲載されません。

Apps Scriptコードは `gas/Code.gs`、初回デプロイ手順は `gas/SETUP.md` にあります。
Webアプリの `/exec` URL は `config.js` の `candidateRequestEndpoint` に設定済みです。

## Google Sheets → サイトの定期同期

`Requests` タブの `対応状況` を `公開OK` にした行だけが同期対象です。
表示用の列は次の通りです。

- 公開種別（推薦 / 注意）
- 継続形態
- 根拠種別
- 推薦理由
- 販売元1 / URL1
- 販売元2 / URL2

GitHub Actions の `.github/workflows/sync-sheet.yml` が6時間ごとにApps Scriptの `?action=siteSync` を取得します。
内容に変更があったときだけ `data/sheet-sync.js` を更新してコミットし、GitHub Pagesへ反映します。
手動同期したい場合は GitHub の Actions から `Sync approved recommendations` を `Run workflow` で実行できます。

同期された行は既存データと `元シナリオ + 継続先` で照合し、同じ組み合わせがある場合はスプレッドシート側の公開内容を優先します。

## 推奨運用

1. 新規要望: `要確認`
2. 情報を調べ始めたら: `調査中`
3. 表示情報を埋め、掲載してよければ: `公開OK`
4. 掲載しない場合: `見送り`

`公開OK` にする前に、シナリオ名、継続条件、販売・配布元、推薦理由を確認してください。

## データ管理

既存のベースデータの追加・修正は `manage.html` から行えます。
管理画面で編集後に `custom.js` をダウンロードし、`data/custom.js` をGitHubで置き換えてコミットすると、同じ公開URLへ更新内容が反映されます。

## 現在のベースデータ

- 元シナリオ: 20本
- 継続遷移: 80件
- 固有の継続先: 76本
- 販売・配布元を直接確認済み: 71本
- 販売・配布元を確認中: 5本

詳細は `DATA_AUDIT.md` を参照してください。
