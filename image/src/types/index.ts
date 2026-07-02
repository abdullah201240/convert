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
}

export interface ConvertResponse {
  success: boolean;
  dataUrl?: string;
  size?: number;
  error?: string;
}
