#!/bin/bash

# ナレーション生成アプリ - デプロイスクリプト
# このスクリプトでDockerコンテナを簡単にデプロイできます

set -e  # エラーが発生したら即座に終了

echo "🎙️ ナレーション生成アプリ - デプロイ開始"
echo "================================================"

# 環境変数ファイルの確認
if [ ! -f .env ]; then
    echo "❌ エラー: .env ファイルが見つかりません"
    echo "📝 .env.example をコピーして .env を作成してください:"
    echo "   cp .env.example .env"
    echo "   その後、.env ファイルを編集して GEMINI_API_KEY を設定してください"
    exit 1
fi

# GEMINI_API_KEY の確認
if ! grep -q "^GEMINI_API_KEY=.*[^_here]$" .env; then
    echo "⚠️  警告: GEMINI_API_KEY が設定されていない可能性があります"
    echo "📝 .env ファイルを確認して、有効なAPIキーを設定してください"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🔧 既存のコンテナを停止・削除..."
docker-compose down || true

echo ""
echo "🏗️  Dockerイメージをビルド..."
docker-compose build --no-cache

echo ""
echo "🚀 コンテナを起動..."
docker-compose up -d

echo ""
echo "⏳ コンテナの起動を待機中..."
sleep 5

echo ""
echo "🔍 コンテナの状態を確認..."
docker-compose ps

echo ""
echo "✅ ヘルスチェック..."
if curl -s http://localhost:3000/api/health | grep -q "ok"; then
    echo "✅ アプリケーションは正常に起動しています！"
else
    echo "⚠️  ヘルスチェックに失敗しました。ログを確認してください:"
    echo "   docker-compose logs -f"
    exit 1
fi

echo ""
echo "================================================"
echo "🎉 デプロイ完了！"
echo ""
echo "📍 アプリケーションURL: http://localhost:3000"
echo "📂 音声ファイル保存先: ./output/narration/"
echo ""
echo "🔧 便利なコマンド:"
echo "   ログ確認:     docker-compose logs -f"
echo "   再起動:       docker-compose restart"
echo "   停止:         docker-compose stop"
echo "   完全削除:     docker-compose down -v"
echo ""
