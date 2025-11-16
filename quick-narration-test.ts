import 'dotenv/config';
import { NarrationGeneratorAgent } from './src/narration/narration-generator.js';

const shortTestText = `こんにちは。これはナレーション生成のテストです。ChatGPTとAIについて説明します。`;

async function main() {
  try {
    console.log('🎬 Starting quick narration test...\n');

    const generator = new NarrationGeneratorAgent();
    await generator.loadDictionary();
    await generator.generateFromText(shortTestText, 'quick_test.mp3');

    console.log('\n✅ Test completed successfully!');
    console.log('📁 Check ./output/narration/quick_test.mp3');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();
