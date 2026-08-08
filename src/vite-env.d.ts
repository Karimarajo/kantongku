/// <reference types="vite/client" />

declare module "*.png" {
  const value: string;
  export default value;
}

interface ImportMetaEnv {
  readonly VITE_MIDTRANS_CLIENT_KEY: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  daftarAkunFirebase?: (email: string, password: string) => Promise<any>;
  masukAkunFirebase?: (email: string, password: string) => Promise<any>;
  keluarAkunFirebase?: () => Promise<void>;
  ubahKataSandiFirebase?: (oldPassword: string, newPassword: string) => Promise<void>;
  ubahProfilFirebase?: (displayName: string, photoURL: string) => Promise<string>;
  onAuthStateChangedCallback?: (user: any) => void;
  hapusDataPermanen?: (namaKoleksi: string, idDokumen: string, elemenIdHTML: string) => Promise<void>;
  handleDeleteTransaction?: (id: string) => void;
  handleDeleteBudget?: (id: string) => void;
  hitungUlangTotalSaldo?: () => void;
}
