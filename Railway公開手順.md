# 🚀 ナレーション生成アプリをインターネットに公開する手順

## 📋 概要

このアプリを**Railway**というサービスを使って、インターネット上に公開します。
公開すると、どこからでもアクセスできるURLが発行されます。

**所要時間:** 約15分
**料金:** 無料（月500時間まで）

---

## ✅ 事前準備

### 必要なもの

1. **GitHubアカウント**
   - まだない場合: https://github.com/ で作成（無料）

2. **Railwayアカウント**
   - まだない場合: https://railway.app/ で作成（無料）
   - GitHubアカウントでログインできます

3. **Gemini API Key**
   - 音声生成に必要
   - 既に `.env` ファイルに設定済みのもの

---

## 📝 ステップ1: コードをGitHubにアップロード

### 1-1. 変更をまとめる

ターミナルで以下のコマンドを実行：

```bash
cd /Users/dosakakyohei/dev/training-slide-automation

# すべての変更をまとめる
git add .

# 変更の説明を付けて保存
git commit -m "ナレーション生成アプリ - Railway対応版"
```

### 1-2. GitHubにアップロード

```bash
# GitHubに送信
git push origin main
```

**確認:**
- ブラウザで https://github.com/dokyon/training-slide-automation を開く
- ファイルが更新されていることを確認

---

## 🚂 ステップ2: Railwayでプロジェクトを作成

### 2-1. Railwayにログイン

1. https://railway.app/ を開く
2. 「Login」をクリック
3. GitHubアカウントでログイン

### 2-2. 新しいプロジェクトを作成

1. **「New Project」**をクリック
2. **「Deploy from GitHub repo」**を選択
3. リポジトリ一覧から **「dokyon/training-slide-automation」** を選択
4. 「Deploy Now」をクリック

---

## ⚙️ ステップ3: 環境変数を設定

アプリが動くために必要な設定を入力します。

### 3-1. 環境変数を追加

1. デプロイされたプロジェクトの画面で **「Variables」** タブをクリック
2. 以下の設定を追加：

#### 必須項目

| 項目名 | 値 | 説明 |
|-------|-----|------|
| `GEMINI_API_KEY` | あなたのAPIキー | 音声生成に必要 |
| `GEMINI_PAID_TIER` | `true` または `false` | 有料プラン: `true` / 無料プラン: `false` |
| `PORT` | `3000` | アプリが使用するポート番号 |

### 3-2. 設定の入力方法

1. **「+ New Variable」**をクリック
2. **Variable Name:** `GEMINI_API_KEY`
3. **Variable Value:** あなたのGemini APIキー（.envファイルにあるもの）
4. 「Add」をクリック

これを `GEMINI_PAID_TIER` と `PORT` についても繰り返します。

---

## 🌐 ステップ4: URLを確認

### 4-1. デプロイの完了を待つ

- 画面に「Building...」と表示されます
- 5-10分ほど待ちます
- 「Deployed」と表示されたら完了

### 4-2. URLを取得

1. **「Settings」** タブをクリック
2. **「Domains」** セクションまでスクロール
3. **「Generate Domain」** をクリック

すると、以下のようなURLが発行されます：

```
https://your-app-name.up.railway.app
```

---

## ✅ ステップ5: 動作確認

### 5-1. アプリにアクセス

発行されたURLをブラウザで開きます。

**確認項目:**
- ✅ ページが正しく表示される
- ✅ 「正常動作中」と表示される
- ✅ テキストを入力して音声が生成できる

### 5-2. テスト音声の生成

1. テキスト欄に以下を入力：
   ```
   これはテストです。正常に動作しています。
   ```

2. 「🎙️ 音声を生成する」をクリック

3. 音声がダウンロードできればOK！

---

## 🎉 完了！

これでアプリがインターネット上で公開されました。

### 🔗 URLを共有

発行されたURLを他の人に教えれば、誰でもアクセスできます：

```
https://your-app-name.up.railway.app
```

---

## 💡 よくある質問

### Q1: URLを変更できますか？

**A:** はい、Railwayの「Settings」→「Domains」で独自のドメインを設定できます。

### Q2: 無料でどのくらい使えますか？

**A:** 月500時間まで無料です。24時間稼働しても約20日間使えます。

### Q3: 音声ファイルはどこに保存されますか？

**A:** ブラウザでダウンロードしたファイルは、ダウンロードフォルダに保存されます。

### Q4: アプリを停止したい

**A:** Railway のプロジェクトページで「Settings」→「Danger」→「Remove Service」

### Q5: アプリが動かない

**確認項目:**

1. **環境変数が正しく設定されているか**
   - Railway の「Variables」タブで確認

2. **ビルドが成功しているか**
   - Railway の「Deployments」タブで確認
   - エラーが出ている場合は、ログを確認

3. **APIキーが有効か**
   - Google AI Studio で確認

### Q6: コードを更新したい

**手順:**

1. ローカルで変更を加える
2. GitHubにアップロード：
   ```bash
   git add .
   git commit -m "変更内容の説明"
   git push origin main
   ```
3. Railwayが自動で再デプロイします

---

## 🔧 高度な設定（オプション）

### カスタムドメインの設定

1. Railway の「Settings」→「Domains」
2. 「Custom Domain」をクリック
3. 自分のドメインを入力（例: `narration.example.com`）
4. DNS設定を指示に従って変更

### 監視とログ

- **ログ確認:** Railway の「Deployments」タブ→「View Logs」
- **メトリクス:** Railway の「Metrics」タブで使用状況を確認

---

## 📞 サポート

### Railway公式ドキュメント

- https://docs.railway.app/

### このプロジェクトのGitHubリポジトリ

- https://github.com/dokyon/training-slide-automation

---

## 🎊 まとめ

### 公開までの流れ

1. ✅ コードをGitHubにアップロード
2. ✅ Railwayでプロジェクト作成
3. ✅ 環境変数を設定
4. ✅ URLを取得
5. ✅ 動作確認

### 完成したアプリでできること

- ✅ インターネット経由でどこからでもアクセス
- ✅ 複数人が同時に利用可能
- ✅ URLを共有して誰でも使える
- ✅ 音声ファイルの自動生成
- ✅ 辞書機能で専門用語の読み替え
- ✅ ノイズ除去機能で高音質

---

✨ **おめでとうございます！** アプリの公開が完了しました。
