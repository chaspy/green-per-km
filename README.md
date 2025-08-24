# green-per-km

JR東日本の普通列車グリーン車料金を計算し、km単価（円/km）を表示するWebアプリケーション。

2025年3月15日より中央線快速・青梅線でグリーン車サービスが開始されることに対応。

## 特徴

- 🚃 任意の区間のグリーン料金を即座に計算
- 💳 Suicaグリーン券と紙のグリーン券の両方に対応
- 📊 km単価（円/km）を自動計算して表示
- 🔄 GitHub Actionsによる料金表の自動更新（毎日JST 9:00）
- 📱 レスポンシブデザイン対応
- ⚡ Cloudflare Pagesでホスティング（バックエンドなし）

## セットアップ

### ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

### データ更新スクリプト

```bash
# 料金表の取得と検証
npm run data:refresh
```

## Cloudflare Pages へのデプロイ

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
2. **Pages** → **Create a project** → **Connect to Git** を選択
3. GitHubアカウントを連携し、このリポジトリを選択
4. ビルド設定：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **Save and Deploy** をクリック

以降、`main` ブランチへのプッシュで自動デプロイされます。

## データ構造

### グリーン料金テーブル
- ファイル: `public/data/green-fare.table.json`
- JR東日本公式サイトから取得
- 距離帯別料金（50kmまで、100kmまで、101km以上）

### 路線データ
- ファイル: `public/data/routes/chuo-rapid.km.json`
- 各駅の東京起点からの累積営業キロ
- 総距離: 53.1km（東京〜高尾）

## 技術スタック

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: CSS Modules
- **Data**: 静的JSON
- **CI/CD**: GitHub Actions
- **Hosting**: Cloudflare Pages

## 法務情報・出典

### 料金データ
- **出典**: [JR東日本 - 普通列車グリーン車｜料金](https://www.jreast.co.jp/railway/train/green/charge/)
- 料金は通年同額
- 自動更新スクリプトで最新情報を取得

### 路線データ
- **中央線快速の総距離（53.1km）**: [Wikipedia - 中央線快速](https://ja.wikipedia.org/wiki/中央線快速)
  - CC BY-SA 4.0ライセンスに基づく利用
- **駅間距離の参考資料**（検証用）:
  - [教えたがりダッシュ！](https://dash-dash-dash.jp/archives/58434.html)
  - [MDS鉄道案内](https://www.mds.gr.jp/~jp3nfp/station/list/jr/chuou.html)

### GitHub Actions
- **cron設定**: UTC基準（JST 9:00 = UTC 0:00）
- 参考: [Stack Overflow - GitHub Actions timezone](https://stackoverflow.com/questions/63761794/github-action-scheduled-cron-job-not-running-on-time)

## ライセンス

MIT License

### 利用データのライセンス

- Wikipedia データ: CC BY-SA 4.0
- その他の参考データ: 各サイトの利用規約に準拠

## 注意事項

- 営業キロと実キロ（幾何長）は異なる概念です
- グリーン料金は変更される可能性があります
- 2025年3月15日サービス開始前は参考値としてご利用ください

## 今後の拡張予定

- [ ] 他路線データの追加（東海道線、宇都宮線など）
- [ ] 時間帯別料金対応（将来実装される場合）
- [ ] 地図表示機能
- [ ] PWA対応