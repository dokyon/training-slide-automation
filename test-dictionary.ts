import { NarrationGeneratorAgent } from './src/narration/narration-generator.js';

/**
 * 辞書機能のテスト
 * - Gemini TTSに送信される前にテキストが正しく置換されているかを確認
 */
async function testDictionary() {
  console.log('🧪 Testing dictionary functionality...\n');

  // ダミーのAPIキーを使用（辞書機能のテストのみなのでAPI呼び出しはしない）
  const generator = new NarrationGeneratorAgent('dummy-key-for-testing');
  await generator.loadDictionary();

  // テストテキスト（意図的に誤読されやすい用語を含む）
  const testCases = [
    {
      input: 'ChatGPTはAIです。OpenAIが開発しました。',
      expected: 'チャットジーピーティーはエーアイです。オープンエーアイが開発しました。'
    },
    {
      input: 'LLMとGPTの違いは何ですか？APIを使います。',
      expected: 'エルエルエムとジーピーティーの違いは何ですか？エーピーアイを使います。'
    },
    {
      input: 'chatgpt、CHATGPT、ChatGPT すべて同じです。',
      expected: 'チャットジーピーティー、チャットジーピーティー、チャットジーピーティー すべて同じです。'
    },
    {
      input: 'StellaはSaaSサービスです。ExcelやPDFに対応。',
      expected: 'ステラはサースサービスです。エクセルやピーディーエフに対応。'
    }
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];

    // @ts-ignore - private method access for testing
    const result = generator['applyDictionary'](testCase.input);

    const passed = result === testCase.expected;

    console.log(`Test ${i + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Input:    "${testCase.input}"`);
    console.log(`  Expected: "${testCase.expected}"`);
    console.log(`  Got:      "${result}"`);
    console.log();

    if (passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  }

  console.log('📊 Test Summary:');
  console.log(`  ✅ Passed: ${passedCount}/${testCases.length}`);
  console.log(`  ❌ Failed: ${failedCount}/${testCases.length}`);

  if (failedCount === 0) {
    console.log('\n🎉 All tests passed! Dictionary is working perfectly.');
  } else {
    console.log('\n⚠️  Some tests failed. Dictionary needs adjustment.');
  }
}

testDictionary();
