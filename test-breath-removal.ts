import { AudioDenoiser, DenoiseLevel, NoiseType } from './src/narration/audio-denoiser.js';

/**
 * 呼吸音除去テストスクリプト
 */
async function testBreathRemoval() {
  const inputFile = '/Users/dosakakyohei/Documents/narration_1766551884652.mp3';
  const outputFile = '/Users/dosakakyohei/Documents/narration_1766551884652_no_breath.mp3';

  console.log('🌬️  呼吸音除去テスト開始');
  console.log(`入力: ${inputFile}`);
  console.log(`出力: ${outputFile}\n`);

  const denoiser = new AudioDenoiser();

  try {
    await denoiser.denoise(inputFile, outputFile, {
      level: DenoiseLevel.AUTO,
      preserveQuality: true,
      targetType: NoiseType.BREATH
    });

    console.log('\n✅ 呼吸音除去完了！');
    console.log(`処理後のファイル: ${outputFile}`);
  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  }
}

testBreathRemoval();
