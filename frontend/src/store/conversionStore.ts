import { create } from 'zustand';

export type ConversionStatus = 'idle' | 'uploading' | 'converting' | 'success' | 'error';

interface ConversionState {
  status: ConversionStatus;
  progress: number;
  fileName: string;
  fileSize: number;
  errorMessage: string;
  downloadUrl: string;
  apks: ApkInfo[];
  setStatus: (status: ConversionStatus) => void;
  setProgress: (progress: number) => void;
  setFile: (fileName: string, fileSize: number) => void;
  setError: (message: string) => void;
  setDownloadUrl: (url: string, apks: ApkInfo[]) => void;
  reset: () => void;
}

export interface ApkInfo {
  name: string;
  url: string;
  size: number;
}

const initialState = {
  status: 'idle' as ConversionStatus,
  progress: 0,
  fileName: '',
  fileSize: 0,
  errorMessage: '',
  downloadUrl: '',
  apks: [],
};

export const useConversionStore = create<ConversionState>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setFile: (fileName, fileSize) => set({ fileName, fileSize }),
  setError: (errorMessage) => set({ status: 'error', errorMessage }),
  setDownloadUrl: (downloadUrl, apks) => set({ status: 'success', downloadUrl, apks }),
  reset: () => set(initialState),
}));
