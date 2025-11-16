# 🎙️ ナレーション生成アプリ

**プログラミング知識不要！** ブラウザで簡単に高品質な音声を生成できるWebアプリケーションです。

![App Screenshot](docs/app-screenshot.png)

## ✨ 特徴

- 🎯 **プログラミング不要** - ブラウザだけで操作可能
- 🎙️ **高品質な音声生成** - Google Gemini 2.5 Flash Preview TTS使用
- 📝 **テキスト入力だけ** - テキストを入力するだけでMP3生成
- 📖 **辞書機能** - 専門用語の読み方を簡単に登録・管理
- ⚡ **高速処理** - 有料プランで3-5秒/音声
- 💾 **MP3出力** - ダウンロードしてすぐに使える

## 🚀 クイックスタート

### 1. アプリを起動

```bash
npm run app
```

### 2. ブラウザでアクセス

ブラウザで以下のURLを開く：

```
http://localhost:3000
```

### 3. テキストを入力して音声生成

1. テキストボックスにナレーション用のテキストを入力
2. 「🎙️ 音声を生成する」ボタンをクリック
3. 完了したら「⬇️ 音声をダウンロード」でMP3をダウンロード

## 📖 機能一覧

### 🎙️ 音声生成

- テキスト入力欄（リアルタイム文字数カウント）
- ファイル名指定
- ワンクリックで音声生成
- MP3ダウンロード

### 📚 辞書管理

- ワード一覧表示
- ワード追加（元のワード + 読み方）
- ワード削除
- ワード検索（リアルタイムフィルタリング）
- 登録ワード数の表示

### 📊 ステータス表示

- サーバー状態（正常動作中/APIキー未設定）
- プラン表示（有料プラン/無料プラン）
- リアルタイムヘルスチェック

## 🎨 UI/UX

- **美しいグラデーションデザイン**
- **レスポンシブ対応** - モバイルでも使いやすい
- **直感的な操作** - プログラミング知識不要
- **リアルタイムフィードバック**

## 📂 プロジェクト構成

```
training-slide-automation/
├── src/
│   └── web-app/
│       ├── server.ts              # Expressサーバー
│       └── public/
│           └── index.html         # フロントエンドUI
├── output/
│   └── narration/                 # 生成されたMP3ファイル
├── APP_GUIDE.md                   # 詳細な使い方ガイド
└── README_APP.md                  # このファイル
```

## 🔧 技術スタック

### バックエンド
- **Node.js + TypeScript**
- **Express** - Webサーバー
- **Multer** - ファイルアップロード
- **Google Gemini 2.5 Flash Preview TTS** - 音声生成

### フロントエンド
- **HTML + CSS + JavaScript**
- **Vanilla JavaScript** - フレームワーク不要
- **Fetch API** - サーバー通信

## 📊 API エンドポイント

### `POST /api/generate-narration`
音声生成API

**リクエスト:**
```json
{
  "text": "ナレーション用のテキスト",
  "filename": "my_narration"
}
```

**レスポンス:**
```json
{
  "success": true,
  "filename": "my_narration_1234567890.mp3",
  "downloadUrl": "/output/narration/my_narration_1234567890.mp3",
  "textLength": 50
}
```

### `GET /api/dictionary`
辞書取得API

**レスポンス:**
```json
{
  "description": "ナレーション読み上げ用辞書",
  "replacements": {
    "ChatGPT": "チャットジーピーティー",
    "AI": "エーアイ"
  }
}
```

### `POST /api/dictionary/add`
ワード追加API

**リクエスト:**
```json
{
  "word": "Notion",
  "reading": "ノーション"
}
```

### `DELETE /api/dictionary/:word`
ワード削除API

### `GET /api/health`
ヘルスチェックAPI

**レスポンス:**
```json
{
  "status": "ok",
  "geminiApiKey": true,
  "paidTier": true
}
```

## 🛠️ 設定

### 環境変数（.env）

```bash
# Gemini API Key（必須）
GEMINI_API_KEY=your_api_key_here

# 有料プラン設定（true = 有料、false = 無料）
GEMINI_PAID_TIER=true

# ポート番号（オプション、デフォルト: 3000）
PORT=3000
```

## 💡 使い方のコツ

### 長いテキストの場合

1. テキストエディタでテキストを作成
2. 全文をコピー
3. ブラウザのテキストボックスに貼り付け

### 複数の音声を生成

ファイル名を変えて繰り返し生成：
- `intro` → `intro_1234567890.mp3`
- `chapter1` → `chapter1_1234567891.mp3`
- `outro` → `outro_1234567892.mp3`

### 辞書の活用

よく使う専門用語を事前に登録しておくことで、常に正しい読み方で音声が生成されます。

## 📈 パフォーマンス

### 無料プラン
- 処理時間: **約35秒/音声**
- 制限: **15リクエスト/日**
- コスト: **0円**

### 有料プラン
- 処理時間: **約3-5秒/音声**
- 制限: **なし**
- コスト: **約2円/音声**

## 🔒 セキュリティ

- ローカルホスト（localhost）でのみ動作
- APIキーは.envファイルで安全に管理
- クライアント側でAPIキーは送信されない

## 🐛 トラブルシューティング

### アプリが起動しない

```bash
# 依存関係を再インストール
npm install

# ポートを変更して起動
PORT=3001 npm run app
```

### 音声生成に失敗する

1. `.env` ファイルで `GEMINI_API_KEY` が設定されているか確認
2. API制限（無料プランは15リクエスト/日）に達していないか確認
3. ブラウザのコンソール（F12キー）でエラーを確認

### 辞書が保存されない

- `src/narration/dictionary.json` のファイル権限を確認
- サーバーを再起動

## 📞 サポート

問題が解決しない場合は、`APP_GUIDE.md` の詳細ガイドを参照してください。

## 📝 ライセンス

MIT

---

✨ **簡単・高品質・高速** - プログラミング不要のナレーション生成アプリ
