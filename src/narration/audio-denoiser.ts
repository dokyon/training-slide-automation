import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * ノイズ除去レベル
 */
export enum DenoiseLevel {
  NONE = 'none',        // ノイズ除去なし
  LIGHT = 'light',      // 軽度（わずかなノイズ）
  MEDIUM = 'medium',    // 中度（一般的なノイズ）
  STRONG = 'strong',    // 強度（強いノイズ）
  AUTO = 'auto'         // 自動検出
}

/**
 * ノイズの種類
 */
export enum NoiseType {
  WHITE_NOISE = 'white_noise',           // ホワイトノイズ
  BACKGROUND_HUM = 'background_hum',     // バックグラウンドハム音
  CLICK_POP = 'click_pop',               // クリック・ポップ音
  ROOM_TONE = 'room_tone',               // 部屋の環境音
  BREATH = 'breath',                     // 呼吸音・息遣い
  MIXED = 'mixed'                        // 混合ノイズ
}

/**
 * ノイズ分析結果
 */
interface NoiseAnalysis {
  type: NoiseType;
  level: number;              // 0-100のノイズレベル
  recommendedLevel: DenoiseLevel;
  spectralPeaks: number[];    // 周波数ピーク
}

/**
 * ノイズ除去オプション
 */
export interface DenoiseOptions {
  level: DenoiseLevel;
  preserveQuality: boolean;   // 音質優先モード
  targetType?: NoiseType;     // 特定のノイズタイプを指定
}

/**
 * 音声ノイズ除去クラス
 * 複数のアルゴリズムを使用して高品質なノイズ除去を実現
 */
export class AudioDenoiser {
  /**
   * ノイズを自動検出
   */
  async detectNoise(audioPath: string): Promise<NoiseAnalysis> {
    console.log(`🔍 ノイズを分析中: ${audioPath}`);

    try {
      // ffmpegでオーディオ統計を取得
      const { stdout: statsOutput } = await execAsync(
        `ffmpeg -i "${audioPath}" -af "astats=metadata=1:reset=1" -f null - 2>&1`
      );

      // ノイズレベルを推定（RMSレベルとダイナミックレンジから）
      const rmsMatch = statsOutput.match(/RMS level dB: ([-\d.]+)/);
      const peakMatch = statsOutput.match(/Peak level dB: ([-\d.]+)/);

      const rmsLevel = rmsMatch ? parseFloat(rmsMatch[1]) : -30;
      const peakLevel = peakMatch ? parseFloat(peakMatch[1]) : -10;
      const dynamicRange = peakLevel - rmsLevel;

      // 周波数分析
      const { stdout: spectrumOutput } = await execAsync(
        `ffmpeg -i "${audioPath}" -af "showspectrumpic=s=1280x720" -frames:v 1 -f null - 2>&1`
      );

      // ノイズタイプと推奨レベルを決定
      let noiseType = NoiseType.MIXED;
      let noiseLevel = 0;
      let recommendedLevel = DenoiseLevel.NONE;

      // ダイナミックレンジが小さい = ノイズが多い
      if (dynamicRange < 10) {
        noiseLevel = 70;
        recommendedLevel = DenoiseLevel.STRONG;
        noiseType = NoiseType.WHITE_NOISE;
      } else if (dynamicRange < 20) {
        noiseLevel = 40;
        recommendedLevel = DenoiseLevel.MEDIUM;
        noiseType = NoiseType.ROOM_TONE;
      } else if (dynamicRange < 30) {
        noiseLevel = 15;
        recommendedLevel = DenoiseLevel.LIGHT;
        noiseType = NoiseType.BACKGROUND_HUM;
      }

      // RMSレベルが非常に低い = ノイズフロアが高い
      if (rmsLevel < -40) {
        noiseLevel = Math.max(noiseLevel, 50);
        recommendedLevel = DenoiseLevel.MEDIUM;
      }

      console.log(`✅ ノイズ分析完了:`);
      console.log(`   タイプ: ${noiseType}`);
      console.log(`   レベル: ${noiseLevel}%`);
      console.log(`   推奨除去レベル: ${recommendedLevel}`);

      return {
        type: noiseType,
        level: noiseLevel,
        recommendedLevel,
        spectralPeaks: []
      };
    } catch (error) {
      console.warn('⚠️ ノイズ分析に失敗、デフォルト値を使用:', error);
      return {
        type: NoiseType.MIXED,
        level: 30,
        recommendedLevel: DenoiseLevel.MEDIUM,
        spectralPeaks: []
      };
    }
  }

