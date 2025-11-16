// 研修台本の型定義

export interface ScriptInput {
  title: string;
  duration: string; // "15分"
  branding: BrandingConfig;
  sections: Section[];
}

export interface BrandingConfig {
  company: string;
  logo?: string; // ロゴ画像のパス
  primaryColor: string; // "#5FB8A6"
  secondaryColor?: string;
  font?: string;
}

export interface Section {
  type: 'title' | 'sectionDivider' | 'content' | 'table' | 'codeBlock' | 'screenshot';
  title: string;
  subtitle?: string;
  narration?: string;
  bullets?: string[];
  keywords?: string[]; // イラスト検索用
  table?: TableData;
  code?: CodeBlock;
  screenshot?: ScreenshotData;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  headerColor?: string;
}

export interface CodeBlock {
  language: string;
  code: string;
  description?: string;
}

export interface ScreenshotData {
  imagePath: string;
  annotations?: Annotation[];
}

export interface Annotation {
  x: number;
  y: number;
  text: string;
  color: string;
}

// スライドテンプレート

export interface SlideTemplate {
  layout: string;
  background: string | GradientConfig;
  titleStyle: TextStyle;
  contentStyle?: TextStyle;
  illustration?: IllustrationConfig;
}

export interface GradientConfig {
  type: 'linear';
  angle: number;
  stops: Array<{ position: number; color: string }>;
}

export interface TextStyle {
  fontSize: number;
  bold?: boolean;
  color: string;
  align?: 'left' | 'center' | 'right';
  font?: string;
}

export interface IllustrationConfig {
  position: 'right' | 'left' | 'center';
  width: number;
  height: number;
  keywords: string[];
}

// SlideGeneratorAgentの出力

export interface SlideGenerationResult {
  status: 'success' | 'error';
  filename?: string;
  slideCount?: number;
  error?: string;
  metrics?: {
    durationMs: number;
    timestamp: string;
  };
}
