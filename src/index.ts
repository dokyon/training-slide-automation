import { SlideGeneratorAgent } from './slide-generator.js';
import { sampleScript } from './sample-script.js';
import { ScriptInput } from './types.js';
import { mkdirSync, existsSync, readFileSync } from 'fs';
import * as path from 'path';

/**
 * メインエントリーポイント
 * サンプル台本またはJSONファイルからスライドを生成
 */
async function main() {
  console.log('🚀 Miyabi Slide Generator - Starting...\n');

  // 出力ディレクトリの作成
  if (!existsSync('./output')) {
    mkdirSync('./output', { recursive: true });
    console.log('📁 Created output directory\n');
  }

  // スクリプトの読み込み（コマンドライン引数があればJSONから、なければsampleScript）
  let script: ScriptInput;
  const scriptPath = process.argv[2];

  if (scriptPath) {
    // JSONファイルから読み込み
    const fullPath = path.resolve(scriptPath);
    console.log(`📖 Loading script from: ${fullPath}\n`);
    const scriptData = readFileSync(fullPath, 'utf-8');
    script = JSON.parse(scriptData);
  } else {
    // デフォルトのサンプルスクリプトを使用
    console.log('📖 Using default sample script\n');
    script = sampleScript;
  }

  // SlideGeneratorAgentの初期化
  const generator = new SlideGeneratorAgent();

  // スライド生成
  console.log('📊 Script Details:');
  console.log(`   Title: ${script.title}`);
  console.log(`   Duration: ${script.duration}`);
  console.log(`   Sections: ${script.sections.length}`);
  console.log(`   Company: ${script.branding.company}\n`);

  const result = await generator.generate(script);

  // 結果表示
  console.log('\n📈 Generation Result:');
  console.log(`   Status: ${result.status}`);
  if (result.status === 'success') {
    console.log(`   Filename: ${result.filename}`);
    console.log(`   Slide Count: ${result.slideCount}`);
    console.log(`   Duration: ${result.metrics?.durationMs}ms`);
    console.log('\n✨ Success! Open the PowerPoint file to view the slides.');
  } else {
    console.log(`   Error: ${result.error}`);
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { main };
