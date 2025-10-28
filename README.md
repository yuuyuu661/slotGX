# Slot Machine (Login + Per-Account Coins)

## 要件
- Railway に Node.js サービスを作成
- Railway プロジェクトで **PostgreSQL** を追加（Provision）
- 環境変数を設定
  - `DATABASE_URL`（Postgres接続）
  - `JWT_SECRET`（長いランダム文字列）
  - `ADMIN_USERNAME` / `ADMIN_PASSWORD`（初回seed用）
  - `PORT`（任意 / デフォルト 3000）

## デプロイ
1. このリポジトリを GitHub に push
2. Railway で New Project → GitHub からこのリポジトリを選択
3. Add Plugin → PostgreSQL を追加（DATABASE_URL が自動で入る）
4. Variables に `.env.sample` を参考に設定
5. Start Command は `npm start`
6. 初回起動時に `schema.sql` が自動で適用 & adminが自動作成（既にいれば何もしない）

## 使い方
- `POST /api/login` （{ username, password }）でログイン → HttpOnly Cookie `session`
- `POST /api/logout` でログアウト
- `GET /api/me` 自分の情報
- `GET /api/coins` 現在のコイン
- `POST /api/coins/debit` { amount, reason } コイン減算（負になるとエラー）
- `POST /api/coins/credit` { amount, reason } コイン加算
- `POST /api/admin/users` { username, password, initial_coins? } 新規ユーザー作成（admin）
- `POST /api/admin/coins/adjust` { username, delta, reason? } 指定ユーザーの増減（admin）

## 既存スロットUIへの統合
- 起動時：`/api/me` と `/api/coins` を読み、未ログインならログインUIを表示
- スタート（BET）時： `/api/coins/debit` を呼ぶ
- 停止/配当確定時： `/api/coins/credit` を呼ぶ
- いずれも成功したら残高を再取得してUI更新

## セキュリティ補足
- 現状は最小実装。ズル対策として：
  - サーバ側で**1スピン検証**（乱数シード署名/停止位置ハッシュ）
  - レート制限（IP, ユーザー単位）
  - 管理UIの追加
  - 取引ログ（coin_transactions）CSV出力

## ローカル開発
```bash
cp .env.sample .env
# .env を編集（DATABASE_URL はローカルのPostgresでもOK）
npm i
npm run migrate
npm run dev
```