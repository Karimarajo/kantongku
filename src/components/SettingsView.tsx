import React, { useState } from 'react';
import { APP_VERSION } from '../version';
import { CURRENCY_OPTIONS } from '../utils';
import { t as tr } from '../i18n';
import type { AppSettings } from './ProfileView';
import {
  CreditCard, Moon, Sun, Coins, Languages,
  Wallet, Tag, Receipt, History, ChevronRight,
  Users, LifeBuoy, BookOpen
} from 'lucide-react';

// Revisi (bottom nav): Setting dipisah dari Profil — Profil sekarang HANYA
// identitas pengguna & Tindakan Keamanan (lihat ProfileView.tsx), sementara
// halaman ini menampung semua preferensi & menu navigasi yang sebelumnya
// menumpuk di Profil (Tampilan/Bahasa/Mata Uang + daftar menu Pengaturan).
// `AppSettings` TETAP didefinisikan & di-export dari ProfileView.tsx (bukan
// dipindah ke sini) supaya semua import type di file lain tidak perlu ikut
// diubah — cuma re-diimpor dari sana lewat `import type`.
interface SettingsViewProps {
  appSettings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onOpenPocketManager: () => void;
  onOpenCategoryManager: () => void;
  onNavigateHistory: () => void;
  onNavigateActivityLog: () => void;
  onNavigateDebtManager: () => void;
  onNavigateGuide: () => void;
  hasUnseenGuideUpdate: boolean;
  onNavigateSharedPockets: () => void;
  pendingInvitationCount: number;
}

