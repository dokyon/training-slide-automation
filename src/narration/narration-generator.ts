import { GoogleGenAI } from '@google/genai';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ScriptInput, Section } from '../types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AudioDenoiser, DenoiseLevel, DenoiseOptions, NoiseType } from './audio-denoiser.js';

const execAsync = promisify(exec);

/**
 * ナレーション生成結果
 */
export interface NarrationResult {
  status: 'success' | 'error';
  files?: {
    sectionTitle: string;
    filename: string;
    duration?: number;
  }[];
  error?: string;
  metrics: {
    totalSections: number;
    successCount: number;
    failureCount: number;
    durationMs: number;
    timestamp: string;
  };
}

/**
 * 辞書データ型
 */
interface Dictionary {
  description: string;
  replacements: Record<string, string>;
}

/**
 * NarrationGeneratorAgent - 台本から音声ナレーションを自動生成
 *
 * 機能:
 * - Google Gemini 2.5 Flash Preview TTS を使用した高品質音声合成
 * - 辞書機能による専門用語の読み替え
 * - セクションごとの音声ファイル生成（MP3形式）
 * - 30代男性アナウンサー風の声質（Puck voice - upbeat）
 */
export class NarrationGeneratorAgent {
  private ai: GoogleGenAI;
  private dictionary: Dictionary | null = null;
  private outputDir: string = './output/narration';
  private voice: string = 'Puck'; // 30代男性、明るくフレッシュな声
  private ttsModel: string = 'gemini-2.5-flash-preview-tts'; // Gemini 2.5 Flash TTS（呼吸音が少ない）
  private rateLimitMs: number = 1000; // API rate limit待機時間（デフォルト: 1秒 = 有料プラン想定）
  private denoiser: AudioDenoiser; // ノイズ除去エンジン
  private enableDenoise: boolean = false; // ノイズ除去の有効/無効（デフォルトOFF）
  private denoiseOptions: DenoiseOptions = {
    level: DenoiseLevel.AUTO,
    preserveQuality: true,
    targetType: NoiseType.BREATH // 呼吸音除去モード
  };

