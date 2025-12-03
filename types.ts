export enum IllustrationStyle {
  Watercolor = 'Watercolor Storybook',
  Disney = 'Disney Storybook 2D',
  Ghibli = 'Studio Ghibli Style',
  Pastel = 'Soft Pastel Cartoon',
}

export interface StoryPage {
  pageNumber: number;
  illustrationDescription: string;
  storyText: string;
  voiceText: string;
  imageUrl?: string;
  audioBuffer?: AudioBuffer;
  isLoadingAssets?: boolean;
}

export interface StoryState {
  title: string;
  pages: StoryPage[];
}

export type AppState = 'input' | 'generating_text' | 'generating_assets' | 'reading' | 'error';

export type ReadingMode = 'slide' | 'scroll';
