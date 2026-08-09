/// <reference types="vite/client" />

declare module "*.png" {
  const value: string;
  export default value;
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  hapusDataPermanen?: (namaKoleksi: string, idDokumen: string, elemenIdHTML: string) => Promise<void>;
  handleDeleteTransaction?: (id: string) => void;
  handleDeleteBudget?: (id: string) => void;
  hitungUlangTotalSaldo?: () => void;
}