  /**
   * ノイズ除去フィルターを生成
   */
  private buildDenoiseFilter(level: DenoiseLevel, noiseType: NoiseType, preserveQuality: boolean): string {
    const filters: string[] = [];

    // 呼吸音・息遣い専用の処理
    if (noiseType === NoiseType.BREATH) {
      console.log('🌬️  呼吸音除去モード');

      // 1. ノイズゲート: -35dB以下の音を除去（呼吸音は通常-40dB～-30dB）
      filters.push('agate=threshold=-35dB:ratio=10:attack=10:release=100:makeup=2');

      // 2. ハイパスフィルター: 120Hz以下の低周波をカット（呼吸音は低周波が多い）
      filters.push('highpass=f=120:poles=2');

      // 3. FFTノイズ除去: 呼吸音の周波数帯を除去
      filters.push('afftdn=nf=-25:tn=1:om=o:tn=1');

      // 4. 無音区間の除去（start_periodsで開始部分の無音も除去）
      filters.push('silenceremove=start_periods=1:start_duration=0.1:start_threshold=-40dB:detection=peak');

      // 5. 音声帯域の強調（100Hz～8kHzを強調、それ以外を減衰）
      filters.push('lowpass=f=8000:poles=2');

      // レベルに応じた追加フィルター
      if (level === DenoiseLevel.STRONG || level === DenoiseLevel.AUTO) {
        // より強力な呼吸音除去
        filters.push('afftdn=nf=-30:tn=1');
        filters.push('silenceremove=stop_periods=-1:stop_duration=0.2:stop_threshold=-45dB');
      }

    } else {
      // 通常のノイズ除去処理
      switch (level) {
        case DenoiseLevel.LIGHT:
          // 軽度: 基本的なFFTノイズ除去
          filters.push('afftdn=nf=-20:tn=1');
          if (noiseType === NoiseType.BACKGROUND_HUM) {
            filters.push('highpass=f=80');  // 低周波ノイズ除去
          }
          break;

        case DenoiseLevel.MEDIUM:
          // 中度: より強力なノイズ除去
          filters.push('afftdn=nf=-25:tn=1');
          filters.push('highpass=f=100');
          filters.push('lowpass=f=8000');

          // クリック・ポップ音除去
          if (noiseType === NoiseType.CLICK_POP || noiseType === NoiseType.MIXED) {
            filters.push('adeclick=t=1');
            filters.push('adeclip');
          }
          break;

        case DenoiseLevel.STRONG:
          // 強度: 最大限のノイズ除去
          filters.push('afftdn=nf=-30:tn=1');
          filters.push('highpass=f=120');
          filters.push('lowpass=f=7000');
          filters.push('anlmdn=s=0.001:p=0.002:r=0.002:m=15');  // 適応型ノイズ除去

          // クリック・ポップ音除去
          filters.push('adeclick=t=1');
          filters.push('adeclip');

          // ホワイトノイズ除去
          if (noiseType === NoiseType.WHITE_NOISE) {
            filters.push('highpass=f=150');
          }
          break;

        case DenoiseLevel.NONE:
        default:
          return '';
      }
    }

    // 音質保持モード
    if (preserveQuality) {
      // ダイナミックレンジ圧縮を緩和
      filters.push('acompressor=threshold=-18dB:ratio=3:attack=20:release=250');
      // 軽いEQで音声を強調
      filters.push('equalizer=f=3000:t=h:width=1000:g=2');
    } else {
      // 標準的な音声正規化
      filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    }

    return filters.join(',');
  }

  /**
   * ノイズ除去処理を実行
   */
  async denoise(
    inputPath: string,
    outputPath: string,
    options: DenoiseOptions = {
      level: DenoiseLevel.MEDIUM,
      preserveQuality: true
    }
  ): Promise<void> {
    console.log(`🎙️ ノイズ除去開始: ${path.basename(inputPath)}`);
    console.log(`   レベル: ${options.level}`);
    console.log(`   音質保持: ${options.preserveQuality ? 'ON' : 'OFF'}`);

    // ファイルの存在確認
    if (!fs.existsSync(inputPath)) {
      throw new Error(`入力ファイルが見つかりません: ${inputPath}`);
    }

    let actualLevel = options.level;
    let noiseType = options.targetType || NoiseType.MIXED;

    // 自動検出モード
    if (options.level === DenoiseLevel.AUTO) {
      console.log('🔍 自動ノイズ検出モード');
      const analysis = await this.detectNoise(inputPath);
      actualLevel = analysis.recommendedLevel;
      noiseType = analysis.type;
      console.log(`   検出結果: ${actualLevel} (${noiseType})`);
    }

    // ノイズ除去なしの場合はコピー
    if (actualLevel === DenoiseLevel.NONE) {
      console.log('ℹ️ ノイズ除去なし、ファイルをコピー');
      fs.copyFileSync(inputPath, outputPath);
      return;
    }

    // フィルターを構築
    const filter = this.buildDenoiseFilter(actualLevel, noiseType, options.preserveQuality);

    // ffmpegコマンドを実行
    const command = `ffmpeg -i "${inputPath}" -af "${filter}" -ar 44100 -ac 1 -b:a 128k "${outputPath}" -y`;

    try {
      const { stderr } = await execAsync(command);

      // 処理時間をログから取得
      const timeMatch = stderr.match(/time=(\d+:\d+:\d+\.\d+)/);
      if (timeMatch) {
        console.log(`⏱️  処理時間: ${timeMatch[1]}`);
      }

      console.log(`✅ ノイズ除去完了: ${path.basename(outputPath)}`);

      // ファイルサイズを表示
      const stats = fs.statSync(outputPath);
      console.log(`   ファイルサイズ: ${(stats.size / 1024).toFixed(2)} KB`);

    } catch (error) {
      console.error('❌ ノイズ除去に失敗:', error);
      throw new Error(`ノイズ除去処理に失敗しました: ${error}`);
    }
  }

  /**
   * リアルタイム処理用のストリーミングノイズ除去
   * （将来の拡張用）
   */
  async denoiseStream(
    inputStream: NodeJS.ReadableStream,
    outputStream: NodeJS.WritableStream,
    options: DenoiseOptions
  ): Promise<void> {
    // TODO: ストリーミング処理の実装
    // ffmpegのパイプを使用してリアルタイム処理
    throw new Error('ストリーミング処理は未実装です');
  }

  /**
   * バッチ処理: 複数ファイルのノイズ除去
   */
  async denoiseBatch(
    files: Array<{ input: string; output: string }>,
    options: DenoiseOptions
  ): Promise<void> {
    console.log(`📦 バッチ処理開始: ${files.length}ファイル`);

    for (let i = 0; i < files.length; i++) {
      const { input, output } = files[i];
      console.log(`\n[${i + 1}/${files.length}] 処理中...`);
      await this.denoise(input, output, options);
    }

    console.log('\n✅ バッチ処理完了');
  }
}
