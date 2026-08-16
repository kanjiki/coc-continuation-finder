# この自陣、次どこ行く？

CoC継続探索者向けのシナリオ候補検索サイトです。CoCプレイヤータイプ診断とは別リポジトリで管理します。

## 公開URL

- 通常版: `https://kanjiki.github.io/coc-continuation-finder/`
- 友人テスト版: `https://kanjiki.github.io/coc-continuation-finder/?test=1`
- 管理画面: `https://kanjiki.github.io/coc-continuation-finder/manage.html`

## 公開画面の仕様

- 元シナリオの候補一覧には正式名称だけを表示
- 略称は一覧へ出さず、直接入力されたときの検索にだけ使用
- 継続先ごとに、継続形態・推薦理由・実卓確認種別を表示
- X等の根拠投稿リンクは公開画面へ表示しない
- BOOTH、pixiv、TALTO等の販売・配布元を表示
- 直接確認できなかった販売・配布元は「確認中」と表示

## データ管理

根拠投稿URLは公開せず、管理用データにのみ保持します。候補の追加・修正は `manage.html` から行い、生成された `data.js` をGitHubへ上書きすると同じURLへ反映されます。

## 現在のデータ

- 元シナリオ: 20本
- 継続遷移: 80件
- 固有の継続先: 76本
- 販売・配布元を直接確認済み: 71本
- 販売・配布元を確認中: 5本

詳細は `DATA_AUDIT.md` を参照してください。