  constructor(apiKey?: string, usePaidTier: boolean = true) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable.');
    }
    this.ai = new GoogleGenAI({ apiKey: key });

    // レート制限設定（有料: 1秒、無料: 35秒）
    this.rateLimitMs = usePaidTier ? 1000 : 35000;

    // ノイズ除去エンジンの初期化
    this.denoiser = new AudioDenoiser();

    // 出力ディレクトリを作成
    this.ensureOutputDir();
  }

  /**
   * 出力ディレクトリを確保
   */
  private async ensureOutputDir(): Promise<void> {
    if (!existsSync(this.outputDir)) {
      await mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * ノイズ除去の設定
   */
  setDenoiseOptions(enable: boolean, options?: DenoiseOptions): void {
    this.enableDenoise = enable;
    if (options) {
      this.denoiseOptions = options;
    }
    console.log(`🎛️ ノイズ除去: ${enable ? 'ON' : 'OFF'}${enable ? ` (レベル: ${this.denoiseOptions.level})` : ''}`);
  }

  /**
   * 辞書を読み込む
   */
  async loadDictionary(dictionaryPath: string = './src/narration/dictionary.json'): Promise<void> {
    try {
      const data = await readFile(dictionaryPath, 'utf-8');
      this.dictionary = JSON.parse(data);
      console.log(`📖 Dictionary loaded: ${Object.keys(this.dictionary!.replacements).length} entries`);
    } catch (error) {
      console.warn('⚠️  Failed to load dictionary, proceeding without it:', error);
      this.dictionary = null;
    }
  }

  /**
   * テキストに辞書を適用
   */
  private applyDictionary(text: string): string {
    if (!this.dictionary) return text;

    let processedText = text;

    // 長いキーワードから優先的に置換（部分マッチ問題を回避）
    const sortedEntries = Object.entries(this.dictionary.replacements)
      .sort((a, b) => b[0].length - a[0].length);

    // 辞書の各エントリを適用
    for (const [original, replacement] of sortedEntries) {
      // 正規表現の特殊文字をエスケープ
      const escapedOriginal = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // グローバル置換（大文字小文字区別なし）
      const regex = new RegExp(escapedOriginal, 'gi');
      processedText = processedText.replace(regex, replacement);
    }

    return processedText;
  }

  /**
   * セクションからナレーション用テキストを抽出
   */
  private extractNarrationText(section: Section): string {
    const parts: string[] = [];

    // タイトル
    if (section.title) {
      parts.push(section.title);
    }

    // サブタイトル
    if (section.subtitle) {
      parts.push(section.subtitle);
    }

    // ナレーション
    if (section.narration) {
      parts.push(section.narration);
    }

    // 箇条書き
    if (section.bullets && section.bullets.length > 0) {
      parts.push(...section.bullets);
    }

    return parts.join('\n\n');
  }

  /**
   * テキストを適切な長さに分割
   * Gemini TTS制限: 約1000-1500文字（750語）が上限
   * 句点（。）で自然に分割し、各チャンクを800-1000文字程度に保つ
   */
  private splitTextIntoChunks(text: string, maxChunkSize: number = 1000): string[] {
    // 短いテキストはそのまま返す
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/(?<=[。！？\n])/); // 句点、感嘆符、疑問符、改行で分割

    let currentChunk = '';

    for (const sentence of sentences) {
      // 現在のチャンクに追加しても maxChunkSize を超えない場合
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += sentence;
      } else {
        // 現在のチャンクを保存
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        // 新しいチャンクを開始
        currentChunk = sentence;
      }
    }

    // 最後のチャンクを追加
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * 複数のMP3ファイルをシンプルに結合（正規化なし）
   */
  private async concatenateAudioFiles(inputFiles: string[], outputPath: string): Promise<void> {
    // FFmpegの concat demuxer用のファイルリストを作成
    const fileListPath = outputPath.replace('.mp3', '_filelist.txt');
    const fileListContent = inputFiles.map(file => `file '${file}'`).join('\n');
    await writeFile(fileListPath, fileListContent, 'utf-8');

    try {
      console.log(`  🔗 Concatenating ${inputFiles.length} audio chunks...`);

      // シンプルにコピーで結合（音質劣化なし、高速）
      const concatCmd = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy -y "${outputPath}"`;
      await execAsync(concatCmd);

      // 一時ファイルを削除
      await execAsync(`rm "${fileListPath}"`);
      for (const file of inputFiles) {
        await execAsync(`rm "${file}"`);
      }
    } catch (error) {
      // エラー時もクリーンアップ
      try {
        await execAsync(`rm "${fileListPath}"`);
      } catch {}
      throw error;
    }
  }

  /**
   * PCMデータをMP3に変換（ffmpeg使用）
   * @param base64PcmData Base64エンコードされたPCMデータ
   * @param outputPath 出力MP3ファイルパス
   */
  private async pcmToMp3(base64PcmData: string, outputPath: string): Promise<void> {
    // Base64デコード
    const pcmBuffer = Buffer.from(base64PcmData, 'base64');

    // 一時PCMファイルに保存
    const tempPcmPath = outputPath.replace('.mp3', '_temp.pcm');
    await writeFile(tempPcmPath, pcmBuffer);

    try {
      // ffmpegでPCMをMP3に変換
      // Gemini TTS: 24000Hz, モノラル, 16-bit PCM
      const tempMp3Path = this.enableDenoise
        ? outputPath.replace('.mp3', '_raw.mp3')
        : outputPath;

      const ffmpegCmd = `ffmpeg -f s16le -ar 24000 -ac 1 -i "${tempPcmPath}" -codec:a libmp3lame -b:a 128k -y "${tempMp3Path}"`;

      await execAsync(ffmpegCmd);

      // 一時PCMファイルを削除
      await execAsync(`rm "${tempPcmPath}"`);

      // ノイズ除去を適用
      if (this.enableDenoise) {
        console.log(`  🔇 ノイズ除去を適用中...`);
        await this.denoiser.denoise(tempMp3Path, outputPath, this.denoiseOptions);

        // 一時MP3ファイルを削除
        await execAsync(`rm "${tempMp3Path}"`);
      }

    } catch (error) {
      // エラー時も一時ファイルをクリーンアップ
      try {
        await execAsync(`rm "${tempPcmPath}"`);
        if (this.enableDenoise) {
          const tempMp3Path = outputPath.replace('.mp3', '_raw.mp3');
          await execAsync(`rm "${tempMp3Path}"`);
        }
      } catch {}
      throw error;
    }
  }

  /**
   * 単一セクションの音声を生成
   */
  private async generateSectionAudio(
    text: string,
    sectionTitle: string,
    sectionIndex: number
  ): Promise<{ filename: string; success: boolean }> {
    try {
      // 辞書適用
      const processedText = this.applyDictionary(text);

      // 文字数チェック（Geminiの制限は明示されていないが、長すぎる場合は分割を検討）
      if (processedText.length > 5000) {
        console.warn(`⚠️  Section "${sectionTitle}" is very long (${processedText.length} chars), may take longer...`);
      }

      console.log(`  🎙️  Generating audio for: ${sectionTitle} (${processedText.length} chars)`);

      // Gemini TTS API呼び出し（公式ドキュメント準拠の形式）
      const response = await this.ai.models.generateContent({
        model: this.ttsModel,
        contents: [{ parts: [{ text: processedText }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voice,
              },
            },
          },
        },
      });

      // 音声データを取得
      const audioPart = response.candidates?.[0]?.content?.parts?.[0];

      if (!audioPart || !('inlineData' in audioPart) || !audioPart.inlineData?.data) {
        throw new Error('No audio data returned from Gemini API');
      }

      const base64PcmData = audioPart.inlineData.data;

      // ファイル名生成（安全な形式）
      const safeTitle = sectionTitle
        .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

      const filename = `section_${String(sectionIndex + 1).padStart(2, '0')}_${safeTitle}.mp3`;
      const filepath = path.join(this.outputDir, filename);

      // PCMをMP3に変換してファイル保存
      console.log(`  🔄 Converting PCM to MP3...`);
      await this.pcmToMp3(base64PcmData, filepath);

      console.log(`  ✅ Saved: ${filename}`);

      return { filename, success: true };

    } catch (error) {
      console.error(`  ❌ Failed to generate audio for "${sectionTitle}":`, error);
      return { filename: '', success: false };
    }
  }

  /**
   * 台本全体からナレーションを生成
   */
  async generate(script: ScriptInput): Promise<NarrationResult> {
    const startTime = Date.now();

    console.log(`🎬 Generating narration for: ${script.title}`);
    console.log(`📊 Total sections: ${script.sections.length}\n`);

    // 辞書読み込み
    await this.loadDictionary();

    const results: { sectionTitle: string; filename: string }[] = [];
    let successCount = 0;
    let failureCount = 0;

    // セクションごとに処理
    for (let i = 0; i < script.sections.length; i++) {
      const section = script.sections[i];

      // タイトルスライドとセクション分割スライドはスキップ
      if (section.type === 'title' || section.type === 'sectionDivider') {
        console.log(`  ⏭️  Skipping: ${section.title} (type: ${section.type})`);
        continue;
      }

      // ナレーション用テキスト抽出
      const narrationText = this.extractNarrationText(section);

      if (!narrationText || narrationText.trim().length === 0) {
        console.log(`  ⏭️  Skipping: ${section.title} (no narration text)`);
        continue;
      }

      // 音声生成
      const result = await this.generateSectionAudio(narrationText, section.title, i);

      if (result.success) {
        results.push({
          sectionTitle: section.title,
          filename: result.filename
        });
        successCount++;
      } else {
        failureCount++;
      }

      // API rate limitを考慮して待機
      await new Promise(resolve => setTimeout(resolve, this.rateLimitMs));
    }

    const durationMs = Date.now() - startTime;

    console.log(`\n✅ Narration generation complete!`);
    console.log(`📊 Success: ${successCount}, Failed: ${failureCount}`);
    console.log(`⏱️  Duration: ${durationMs}ms`);

    return {
      status: failureCount === 0 ? 'success' : 'error',
      files: results,
      metrics: {
        totalSections: script.sections.length,
        successCount,
        failureCount,
        durationMs,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 単一チャンクから音声を生成（内部用）
   * リトライ機能付き
   */
  private async generateAudioChunk(text: string, retryCount: number = 0): Promise<string> {
    const maxRetries = 3;

    try {
      const response = await this.ai.models.generateContent({
        model: this.ttsModel,
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voice,
              },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.[0];

      if (!audioPart || !('inlineData' in audioPart) || !audioPart.inlineData?.data) {
        throw new Error('No audio data returned from Gemini API');
      }

      return audioPart.inlineData.data;

    } catch (error: any) {
      // Gemini APIの内部エラー（500番台）の場合はリトライ
      const isRetryableError =
        error?.message?.includes('INTERNAL') ||
        error?.message?.includes('500') ||
        error?.message?.includes('503');

      if (isRetryableError && retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000; // 指数バックオフ: 1秒, 2秒, 4秒
        console.log(`  ⚠️  API error, retrying in ${waitTime/1000}s... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.generateAudioChunk(text, retryCount + 1);
      }

      // リトライ不可能なエラー、またはリトライ上限に達した場合
      console.error(`  ❌ Gemini API error: ${error?.message || error}`);
      throw new Error(`Gemini API error: ${error?.message || 'Unknown error'}. Please try again later.`);
    }
  }

  /**
   * 音声の速度・声質・トーンを統一
   * 高品質なフィルタを使用し、音質劣化を最小限に抑える
   */
  private async normalizeAudioCharacteristics(inputPath: string, outputPath: string): Promise<void> {
    console.log(`  🎵 Normalizing speed, voice quality, and tone...`);

    // 複数のフィルタを組み合わせて声質を統一
    // 1. atempo=0.95: 速度を少し遅くして安定化
    // 2. dynaudnorm: 動的音量正規化（loudnormより自然、こもらない）
    // 3. highpass/lowpass: 軽いフィルタリングでトーンを統一
    const filters = [
      'atempo=0.95',                          // 速度を0.95倍に
      'dynaudnorm=f=75:g=3:p=0.9:s=5',       // 動的音量正規化（自然）
      'highpass=f=80',                        // 80Hz以下の低音ノイズをカット
      'lowpass=f=12000',                      // 12kHz以上の高音ノイズをカット
    ].join(',');

    const normalizeCmd = `ffmpeg -i "${inputPath}" -af "${filters}" -ar 24000 -ac 1 -b:a 128k -y "${outputPath}"`;

    await execAsync(normalizeCmd);
  }

  /**
   * 単一テキストから音声を生成
   * Gemini TTS制限（約1000文字）を考慮して自動的に分割
   */
  async generateFromText(
    text: string,
    filename: string = 'test_narration.mp3'
  ): Promise<void> {
    await this.loadDictionary();
    const processedText = this.applyDictionary(text);

    console.log(`🎙️  Generating audio from text (${processedText.length} chars)...`);

    // Gemini TTS制限を考慮して分割（1000文字チャンク）
    const chunks = this.splitTextIntoChunks(processedText, 1000);

    if (chunks.length > 1) {
      console.log(`📋 Text split into ${chunks.length} chunks (Gemini TTS limit: ~1000 chars)`);
    }

    const filepath = path.join(this.outputDir, filename);
    const tempFiles: string[] = [];

    try {
      // 各チャンクで音声を生成
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`  🎤 Generating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);

        const base64PcmData = await this.generateAudioChunk(chunk);
        const tempFilename = `${filename.replace('.mp3', '')}_chunk_${i}.mp3`;
        const tempFilepath = path.join(this.outputDir, tempFilename);

        // PCMをMP3に変換
        await this.pcmToMp3(base64PcmData, tempFilepath);

        // 速度・声質・トーンを統一
        const normalizedPath = tempFilepath.replace('.mp3', '_normalized.mp3');
        await this.normalizeAudioCharacteristics(tempFilepath, normalizedPath);
        await execAsync(`rm "${tempFilepath}"`);

        tempFiles.push(normalizedPath);

        // レート制限を考慮して待機（複数チャンクの場合）
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitMs));
        }
      }

      // 複数チャンクの場合は結合
      if (tempFiles.length > 1) {
        console.log(`  🔗 Concatenating ${tempFiles.length} audio chunks...`);
        await this.concatenateAudioFiles(tempFiles, filepath);
      } else if (tempFiles.length === 1) {
        // 1チャンクの場合はリネーム
        await execAsync(`mv "${tempFiles[0]}" "${filepath}"`);
      }

      console.log(`✅ Audio saved: ${filepath}`);

    } catch (error) {
      // エラー時は一時ファイルをクリーンアップ
      for (const tempFile of tempFiles) {
        try {
          await execAsync(`rm "${tempFile}"`);
        } catch {}
      }
      throw error;
    }
  }
}
