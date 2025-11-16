/**
 * ノイズ除去機能テスト
 */

import { AudioDenoiser, DenoiseLevel } from './src/narration/audio-denoiser.js';
import { NarrationGeneratorAgent } from './src/narration/narration-generator.js';
import path from 'path';
import fs from 'fs';

async function testDenoiseFeature() {
  console.log('🧪 ノイズ除去機能テスト開始\n');

  const testText = 'これはノイズ除去機能のテストです。音声にノイズ除去処理が適用されることを確認します。';

  try {
    // テスト1: ノイズ除去なし
    console.log('📝 テスト1: ノイズ除去なし');
    const generator1 = new NarrationGeneratorAgent(undefined, true);
    await generator1.generateFromText(testText, 'test_no_denoise.mp3');
    console.log('✅ テスト1完了\n');

    // テスト2: ノイズ除去あり（自動検出）
    console.log('📝 テスト2: ノイズ除去あり（自動検出）');
    const generator2 = new NarrationGeneratorAgent(undefined, true);
    generator2.setDenoiseOptions(true, {
      level: DenoiseLevel.AUTO,
      preserveQuality: true
    });
    await generator2.generateFromText(testText, 'test_denoise_auto.mp3');
    console.log('✅ テスト2完了\n');

    // テスト3: ノイズ除去あり（軽度）
    console.log('📝 テスト3: ノイズ除去あり（軽度）');
    const generator3 = new NarrationGeneratorAgent(undefined, true);
    generator3.setDenoiseOptions(true, {
      level: DenoiseLevel.LIGHT,
      preserveQuality: true
    });
    await generator3.generateFromText(testText, 'test_denoise_light.mp3');
    console.log('✅ テスト3完了\n');

    // テスト4: ノイズ除去あり（中度）
    console.log('📝 テスト4: ノイズ除去あり（中度）');
    const generator4 = new NarrationGeneratorAgent(undefined, true);
    generator4.setDenoiseOptions(true, {
      level: DenoiseLevel.MEDIUM,
      preserveQuality: true
    });
    await generator4.generateFromText(testText, 'test_denoise_medium.mp3');
    console.log('✅ テスト4完了\n');

    // テスト5: ノイズ除去あり（強度）
    console.log('📝 テスト5: ノイズ除去あり（強度）');
    const generator5 = new NarrationGeneratorAgent(undefined, true);
    generator5.setDenoiseOptions(true, {
      level: DenoiseLevel.STRONG,
      preserveQuality: false
    });
    await generator5.generateFromText(testText, 'test_denoise_strong.mp3');
    console.log('✅ テスト5完了\n');

    // ファイルサイズを比較
    console.log('\n📊 結果比較:');
    const outputDir = './output/narration';
    const files = [
      'test_no_denoise.mp3',
      'test_denoise_auto.mp3',
      'test_denoise_light.mp3',
      'test_denoise_medium.mp3',
      'test_denoise_strong.mp3'
    ];

    for (const file of files) {
      const filePath = path.join(outputDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`  ${file}: ${sizeKB} KB`);
      }
    }

    console.log('\n✅ すべてのテストが完了しました！');
    console.log(`📁 保存先: ${path.resolve(outputDir)}`);

  } catch (error) {
    console.error('❌ テスト失敗:', error);
    process.exit(1);
  }
}

// テスト実行
testDenoiseFeature().catch(console.error);
