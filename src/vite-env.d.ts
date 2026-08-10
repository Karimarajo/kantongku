/// <reference types="vite/client" />

declare module "*.png" {
  const value: string;
  export default value;
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  // Meta Pixel ID — NOT a secret (safe in the browser bundle), unlike
  // META_CAPI_ACCESS_TOKEN which must stay server-side only. See src/main.tsx.
  readonly VITE_META_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  hapusDataPermanen?: (namaKoleksi: string, idDokumen: string, elemenIdHTML: string) => Promise<void>;
  handleDeleteTransaction?: (id: string) => void;
  handleDeleteBudget?: (id: string) => void;
  hitungUlangTotalSaldo?: () => void;
  // Meta Pixel's own global, installed dynamically by src/main.tsx when
  // VITE_META_PIXEL_ID is set. Absent entirely otherwise — always feature-detect.
  fbq?: (...args: any[]) => void;
}
