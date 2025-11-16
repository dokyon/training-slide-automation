#!/bin/bash

echo "==================================="
echo "🧪 ナレーション生成アプリのテスト"
echo "==================================="
echo ""

# 色の定義
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# テスト結果カウンター
PASSED=0
FAILED=0

# テスト関数
test_api() {
  local name=$1
  local url=$2
  local method=${3:-GET}

  echo -n "Testing: $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s "$url")
  else
    response=$(curl -s -X POST "$url")
  fi

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
  fi
}

echo "1️⃣  サーバーの起動確認"
echo "-----------------------------------"
sleep 2
test_api "ヘルスチェックAPI" "http://localhost:3000/api/health"
echo ""

echo "2️⃣  辞書API のテスト"
echo "-----------------------------------"
test_api "辞書取得API" "http://localhost:3000/api/dictionary"
echo ""

echo "3️⃣  設定API のテスト"
echo "-----------------------------------"
test_api "設定取得API" "http://localhost:3000/api/settings"
echo ""

echo "==================================="
echo "📊 テスト結果サマリー"
echo "==================================="
echo -e "✅ 成功: ${GREEN}${PASSED}${NC} 件"
echo -e "❌ 失敗: ${RED}${FAILED}${NC} 件"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 すべてのテストに成功しました！${NC}"
  exit 0
else
  echo -e "${RED}⚠️  一部のテストに失敗しました${NC}"
  exit 1
fi
