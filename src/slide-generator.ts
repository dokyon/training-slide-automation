import pptxgen from 'pptxgenjs';
import {
  ScriptInput,
  Section,
  SlideGenerationResult,
  TableData
} from './types.js';
import { slideTemplates, brandColors, designRules } from './templates.js';

// @ts-ignore - pptxgenjs ESM support
const PptxGenJS = pptxgen.default || pptxgen;

/**
 * SlideGeneratorAgent - 台本からPowerPointスライドを自動生成
 *
 * デザイン要件:
 * - 文字がはみ出さない
 * - デザイン性: 2-3色（Stellaブランド + グレー + アクセント）
 * - 縦横ライン・インデント整列
 * - 全ページにページ番号（右下）
 * - 具体例・数字・状況描写を含む
 * - 絵文字禁止、ビジネス文書として中立的
 */
export class SlideGeneratorAgent {
  private pptx: any;
  private branding!: ScriptInput['branding'];
  private slideNumber: number = 0;
  private logoPath: string = './assets/stella-logo.png';

  constructor() {
    this.pptx = new PptxGenJS();
    this.pptx.layout = 'LAYOUT_16x9';
    this.pptx.author = 'Stella Co., Ltd.';

    // 日本語フォントのデフォルト設定
    this.pptx.defineSlideMaster({
      title: 'DEFAULT',
      objects: []
    });
  }

  /**
   * テキストサニタイズ（まじん式v3準拠）
   * - 禁止記号の除去
   * - 箇条書き文末の句点除去
   * - 絵文字除去
   */
  private sanitizeText(text: string, type: 'title' | 'subhead' | 'bullet' = 'bullet'): string {
    if (!text) return '';

    let sanitized = text;

    // 禁止記号の除去
    designRules.forbidden.symbols.forEach(symbol => {
      sanitized = sanitized.replace(new RegExp(symbol, 'g'), '');
    });

    // 絵文字の除去（Unicode絵文字範囲）
    if (designRules.forbidden.emoji) {
      sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // 顔文字
      sanitized = sanitized.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // シンボル
      sanitized = sanitized.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // 乗り物
      sanitized = sanitized.replace(/[\u{2600}-\u{26FF}]/gu, ''); // その他記号
      sanitized = sanitized.replace(/[\u{2700}-\u{27BF}]/gu, ''); // 装飾記号
    }

    // 箇条書きの場合、文末の句点を除去
    if (type === 'bullet') {
      designRules.forbidden.punctuation.forEach(punct => {
        if (sanitized.endsWith(punct)) {
          sanitized = sanitized.slice(0, -1);
        }
      });
    }

    // 文字数制限チェック（警告のみ）
    const limit = designRules.textLimits[type];
    if (limit && sanitized.length > limit) {
      console.warn(`⚠️ Text exceeds limit (${type}: ${sanitized.length}/${limit} chars): "${sanitized.substring(0, 50)}..."`);
    }

    return sanitized.trim();
  }

  /**
   * 箇条書き配列のサニタイズ
   */
  private sanitizeBullets(bullets: string[]): string[] {
    return bullets.map(bullet => this.sanitizeText(bullet, 'bullet'));
  }

