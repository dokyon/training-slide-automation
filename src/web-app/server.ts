import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, statSync } from 'fs';
import { NarrationGeneratorAgent } from '../narration/narration-generator.js';
import { DenoiseLevel } from '../narration/audio-denoiser.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const DICTIONARY_PATH = path.join(__dirname, '../narration/dictionary.json');
const SETTINGS_PATH = path.join(__dirname, 'settings.json');

// 設定の読み込み
interface Settings {
  outputPath: string;
}

let currentSettings: Settings = {
  outputPath: path.resolve('./output/narration')
};

async function loadSettings(): Promise<void> {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const data = await readFile(SETTINGS_PATH, 'utf-8');
      currentSettings = JSON.parse(data);
      console.log(`📁 保存先設定を読み込みました: ${currentSettings.outputPath}`);
    } else {
      await saveSettings();
    }
  } catch (error) {
    console.warn('⚠️  設定ファイルの読み込みに失敗。デフォルト設定を使用します。');
  }
}

async function saveSettings(): Promise<void> {
  await writeFile(SETTINGS_PATH, JSON.stringify(currentSettings, null, 2), 'utf-8');
}

// ミドルウェア
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(path.join(__dirname, '../../output')));

/**
 * ホームページ
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * ナレーション生成API
 */
app.post('/api/generate-narration', async (req, res) => {
  try {
    const { text, filename, denoise, denoiseLevel, preserveQuality } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'テキストが空です' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEYが設定されていません。.envファイルを確認してください。'
      });
    }

    // 保存先ディレクトリの確認・作成
    if (!existsSync(currentSettings.outputPath)) {
      await mkdir(currentSettings.outputPath, { recursive: true });
      console.log(`📁 保存先ディレクトリを作成しました: ${currentSettings.outputPath}`);
    }

    console.log(`📝 Generating narration: ${filename || 'narration'}.mp3`);
    console.log(`📁 保存先: ${currentSettings.outputPath}`);
    if (denoise) {
      console.log(`🔇 ノイズ除去: ${denoiseLevel || 'auto'} (音質保持: ${preserveQuality !== false ? 'ON' : 'OFF'})`);
    }

    const usePaidTier = process.env.GEMINI_PAID_TIER !== 'false';

    // カスタム保存先を使用するため、NarrationGeneratorAgentのoutputDirを変更
    const generator = new NarrationGeneratorAgent(undefined, usePaidTier);
    // @ts-ignore - private fieldにアクセス
    generator.outputDir = currentSettings.outputPath;

    // ノイズ除去の設定
    if (denoise) {
      generator.setDenoiseOptions(true, {
        level: denoiseLevel || DenoiseLevel.AUTO,
        preserveQuality: preserveQuality !== false
      });
    }

    const outputFilename = `${filename || 'narration'}_${Date.now()}.mp3`;
    const fullPath = path.join(currentSettings.outputPath, outputFilename);

    // 音声生成
    await generator.generateFromText(text, outputFilename);

    // ファイルが実際に保存されたか確認
    if (!existsSync(fullPath)) {
      throw new Error('ファイルの保存に失敗しました。保存先を確認してください。');
    }

    const fileStats = statSync(fullPath);
    const fileSizeKB = (fileStats.size / 1024).toFixed(2);

    console.log(`✅ 音声ファイル生成完了: ${outputFilename} (${fileSizeKB} KB)`);

    res.json({
      success: true,
      filename: outputFilename,
      downloadUrl: `/api/download/${outputFilename}`,
      textLength: text.length,
      fileSize: fileSizeKB,
      filePath: fullPath,
      verified: true
    });

  } catch (error) {
    console.error('❌ ナレーション生成エラー:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '音声生成に失敗しました',
      verified: false
    });
  }
});

/**
 * 辞書取得API
 */
app.get('/api/dictionary', async (req, res) => {
  try {
    const data = await readFile(DICTIONARY_PATH, 'utf-8');
    const dictionary = JSON.parse(data);
    res.json(dictionary);
  } catch (error) {
    console.error('辞書読み込みエラー:', error);
    res.status(500).json({ error: '辞書の読み込みに失敗しました' });
  }
});

/**
 * 辞書更新API
 */
app.post('/api/dictionary', async (req, res) => {
  try {
    const { replacements } = req.body;

    if (!replacements || typeof replacements !== 'object') {
      return res.status(400).json({ error: '無効な辞書データです' });
    }

    const dictionary = {
      description: 'ナレーション読み上げ用辞書 - 専門用語や固有名詞の読み方を定義',
      replacements
    };

    await writeFile(DICTIONARY_PATH, JSON.stringify(dictionary, null, 2), 'utf-8');

    res.json({ success: true, count: Object.keys(replacements).length });

  } catch (error) {
    console.error('辞書保存エラー:', error);
    res.status(500).json({ error: '辞書の保存に失敗しました' });
  }
});

/**
 * 辞書ワード追加API
 */
