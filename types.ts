export enum Platform {
  YouTube = 'YouTube',
  Shorts = 'Shorts',
  Reels = 'Reels'
}

export enum StylePreset {
  Crazy = 'Crazy',
  Clean = 'Clean',
  Minimal = 'Minimal',
  Cinematic = 'Cinematic',
  Gaming = 'Gaming'
}

export enum ColorPalette {
  Neon = 'Neon',
  Dark = 'Dark',
  Pastel = 'Pastel',
  BrandColors = 'Brand Colors'
}

export enum FontStyle {
  Bold = 'Bold',
  Handwritten = 'Handwritten',
  Blocky = 'Blocky'
}

export enum Placement {
  Left = 'Left',
  Right = 'Right',
  Center = 'Center'
}

export enum AspectRatio {
  Ratio1_1 = '1:1',
  Ratio2_3 = '2:3',
  Ratio3_2 = '3:2',
  Ratio3_4 = '3:4',
  Ratio4_3 = '4:3',
  Ratio9_16 = '9:16',
  Ratio16_9 = '16:9',
  Ratio21_9 = '21:9'
}

export enum ImageSize {
  Size1K = '1K',
  Size2K = '2K',
  Size4K = '4K'
}

export interface ThumbnailConfig {
  video_title: string;
  video_hook: string;
  platform: Platform;
  overlay_text: string;
  auto_generate_text: boolean;
  style_preset: StylePreset;
  color_palette: ColorPalette;
  font_style: FontStyle;
  face_image: File | null;
  use_stock_face: boolean;
  placement: Placement;
  aspect_ratio: AspectRatio;
  brand_logo: File | null;
  reference_thumbnail: File | null;
  cta_badge_text: string;
  seed: number | null;
  image_size: ImageSize;
  use_pro_model: boolean;
  use_thinking: boolean;
}

export interface GenerationResult {
  base_thumbnail_url: string;
  refined_thumbnail_url: string;
  last_refinement_prompt: string;
  generated_prompt_concept?: string;
  video_url?: string;
}

export interface PromptConceptResponse {
  background_prompt: string;
  subject_prompt: string;
  text_overlay: string;
  style: string;
  color_palette: string;
  aspect_ratio: string;
  final_prompt: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}