  /**
   * 台本からスライドを生成
   */
  async generate(script: ScriptInput): Promise<SlideGenerationResult> {
    const startTime = Date.now();
    this.branding = script.branding;

    try {
      console.log(`🎨 Generating slides for: ${script.title}`);

      // 各セクションのスライドを生成
      for (const section of script.sections) {
        await this.generateSlide(section);
      }

      // ファイル出力
      const filename = `${script.title.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
      const outputPath = `./output/${filename}`;

      await this.pptx.writeFile({ fileName: outputPath });

      const durationMs = Date.now() - startTime;
      console.log(`✅ Slides generated: ${outputPath} (${durationMs}ms)`);

      return {
        status: 'success',
        filename: outputPath,
        slideCount: script.sections.length,
        metrics: {
          durationMs,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Slide generation failed:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * セクションタイプに応じたスライドを生成
   */
  private async generateSlide(section: Section): Promise<void> {
    console.log(`  📄 Generating slide: ${section.type} - ${section.title}`);

    // ページ番号をインクリメント
    this.slideNumber++;

    switch (section.type) {
      case 'title':
        this.generateTitleSlide(section);
        break;
      case 'sectionDivider':
        this.generateSectionDividerSlide(section);
        break;
      case 'content':
        this.generateContentSlide(section);
        break;
      case 'table':
        this.generateTableSlide(section);
        break;
      case 'codeBlock':
        this.generateCodeBlockSlide(section);
        break;
      case 'screenshot':
        this.generateScreenshotSlide(section);
        break;
      default:
        console.warn(`⚠️  Unknown slide type: ${section.type}`);
    }
  }

  /**
   * タイトルスライド生成（デザイン改善版 + まじん式v3準拠）
   */
  private generateTitleSlide(section: Section): void {
    const slide = this.pptx.addSlide();

    // 背景
    slide.background = { color: 'FFFFFF' };

    // 上部アクセントライン
    slide.addShape(this.pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.05,
      fill: { color: brandColors.primary }
    });

    // ロゴ画像（左上）- タイトルスライドのみ大きめに
    try {
      slide.addImage({
        path: this.logoPath,
        x: 0.5,
        y: 0.5,
        w: 2.5,
        h: 0.58
      });
    } catch (error) {
      slide.addText(this.branding.company, {
        x: 0.5,
        y: 0.5,
        w: 2.5,
        h: 0.58,
        fontSize: 14,
        color: brandColors.primary,
        bold: true,
        fontFace: 'Yu Gothic'
      });
    }

    // タイトル（サニタイズ適用）
    slide.addText(this.sanitizeText(section.title, 'title'), {
      x: 0.8,
      y: 2,
      w: 11.7,
      h: 1.5,
      fontSize: 36,
      bold: true,
      color: '333333',
      align: 'left',
      fontFace: 'Yu Gothic',
      lang: 'ja-JP',
      lineSpacing: 40
    });

    // サブタイトル（サニタイズ適用）
    if (section.subtitle) {
      slide.addText(this.sanitizeText(section.subtitle, 'subhead'), {
        x: 0.8,
        y: 3.7,
        w: 11.7,
        h: 0.6,
        fontSize: 18,
        color: '666666',
        align: 'left',
        fontFace: 'Yu Gothic',
        lang: 'ja-JP'
      });
    }

    // 目次（箇条書き・サニタイズ適用）
    if (section.bullets) {
      const sanitizedBullets = this.sanitizeBullets(section.bullets);
      const content = sanitizedBullets.map((b, i) => `${i + 1}.  ${b}`).join('\n');

      slide.addText(content, {
        x: 1.5,
        y: 4.5,
        w: 11,
        h: 2.2,
        fontSize: 15,
        color: '555555',
        align: 'left',
        valign: 'top',
        fontFace: 'Yu Gothic',
        lang: 'ja-JP',
        lineSpacing: 32
      });
    }

    // ページ番号と著作権のみ（ロゴは上部に配置済み）
    const textColor = '666666';
    slide.addText(`© ${this.branding.company}`, {
      x: 0.5,
      y: 7.1,
      w: 3,
      h: 0.3,
      fontSize: 9,
      color: textColor,
      fontFace: 'Yu Gothic'
    });

    if (this.slideNumber > 0) {
      slide.addText(`${this.slideNumber}`, {
        x: 12.5,
        y: 7.1,
        w: 0.5,
        h: 0.3,
        fontSize: 11,
        color: textColor,
        align: 'right',
        fontFace: 'Yu Gothic'
      });
    }
  }

  /**
   * セクション分割スライド生成（グラデーション背景 + イラスト）
   */
  private generateSectionDividerSlide(section: Section): void {
    const slide = this.pptx.addSlide();

    // グラデーション背景
    slide.background = { color: brandColors.primary };

    // 装飾フレーム（左上）
    slide.addShape(this.pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.5,
      w: 3,
      h: 3,
      fill: { type: 'solid', color: 'FFFFFF', transparency: 90 },
      line: { color: 'FFFFFF', width: 2 }
    });

    // タイトル
    slide.addText(section.title, {
      x: 1,
      y: 2,
      w: 6,
      h: 2,
      fontSize: 48,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle'
    });

    // イラストプレースホルダー（右側）
    // 注: 実際のイラストAPIは今後の実装で追加
    slide.addText('🎨\nIllustration', {
      x: 7,
      y: 2.5,
      w: 4,
      h: 3,
      fontSize: 24,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle'
    });

    // ブランディング
    this.addBranding(slide, true); // 白文字版
  }

  /**
   * コンテンツスライド生成（箇条書き）- デザイン改善版 + まじん式v3準拠
   */
  private generateContentSlide(section: Section): void {
    const slide = this.pptx.addSlide();

    // 背景
    slide.background = { color: 'FFFFFF' };

    // 上部アクセントライン
    slide.addShape(this.pptx.ShapeType.rect, {
      x: 0,
      y: 0.7,
      w: 13.33,
      h: 0.02,
      fill: { color: brandColors.primary }
    });

    // タイトル（サニタイズ適用）
    slide.addText(this.sanitizeText(section.title, 'title'), {
      x: 0.5,
      y: 0.85,
      w: 10.5,
      h: 0.7,
      fontSize: 22,
      bold: true,
      color: '333333',
      align: 'left',
      fontFace: 'Yu Gothic',
      lang: 'ja-JP'
    });

    // サブタイトル（目安時間など・サニタイズ適用）
    if (section.subtitle) {
      slide.addText(this.sanitizeText(section.subtitle, 'subhead'), {
        x: 11.2,
        y: 0.88,
        w: 1.8,
        h: 0.4,
        fontSize: 11,
        color: '999999',
        align: 'right',
        fontFace: 'Yu Gothic',
        lang: 'ja-JP'
      });
    }

    // ナレーション（サニタイズ適用）
    let contentY = 1.8;
    if (section.narration) {
      slide.addText(this.sanitizeText(section.narration), {
        x: 0.8,
        y: contentY,
        w: 11.7,
        h: 1,
        fontSize: 14,
        color: '555555',
        align: 'left',
        valign: 'top',
        fontFace: 'Yu Gothic',
        lang: 'ja-JP',
        lineSpacing: 28,
        breakLine: true,
        wrap: true
      });
      contentY += 1.3;
    }

    // 箇条書き（サニタイズ適用）
    if (section.bullets && section.bullets.length > 0) {
      const sanitizedBullets = this.sanitizeBullets(section.bullets);
      const bulletText = sanitizedBullets.join('\n\n');
      const availableHeight = 6.5 - contentY;

      slide.addText(bulletText, {
        x: 0.9,
        y: contentY,
        w: 11.5,
        h: availableHeight,
        fontSize: 14,
        color: '333333',
        align: 'left',
        valign: 'top',
        fontFace: 'Yu Gothic',
        lang: 'ja-JP',
        lineSpacing: 26,
        bullet: sanitizedBullets.some(b => b.trim().length > 0),
        breakLine: true,
        wrap: true
      });
    }

    // ブランディング
    this.addBranding(slide);
  }

  /**
   * テーブルスライド生成
   */
  private generateTableSlide(section: Section): void {
    const slide = this.pptx.addSlide();
    const template = slideTemplates.table;

    // 背景
    slide.background = { color: template.background as string };

    // タイトル
    slide.addText(section.title, {
      x: 0.5,
      y: 0.4,
      w: 12,
      h: 0.7,
      fontSize: 24,
      bold: true,
      color: '333333',
      align: 'left',
      fontFace: 'Yu Gothic',
      lang: 'ja-JP'
    });

    // テーブル
    if (section.table) {
      const tableData = section.table;

      // ヘッダー行
      const headerRow = tableData.headers.map(h => ({
        text: h,
        options: {
          bold: true,
          color: 'FFFFFF',
          fill: { color: brandColors.primary },
          align: 'center',
          valign: 'middle',
          fontFace: 'Yu Gothic',
          fontSize: 13
        }
      }));

      // データ行
      const dataRows = tableData.rows.map(row =>
        row.map((cell, colIndex) => ({
          text: cell,
          options: {
            fill: { color: 'FFFFFF' },
            align: 'left',
            valign: 'top',
            fontFace: 'Yu Gothic',
            fontSize: colIndex === 3 ? 10 : 11, // イメージ列は小さく
            margin: [0.08, 0.08, 0.08, 0.08],
            breakLine: true
          }
        }))
      );

      const rows = [headerRow, ...dataRows];

      // カラム幅を手動設定
      const colW = [0.4, 1.3, 4, 6.3]; // #, 必要な要素, 概要, イメージ

      slide.addTable(rows, {
        x: 0.3,
        y: 1.5,
        w: 12,
        colW: colW,
        rowH: [0.5, ...Array(dataRows.length).fill(1.5)],
        border: { pt: 1, color: 'DDDDDD' },
        fontFace: 'Yu Gothic',
        fontSize: 11,
        lang: 'ja-JP',
        autoPage: false,
        autoPageRepeatHeader: false
      });
    }

    // ブランディング
    this.addBranding(slide);
  }

  /**
   * コードブロックスライド生成
   */
  private generateCodeBlockSlide(section: Section): void {
    const slide = this.pptx.addSlide();

    // 背景
    slide.background = { color: 'FFFFFF' };

    // タイトル
    slide.addText(section.title, {
      x: 0.5,
      y: 0.4,
      w: 12,
      h: 0.7,
      fontSize: 24,
      bold: true,
      color: '333333',
      align: 'left',
      fontFace: 'Yu Gothic',
      lang: 'ja-JP'
    });

    // コードブロック（ダークモード背景）
    if (section.code) {
      // 背景ボックス
      slide.addShape(this.pptx.ShapeType.rect, {
        x: 0.8,
        y: 1.5,
        w: 11.7,
        h: 5,
        fill: { type: 'solid', color: '2D2D2D' }
      });

      // コード
      slide.addText(section.code.code, {
        x: 1,
        y: 1.7,
        w: 11.3,
        h: 4.6,
        fontSize: 13,
        color: 'FFFFFF',
        fontFace: 'Consolas',
        align: 'left',
        valign: 'top',
        lineSpacing: 20
      });
    }

    // ブランディング
    this.addBranding(slide);
  }

  /**
   * スクリーンショットスライド生成
   */
  private generateScreenshotSlide(section: Section): void {
    const slide = this.pptx.addSlide();

    // 背景
    slide.background = { color: 'F5F5F5' };

    // タイトル
    slide.addText(section.title, {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: '333333'
    });

    // 説明文
    if (section.narration) {
      slide.addText(section.narration, {
        x: 0.5,
        y: 1.5,
        w: '90%',
        h: 0.8,
        fontSize: 16,
        color: '666666'
      });
    }

    // スクリーンショット画像プレースホルダー
    slide.addText('📷 Screenshot\nPlaceholder', {
      x: 2,
      y: 2.5,
      w: 9,
      h: 3.5,
      fontSize: 24,
      color: '999999',
      align: 'center',
      valign: 'middle',
      fill: { color: 'FFFFFF' },
      line: { color: 'CCCCCC', width: 1, dashType: 'dash' }
    });

    // ブランディング
    this.addBranding(slide);
  }

  /**
   * ブランディング要素を追加（ロゴ、ページ番号、著作権）
   */
  private addBranding(slide: any, whiteText = false): void {
    const textColor = whiteText ? 'FFFFFF' : '666666';

    // ロゴ画像（左上）
    try {
      slide.addImage({
        path: this.logoPath,
        x: 0.3,
        y: 0.25,
        w: 1.5,
        h: 0.35
      });
    } catch (error) {
      // ロゴ画像が見つからない場合はテキストで代替
      slide.addText(this.branding.company, {
        x: 0.3,
        y: 0.25,
        w: 2,
        h: 0.35,
        fontSize: 11,
        color: brandColors.primary,
        bold: true,
        fontFace: 'Yu Gothic'
      });
    }

    // ページ番号（右下）
    if (this.slideNumber > 0) {
      slide.addText(`${this.slideNumber}`, {
        x: 12.5,
        y: 7.1,
        w: 0.5,
        h: 0.3,
        fontSize: 11,
        color: textColor,
        align: 'right',
        fontFace: 'Yu Gothic'
      });
    }

    // 著作権表示（左下）
    slide.addText(`© ${this.branding.company}`, {
      x: 0.3,
      y: 7.1,
      w: 3,
      h: 0.3,
      fontSize: 9,
      color: textColor,
      fontFace: 'Yu Gothic'
    });
  }
}
