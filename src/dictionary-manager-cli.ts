import 'dotenv/config';
import { readFile, writeFile } from 'fs/promises';
import * as readline from 'readline';
import path from 'path';

/**
 * 辞書管理CLI
 * - プログラミング知識不要で辞書を管理
 * - ワードの追加・削除・一覧表示
 *
 * Usage:
 *   npm run dict
 */

const DICTIONARY_PATH = './src/narration/dictionary.json';

interface Dictionary {
  description: string;
  replacements: Record<string, string>;
}

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

async function loadDictionary(): Promise<Dictionary> {
  try {
    const data = await readFile(DICTIONARY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ 辞書ファイルの読み込みに失敗しました:', error);
    process.exit(1);
  }
}

async function saveDictionary(dictionary: Dictionary): Promise<void> {
  try {
    const json = JSON.stringify(dictionary, null, 2);
    await writeFile(DICTIONARY_PATH, json, 'utf-8');
    console.log('✅ 辞書を保存しました。\n');
  } catch (error) {
    console.error('❌ 辞書ファイルの保存に失敗しました:', error);
    process.exit(1);
  }
}

async function listWords(dictionary: Dictionary): Promise<void> {
  console.log('\n===========================================');
  console.log('  登録されているワード一覧');
  console.log('===========================================\n');

  const entries = Object.entries(dictionary.replacements);

  if (entries.length === 0) {
    console.log('📋 登録されているワードはありません。\n');
    return;
  }

  console.log(`📋 合計 ${entries.length} 件\n`);

  // 最大20件表示（多すぎる場合）
  const displayEntries = entries.slice(0, 20);

  displayEntries.forEach(([word, reading], index) => {
    console.log(`${index + 1}. "${word}" → "${reading}"`);
  });

  if (entries.length > 20) {
    console.log(`\n... 他 ${entries.length - 20} 件`);
  }

  console.log();
}

async function addWord(dictionary: Dictionary): Promise<void> {
  console.log('\n===========================================');
  console.log('  ワードを追加');
  console.log('===========================================\n');

  const word = await question('📝 元のワード（例: ChatGPT）: ');
  const reading = await question('🔊 読み方（例: チャットジーピーティー）: ');

  if (!word.trim() || !reading.trim()) {
    console.log('❌ ワードまたは読み方が入力されていません。\n');
    return;
  }

  // 既存のワードか確認
  if (dictionary.replacements[word.trim()]) {
    console.log(`\n⚠️  "${word.trim()}" は既に登録されています。`);
    console.log(`   現在の読み方: "${dictionary.replacements[word.trim()]}"`);
    const confirm = await question('   上書きしますか？ (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ キャンセルしました。\n');
      return;
    }
  }

  dictionary.replacements[word.trim()] = reading.trim();
  await saveDictionary(dictionary);

  console.log(`✅ "${word.trim()}" → "${reading.trim()}" を追加しました。\n`);
}

async function removeWord(dictionary: Dictionary): Promise<void> {
  console.log('\n===========================================');
  console.log('  ワードを削除');
  console.log('===========================================\n');

  const word = await question('🗑️  削除するワード: ');

  if (!word.trim()) {
    console.log('❌ ワードが入力されていません。\n');
    return;
  }

  if (!dictionary.replacements[word.trim()]) {
    console.log(`❌ "${word.trim()}" は辞書に登録されていません。\n`);
    return;
  }

  console.log(`\n現在の読み方: "${dictionary.replacements[word.trim()]}"`);
  const confirm = await question('本当に削除しますか？ (y/n): ');

  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ キャンセルしました。\n');
    return;
  }

  delete dictionary.replacements[word.trim()];
  await saveDictionary(dictionary);

  console.log(`✅ "${word.trim()}" を削除しました。\n`);
}

async function searchWord(dictionary: Dictionary): Promise<void> {
  console.log('\n===========================================');
  console.log('  ワードを検索');
  console.log('===========================================\n');

  const keyword = await question('🔍 検索キーワード: ');

  if (!keyword.trim()) {
    console.log('❌ キーワードが入力されていません。\n');
    return;
  }

  const results = Object.entries(dictionary.replacements)
    .filter(([word, reading]) =>
      word.toLowerCase().includes(keyword.toLowerCase()) ||
      reading.includes(keyword)
    );

  if (results.length === 0) {
    console.log(`\n❌ "${keyword}" に一致するワードは見つかりませんでした。\n`);
    return;
  }

  console.log(`\n✅ ${results.length} 件見つかりました:\n`);

  results.forEach(([word, reading], index) => {
    console.log(`${index + 1}. "${word}" → "${reading}"`);
  });

  console.log();
}

async function showMenu(): Promise<void> {
  console.log('\n===========================================');
  console.log('  辞書管理ツール');
  console.log('===========================================\n');
  console.log('1. ワード一覧を表示');
  console.log('2. ワードを追加');
  console.log('3. ワードを削除');
  console.log('4. ワードを検索');
  console.log('5. 終了\n');
}

async function main() {
  console.log('\n🎙️  ナレーション辞書管理ツール\n');

  const dictionary = await loadDictionary();

  console.log(`📖 辞書ファイル: ${DICTIONARY_PATH}`);
  console.log(`📊 登録ワード数: ${Object.keys(dictionary.replacements).length}\n`);

  while (true) {
    await showMenu();

    const choice = await question('番号を選択: ');

    switch (choice.trim()) {
      case '1':
        await listWords(dictionary);
        break;

      case '2':
        await addWord(dictionary);
        break;

      case '3':
        await removeWord(dictionary);
        break;

      case '4':
        await searchWord(dictionary);
        break;

      case '5':
        console.log('\n👋 終了します。\n');
        rl.close();
        process.exit(0);

      default:
        console.log('\n❌ 無効な選択です。1-5 の番号を入力してください。\n');
    }
  }
}

main();
