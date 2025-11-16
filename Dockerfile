# ナレーション生成アプリ - Dockerfile
FROM node:20-alpine

# ffmpegのインストール（音声変換に必要）
RUN apk add --no-cache ffmpeg

# 作業ディレクトリの作成
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm ci --only=production

# アプリケーションのソースコードをコピー
COPY . .

# TypeScriptのビルド
RUN npm run build

# 出力ディレクトリの作成
RUN mkdir -p /app/output/narration

# ポートの公開
EXPOSE 3000

# 環境変数（デフォルト値）
ENV PORT=3000
ENV NODE_ENV=production

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# アプリケーションの起動
CMD ["npm", "run", "app"]