app.post('/api/dictionary/add', async (req, res) => {
  try {
    const { word, reading } = req.body;

    if (!word || !reading) {
      return res.status(400).json({ error: 'ワードと読み方は必須です' });
    }

    const data = await readFile(DICTIONARY_PATH, 'utf-8');
    const dictionary = JSON.parse(data);

    dictionary.replacements[word.trim()] = reading.trim();

    await writeFile(DICTIONARY_PATH, JSON.stringify(dictionary, null, 2), 'utf-8');

    res.json({
      success: true,
      word: word.trim(),
      reading: reading.trim(),
      count: Object.keys(dictionary.replacements).length
    });

  } catch (error) {
    console.error('ワード追加エラー:', error);
    res.status(500).json({ error: 'ワードの追加に失敗しました' });
  }
});

/**
 * 辞書ワード削除API
 */
app.delete('/api/dictionary/:word', async (req, res) => {
  try {
    const { word } = req.params;

    const data = await readFile(DICTIONARY_PATH, 'utf-8');
    const dictionary = JSON.parse(data);

    if (!dictionary.replacements[word]) {
      return res.status(404).json({ error: 'ワードが見つかりません' });
    }

    delete dictionary.replacements[word];

    await writeFile(DICTIONARY_PATH, JSON.stringify(dictionary, null, 2), 'utf-8');

    res.json({
      success: true,
      word,
      count: Object.keys(dictionary.replacements).length
    });

  } catch (error) {
    console.error('ワード削除エラー:', error);
    res.status(500).json({ error: 'ワードの削除に失敗しました' });
  }
});

/**
 * ヘルスチェックAPI
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiApiKey: !!process.env.GEMINI_API_KEY,
    paidTier: process.env.GEMINI_PAID_TIER !== 'false',
    outputPath: currentSettings.outputPath
  });
});

/**
 * 保存フォルダを開くAPI（macOS/Windows対応）
 */
app.post('/api/open-folder', async (req, res) => {
  try {
    // 保存先ディレクトリが存在するか確認
    if (!existsSync(currentSettings.outputPath)) {
      await mkdir(currentSettings.outputPath, { recursive: true });
      console.log(`📁 保存先ディレクトリを作成しました: ${currentSettings.outputPath}`);
    }

    // OSによってコマンドを変える
    const platform = process.platform;
    let command;

    if (platform === 'darwin') {
      // macOS
      command = `open "${currentSettings.outputPath}"`;
    } else if (platform === 'win32') {
      // Windows
      command = `explorer "${currentSettings.outputPath}"`;
    } else {
      // Linux
      command = `xdg-open "${currentSettings.outputPath}"`;
    }

    await execAsync(command);
    console.log(`✅ フォルダを開きました: ${currentSettings.outputPath}`);

    res.json({ success: true, path: currentSettings.outputPath });

  } catch (error) {
    console.error('❌ フォルダを開くエラー:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'フォルダを開けませんでした'
    });
  }
});

/**
 * ファイルダウンロードAPI（ブラウザのダウンロードバーを表示）
 */
app.get('/api/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(currentSettings.outputPath, filename);

    // ファイルの存在確認
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'ファイルが見つかりません' });
    }

    // Content-Dispositionヘッダーを設定してブラウザのダウンロード機能を使用
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // ファイルを送信
    res.sendFile(filePath);
  } catch (error) {
    console.error('❌ ダウンロードエラー:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'ダウンロードに失敗しました'
    });
  }
});

/**
 * 保存先設定取得API
 */
app.get('/api/settings', (req, res) => {
  res.json(currentSettings);
});

/**
 * 保存先設定更新API
 */
app.post('/api/settings', async (req, res) => {
  try {
    const { outputPath } = req.body;

    if (!outputPath || typeof outputPath !== 'string') {
      return res.status(400).json({ error: '保存先パスが無効です' });
    }

    // パスの検証
    const resolvedPath = path.resolve(outputPath);

    // ディレクトリが存在しない場合は作成
    if (!existsSync(resolvedPath)) {
      await mkdir(resolvedPath, { recursive: true });
      console.log(`📁 保存先ディレクトリを作成しました: ${resolvedPath}`);
    }

    currentSettings.outputPath = resolvedPath;
    await saveSettings();

    console.log(`✅ 保存先を変更しました: ${resolvedPath}`);

    res.json({
      success: true,
      outputPath: resolvedPath
    });

  } catch (error) {
    console.error('❌ 保存先設定エラー:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '保存先の設定に失敗しました'
    });
  }
});

// サーバー起動
const PORT = process.env.PORT || 3000;

async function startServer() {
  // 設定を読み込み
  await loadSettings();

  app.listen(PORT, () => {
    console.log('\n===========================================');
    console.log('🎙️  ナレーション生成アプリ - 起動しました！');
    console.log('===========================================\n');
    console.log(`📱 ブラウザでアクセス: http://localhost:${PORT}`);
    console.log(`🔧 有料プラン: ${process.env.GEMINI_PAID_TIER !== 'false' ? 'ON' : 'OFF'}`);
    console.log(`🔑 API Key: ${process.env.GEMINI_API_KEY ? '設定済み' : '未設定'}`);
    console.log(`📁 保存先: ${currentSettings.outputPath}`);
    console.log('\n終了するには Ctrl+C を押してください\n');
  });
}

startServer();
