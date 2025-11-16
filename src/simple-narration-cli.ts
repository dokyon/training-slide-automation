import 'dotenv/config';
import { NarrationGeneratorAgent } from './narration/narration-generator.js';
import * as readline from 'readline';
import { readFile } from 'fs/promises';

/**
 * シンプルなナレーション生成CLI
 * - テキストを直接入力してナレーション生成
 * - プログラミング知識不要で使える対話的インターフェース
 *
 * Usage:
 *   npm run tts
 */

interface PromptInput {
  text: string;
  filename: string;
}

async function promptUser(): Promise<PromptInput> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  console.log('\n===========================================');
  console.log('  ナレーション生成ツール');
  console.log('===========================================\n');

  // 入力モード選択
  console.log('📝 入力方法を選択してください:');
  console.log('  1. テキストを直接入力');
  console.log('  2. テキストファイルから読み込み\n');

  const mode = await question('番号を入力 (1 or 2): ');

  let text = '';

  if (mode === '2') {
    // ファイルから読み込み
    const filepath = await question('\nテキストファイルのパスを入力: ');
    try {
      text = await readFile(filepath.trim(), 'utf-8');
      console.log(`\n✅ ファイルを読み込みました (${text.length}文字)\n`);
    } catch (error) {
      console.error('❌ ファイルの読み込みに失敗しました:', error);
      rl.close();
      process.exit(1);
    }
  } else {
    // 直接入力
    console.log('\n📝 ナレーション用のテキストを入力してください。');
    console.log('   (入力完了後、空行でEnterを押してください)\n');

    const lines: string[] = [];
    while (true) {
      const line = await question('');
      if (line.trim() === '' && lines.length > 0) {
        break;
      }
      if (line.trim() !== '') {
        lines.push(line);
      }
    }
    text = lines.join('\n');
  }

  // ファイル名入力
  const filename = await question('\n💾 出力ファイル名を入力 (拡張子なし): ');

  rl.close();

  return {
    text: text.trim(),
    filename: filename.trim() || 'narration'
  };
}

async function main() {
  try {
    // APIキーチェック
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ Error: GEMINI_API_KEY environment variable is required.');
      console.error('   Set it in .env file or export it before running this command.');
      process.exit(1);
    }

    // ユーザー入力を取得
    const input = await promptUser();

    if (!input.text) {
      console.error('\n❌ テキストが入力されていません。');
      process.exit(1);
    }

    console.log('\n===========================================');
    console.log('  生成開始');
    console.log('===========================================\n');
    console.log(`📊 テキスト長: ${input.text.length}文字`);
    console.log(`💾 出力ファイル: ${input.filename}.mp3\n`);

    // 有料プランを使用（環境変数で制御可能）
    const usePaidTier = process.env.GEMINI_PAID_TIER !== 'false';
    const tierName = usePaidTier ? 'Paid tier' : 'Free tier';
    console.log(`🔧 Mode: ${tierName}\n`);

    // ナレーション生成
    const generator = new NarrationGeneratorAgent(undefined, usePaidTier);
    await generator.loadDictionary();

    console.log('🎙️  Generating audio...\n');

    await generator.generateFromText(input.text, `${input.filename}.mp3`);

    console.log('\n===========================================');
    console.log('  ✅ 生成完了！');
    console.log('===========================================\n');
    console.log(`📁 出力先: ./output/narration/${input.filename}.mp3\n`);

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
