# board_games
卒業制作 の課題
# 概要
ブラウザで遊ぶことのできるボードゲームを作成しました。

スピード、リバーシ、神経衰弱で遊べます。
## 対戦モード
### 通常対戦
気軽に対戦ができます。
### レート対戦
レートを賭けて対戦することができます。

試合に勝つとレートが増加し、負けると減少します。

レートが高いほど実力が高いことになります。
### フレンド対戦
対戦部屋を作って、友達と対戦することができます。
### CPU対戦
CPUと対戦することができます。

「よわい」「ふつう」「つよい」の３段階から難易度を選択できます。
## ランキング
各ゲームごとの勝利数、レートでのランキングを見ることができます。
# クローンから起動まで
## Step 1: リポジトリをクローンする
下記のコマンドを実行してください。
```
# リポジトリをクローンする
git clone https://github.com/itc-s21009/board_games.git
# ディレクトリに移動
cd board_games
```
## Step 2: 依存関係のインストール
下記のコマンドを実行してください。
```
npm i
```
## Step 3: DBサーバー環境構築
Dockerで環境を用意したい場合は、下記のコマンドを実行してください。
```
# dockerディレクトリに移動
cd docker
# コンテナを起動する
docker compose up -d
```
`docker/docker-compose.yml`の設定は次のようになっています。

| 項目     | 内容           |
|--------|--------------|
| データベースサーバー | `PostgreSQL` |
| データベース名 | `boardgames_db` |
| ユーザー名  | `postgres`   |
| パスワード  | `pass`       |
| ポート    | `5432`       |
## Step 4: 設定ファイルを記述
`.env`ファイルを編集してください。

編集例：
```
SECRET="推測されないランダムな文字列"
API_URL="http://localhost:8080"
DATABASE_URL="postgresql://postgres:pass@localhost:5432/postgres?schema=public"
port=8080
```
## Step 5: データベースのマイグレーション
`prisma/schema.prisma`に書いてあるデータベースの設定をDBサーバーに反映させて、`prisma/seed.js`を実行して初期データを作成します。

下記のコマンドを実行してください。
```
npx prisma migrate dev
```
実行後に何か出ますが、何も入れずにEnterでOKです。
## Step 6: ゲームファイルのビルド
下記のコマンドを実行してください。
```
npm run build
```
## Step 7: サーバー起動
下記のコマンドを実行してください。
```
npm run start
```
http://localhost:8080 にアクセスするとゲーム画面が出てくるはずです！
# 連絡
Mail: s21009@std.it-college.ac.jp