export default function SettingsView({
  appSettings,
  onSaveSettings,
  onOpenPocketManager,
  onOpenCategoryManager,
  onNavigateHistory,
  onNavigateActivityLog,
  onNavigateDebtManager,
  onNavigateGuide,
  hasUnseenGuideUpdate,
  onNavigateSharedPockets,
  pendingInvitationCount,
}: SettingsViewProps) {
  // Settings state (local copy for immediate feedback) — pola yang sama
  // persis dengan yang sebelumnya ada di ProfileView.tsx.
  const [settings, setSettings] = useState<AppSettings>({ ...appSettings });

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSaveSettings(newSettings);
  };

  return (
    <div className="flex flex-col gap-6 select-none font-body-md">

      {/* Title Header */}
      <div>
        <h1 className="font-headline-md text-2xl text-on-surface font-bold leading-tight">{tr('Pengaturan')}</h1>
        <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Kelola preferensi sistem dan konfigurasi KantongKu.
        </p>
      </div>

      {/* Tampilan — dark/light toggle (default dark). Same pill-track +
          sliding-knob switch visual as ReminderModal's active/inactive
          toggle, reused here for consistency. */}
      <section className="flex flex-col gap-2.5">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">{tr('Tampilan')}</span>
        <div className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 flex items-center justify-between px-4">
          <span className="flex items-center gap-2 text-on-surface font-label-caps text-xs">
            {settings.theme === 'light' ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
            {settings.theme === 'light' ? tr('Mode Terang') : tr('Mode Gelap')}
          </span>
          <button
            type="button"
            onClick={() => updateSetting('theme', settings.theme === 'light' ? 'dark' : 'light')}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center ${
              settings.theme === 'light' ? 'bg-primary' : 'bg-overlay/10'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-slate-900 shadow-md transform transition-transform duration-200 ${
                settings.theme === 'light' ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Task (revisi, poin 11): toggle Bahasa ID/EN — geser tombol,
          persis model switch Tampilan di atas tapi dua posisi berlabel
          (bukan satu ikon), supaya kedua pilihan selalu kelihatan. Lihat
          src/i18n.ts untuk cakupan terjemahan yang berlaku saat ini. */}
      <section className="flex flex-col gap-2.5">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">{tr('Bahasa')}</span>
        <div className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 flex items-center justify-between px-4">
          <span className="flex items-center gap-2 text-on-surface font-label-caps text-xs">
            <Languages className="w-4 h-4 text-primary" />
            {settings.language === 'en' ? 'English' : 'Bahasa Indonesia'}
          </span>
          <button
            type="button"
            onClick={() => updateSetting('language', settings.language === 'en' ? 'id' : 'en')}
            className="w-16 h-7 rounded-full p-0.5 bg-overlay/10 relative flex items-center transition-colors"
          >
            <div
              className={`w-7.5 h-6 rounded-full bg-primary shadow-md flex items-center justify-center text-[9px] font-bold text-on-primary transform transition-transform duration-200 ${
                settings.language === 'en' ? 'translate-x-7.5' : 'translate-x-0'
              }`}
            >
              {settings.language === 'en' ? 'EN' : 'ID'}
            </div>
          </button>
        </div>
      </section>

      {/* Task (revisi, poin 12): pilihan mata uang tampilan — dropdown,
          langsung berlaku ke SELURUH nominal di app begitu disimpan (lihat
          setActiveCurrency di utils.ts, dipanggil dari handleSaveSettings
          App.tsx). Murni ganti simbol/format angka, BUKAN konversi kurs —
          nominal yang tersimpan tetap angka yang sama persis. */}
      <section className="flex flex-col gap-2.5">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">{tr('Mata Uang')}</span>
        <div className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 flex items-center justify-between px-4 gap-3">
          <span className="flex items-center gap-2 text-on-surface font-label-caps text-xs shrink-0">
            <Coins className="w-4 h-4 text-primary" />
            {tr('Tampilkan Sebagai')}
          </span>
          <select
            value={settings.currency}
            onChange={(e) => updateSetting('currency', e.target.value)}
            className="bg-transparent text-on-surface text-xs font-mono-data text-right focus:outline-none cursor-pointer"
          >
            {CURRENCY_OPTIONS.map(c => (
              <option key={c.code} value={c.code} className="bg-surface text-on-surface">
                {c.symbol}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[10px] text-on-surface-variant/50 leading-relaxed px-1">
          {tr('Hanya mengganti simbol & format angka tampilan, bukan konversi kurs — nominal yang tersimpan tetap sama.')}
        </p>
      </section>

      {/* Menu navigasi — sebelumnya berjudul "Pengaturan" di dalam Profil,
          sekarang inilah halaman Pengaturan/Setting itu sendiri, jadi
          section header ini tidak perlu diulang. */}
      <section className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onNavigateGuide}
            className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Panduan Pengguna
              {hasUnseenGuideUpdate && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Ada pembaruan baru" />
              )}
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onOpenPocketManager}
            className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Kelola Kantong
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          {/* Pocket Sharing (v11) — replaces the old "Kelola Kolaborator"
              form-in-place: covers both directions (invitations I received,
              pockets I've shared out) on its own screen. */}
          <button
            onClick={onNavigateSharedPockets}
            className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Kantong Bersama
              {pendingInvitationCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-on-surface leading-none">{pendingInvitationCount}</span>
              )}
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onOpenCategoryManager}
            className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Kelola Kategori
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onNavigateHistory}
            className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Riwayat Transaksi
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onNavigateActivityLog}
            className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Log Activity
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onNavigateDebtManager}
            className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Cicilan/Hutang
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          {/* Bukan modal in-app — diarahkan ke halaman Bantuan & Saran di
              situs utama (dibahas di Bab 16 panduan pengguna), yang punya
              form kategori + kirim pesan sendiri dan dibalas lewat email.
              target=_blank supaya sesi & state aplikasi (tab aktif dkk)
              tidak hilang di tab yang sama. */}
          <a
            href="https://kantongku.site/support"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-2xl card-elevated bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-primary" />
              Bantuan &amp; Dukungan
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </a>
        </div>
      </section>

      <p className="text-center text-[10px] text-on-surface-variant/40 font-mono-data pb-1">
        KantongKu V{APP_VERSION}
      </p>
    </div>
  );
}
