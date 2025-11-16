import { NarrationGeneratorAgent } from './narration/narration-generator.js';
import { ScriptInput } from './types.js';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * ナレーション生成CLI
 *
 * Usage:
 *   npm run narration <script-json-path>
 *   例: npm run narration scripts/chapter1-detailed.json
 */
async function main() {
  const scriptPath = process.argv[2];

  if (!scriptPath) {
    console.error('❌ Usage: npm run narration <script-json-path>');
    console.error('   Example: npm run narration scripts/chapter1-detailed.json');
    process.exit(1);
  }

  try {
    // JSONファイルを読み込み
    const fullPath = path.resolve(scriptPath);
    console.log(`📖 Loading script from: ${fullPath}\n`);

    const scriptData = await readFile(fullPath, 'utf-8');
    const script: ScriptInput = JSON.parse(scriptData);

    console.log(`📊 Script Details:`);
    console.log(`   Title: ${script.title}`);
    console.log(`   Duration: ${script.duration}`);
    console.log(`   Sections: ${script.sections.length}`);
    console.log(`   Company: ${script.branding.company}\n`);

    // ナレーション生成
    // 環境変数でFree/Paidティアを切り替え（デフォルト: Free tier）
    const usePaidTier = process.env.GEMINI_PAID_TIER === 'true';
    const tierName = usePaidTier ? 'Paid tier (1秒待機)' : 'Free tier (35秒待機)';
    console.log(`🔧 Mode: ${tierName}\n`);

    const generator = new NarrationGeneratorAgent(undefined, usePaidTier);
    const result = await generator.generate(script);

    if (result.status === 'success') {
      console.log('\n✅ Narration generation successful!');
      console.log(`📁 Output directory: ./output/narration`);
      console.log(`📊 Generated files: ${result.files?.length || 0}`);

      if (result.files && result.files.length > 0) {
        console.log('\n📝 Generated files:');
        result.files.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.filename}`);
          console.log(`      Section: ${file.sectionTitle}`);
        });
      }

      console.log(`\n⏱️  Total time: ${result.metrics.durationMs}ms`);
      console.log(`📊 Success rate: ${result.metrics.successCount}/${result.metrics.totalSections}`);

    } else {
      console.error('\n❌ Narration generation failed!');
      console.error(`Error: ${result.error || 'Unknown error'}`);
      console.error(`Failed sections: ${result.metrics.failureCount}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
