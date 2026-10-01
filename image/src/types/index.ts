export type ImageFormat = 'avif' | 'webp' | 'jpeg' | 'png';
export type FitMode = 'inside' | 'cover' | 'contain';

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  convertedUrl: string | null;
  convertedSize: number | null;
  status: 'idle' | 'converting' | 'success' | 'failed';
  progress: number;
  error: string | null;
  reduction: number | null;
  outputFormat?: ImageFormat;
  originalDimensions?: { width: number; height: number };
  convertedDimensions?: { width: number; height: number };
}

export interface ConvertResponse {
  success: boolean;
  dataUrl?: string;
  size?: number;
  format?: string;
  width?: number;
  height?: number;
  error?: string;
}
