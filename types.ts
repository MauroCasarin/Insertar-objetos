// Define types for our application state
export interface TransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  removeWhite: boolean;
}

export type LayerType = 'background' | 'foreground';

export interface ImageState {
  background: HTMLImageElement | null;
  foreground: HTMLImageElement | null;
  // We keep a processed version of the foreground for performance (e.g. removed background)
  processedForeground: HTMLImageElement | null;
}