import { SlideTemplate } from './types.js';

/**
 * Stella Co., Ltd.のブランドカラーに基づいたスライドテンプレート
 */
export const slideTemplates: Record<string, SlideTemplate> = {
  // タイトルスライド
  title: {
    layout: 'titleOnly',
    background: '#FFFFFF',
    titleStyle: {
      fontSize: 32,
      bold: true,
      color: '333333',
      align: 'left'
    },
    contentStyle: {
      fontSize: 18,
      color: '666666',
      align: 'left'
    }
  },

  // セクション分割スライド（グラデーション背景）
  sectionDivider: {
    layout: 'twoColumn',
    background: {
      type: 'linear',
      angle: 135,
      stops: [
        { position: 0, color: '5FB8A6' }, // ターコイズグリーン
        { position: 100, color: '4A9D8E' } // ダークターコイズ
      ]
    },
    titleStyle: {
      fontSize: 48,
      bold: true,
      color: 'FFFFFF',
      align: 'left'
    },
    illustration: {
      position: 'right',
      width: 4,
      height: 3,
      keywords: ['business', 'team', 'collaboration']
    }
  },

  // コンテンツスライド（箇条書き）
  content: {
    layout: 'bulletPoints',
    background: '#FFFFFF',
    titleStyle: {
      fontSize: 28,
      bold: true,
      color: '333333',
      align: 'left'
    },
    contentStyle: {
      fontSize: 18,
      color: '333333',
      align: 'left'
    }
  },

  // テーブルスライド
  table: {
    layout: 'table',
    background: '#FFFFFF',
    titleStyle: {
      fontSize: 28,
      bold: true,
      color: '333333',
      align: 'left'
    },
    contentStyle: {
      fontSize: 16,
      color: '333333',
      align: 'center'
    }
  },

  // コードブロックスライド
  codeBlock: {
    layout: 'code',
    background: '#FFFFFF',
    titleStyle: {
      fontSize: 28,
      bold: true,
      color: '333333',
      align: 'left'
    },
    contentStyle: {
      fontSize: 14,
      color: 'FFFFFF',
      align: 'left',
      font: 'Courier New'
    }
  },

  // スクリーンショットスライド
  screenshot: {
    layout: 'image',
    background: '#FFFFFF',
    titleStyle: {
      fontSize: 28,
      bold: true,
      color: '333333',
      align: 'left'
    },
    contentStyle: {
      fontSize: 16,
      color: '666666',
      align: 'left'
    }
  }
};

/**
 * ブランドカラーパレット（まじん式v3準拠）
 * Stella Co., Ltd.のブランドカラーから派生色を生成
 */
export const brandColors = {
  primary: '5FB8A6', // ターコイズグリーン（メインカラー）
  secondary: '4A9D8E', // ダークターコイズ
  accent: '3D8A7D', // さらに濃いターコイズ
  text: '333333', // ダークグレー（本文）
  textLight: '666666', // ライトグレー（補助テキスト）
  textMuted: '999999', // さらにライト（時間表示等）
  background: 'FFFFFF', // ホワイト
  backgroundLight: 'F5F5F5', // ライトグレー背景
  backgroundTinted: 'F8F9FA', // 薄くティントされた背景
  error: 'E74C3C', // レッド
  success: '27AE60' // グリーン
};

/**
 * まじん式v3デザインルール
 *
 * ■ テキスト制限（はみ出し防止）
 * - title: 全角40文字以内
 * - subhead: 全角50文字以内（最大2行）
 * - 箇条書き要素: 各90文字以内・改行禁止
 *
 * ■ 禁止事項
 * - 絵文字使用禁止
 * - 矢印記号（→）禁止（装飾はスクリプトが描画）
 * - 四角記号（■）禁止
 * - 箇条書き文末の句点（。）禁止（体言止め推奨）
 *
 * ■ デザイン原則
 * - カラー: 2-3色統一（Stellaブランド + グレー階調 + アクセント1色）
 * - 余白: 適切な余白と行間を確保
 * - 整列: 縦横ライン・インデントを厳密に揃える
 * - ページ番号: 全ページ右下に配置
 * - ロゴ: 全ページ左上に配置
 */
export const designRules = {
  textLimits: {
    title: 40, // 全角文字数
    subhead: 50,
    bullet: 90,
    maxLines: {
      subhead: 2
    }
  },
  forbidden: {
    symbols: ['→', '■', '⇒', '▶'],
    punctuation: ['。'], // 箇条書き文末のみ
    emoji: true
  },
  layout: {
    pageNumber: {
      position: 'right-bottom',
      x: 12.5,
      y: 7.1
    },
    logo: {
      position: 'left-top',
      x: 0.3,
      y: 0.25,
      width: 1.5,
      height: 0.35
    },
    accentLine: {
      height: 0.02,
      color: brandColors.primary
    }
  }
};
