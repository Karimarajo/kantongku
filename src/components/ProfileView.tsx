import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { APP_VERSION } from '../version';
import {
  LogOut, User, Calendar, RefreshCw, Mail,
  CreditCard, Moon, Sun,
  Camera, Edit3, Save, X, Check,
  Wallet, Tag, Receipt, History, ChevronRight,
  Users, LifeBuoy, BookOpen
} from 'lucide-react';

export interface AppSettings {
  currency: 'IDR' | 'USD';
  theme: 'dark' | 'light';
  alarmRem: boolean;
  // IANA zone (e.g. "Asia/Jakarta", "Asia/Makassar") captured automatically
  // from the browser (Intl.DateTimeFormat().resolvedOptions().timeZone) on
  // every save in App.tsx — never a manual setting here, always whatever the
  // device itself reports "now". Used server-side (server.ts) so reminder/
  // debt push notifications fire at the account's OWN local time instead of
  // an app-wide fixed WIB assumption. Optional/undefined for any account
  // whose data predates this field — server.ts falls back to WIB for those.
  timezone?: string;
  // Task: urutan tombol Aksi Cepat di Home, bisa diatur drag & drop —
  // array id aksi, 5 pertama yang tampil langsung. Undefined/kosong = urutan
  // bawaan (lihat DEFAULT_QUICK_ACTION_ORDER di HomeDashboard.tsx).
  quickActionOrder?: string[];
}

interface ProfileViewProps {
  userProfile: UserProfile;
  appSettings: AppSettings;
  onLogout: () => void;
  onResetData: () => void;
  onSaveProfile: (name: string, avatarUrl: string) => Promise<void>;
  onSaveSettings: (settings: AppSettings) => void;
  onOpenPocketManager: () => void;
  onOpenCategoryManager: () => void;
  onNavigateHistory: () => void;
  onNavigateActivityLog: () => void;
  onNavigateDebtManager: () => void;
  onNavigateGuide: () => void;
  hasUnseenGuideUpdate: boolean;
  // Pocket Sharing (v11, replaces the old whole-account "Collaborator"
  // section) — free, per-pocket, both directions (invitee accepting AND
  // owner managing) now live on one dedicated screen instead of a form
  // embedded here, since there's real per-pocket state to browse.
  onNavigateSharedPockets: () => void;
  pendingInvitationCount: number;
}

export default function ProfileView({
  userProfile,
  appSettings,
  onLogout,
  onResetData,
  onSaveProfile,
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
}: ProfileViewProps) {
  // Profile edit state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state (local copy for immediate feedback)
  const [settings, setSettings] = useState<AppSettings>({ ...appSettings });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          try {
            await onSaveProfile(userProfile.name, compressedBase64);
            setAvatarUrl(compressedBase64);
          } catch (err: any) {
            alert("Gagal memperbarui foto profil: " + err.message);
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      await onSaveProfile(nameInput.trim(), avatarUrl);
      setEditingName(false);
    } catch (err: any) {
      alert("Gagal memperbarui nama profil: " + err.message);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSaveSettings(newSettings);
  };

  return (
    <div className="flex flex-col gap-6 select-none font-body-md">

      {/* Title Header */}
      <div>
        <h1 className="font-headline-md text-2xl text-on-surface font-bold leading-tight">Profil Pengguna</h1>
        <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
          Kelola detail akun, preferensi sistem, dan konfigurasi KantongKu.
        </p>
      </div>

      {/* Profile Card */}
      <section className="glass-card rounded-xl p-card_padding flex flex-col items-center text-center gap-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />

        {/* Avatar with camera button */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30">
            <img
              alt="User Profile"
              className="w-full h-full object-cover"
              src={avatarUrl}
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-background"
            title="Ganti foto profil"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Name edit */}
        {editingName ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 h-9 bg-surface-variant/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 text-center"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
            />
            <button onClick={handleSaveName} className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditingName(false); setNameInput(userProfile.name); }} className="w-8 h-8 rounded-lg bg-overlay/5 border border-overlay/10 text-on-surface-variant flex items-center justify-center hover:text-on-surface transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-on-surface font-bold text-lg">{userProfile.name}</h2>
            <button
              onClick={() => { setEditingName(true); setNameInput(userProfile.name); }}
              className="p-1 rounded-lg bg-overlay/5 hover:bg-overlay/10 text-on-surface-variant hover:text-on-surface transition-colors"
              title="Edit nama"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <span className="text-xs text-on-surface-variant flex items-center justify-center gap-1 mt-0.5 font-mono-data">
          <Mail className="w-3.5 h-3.5" />
          {userProfile.email}
        </span>

        <div className="w-full flex items-center justify-center gap-1.5 text-xs text-on-surface-variant/70 border-t border-overlay/5 pt-3 mt-1">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Terdaftar Sejak: {new Date(userProfile.joinedAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
        </div>
      </section>

      {/* Tampilan — dark/light toggle (default dark). Same pill-track +
          sliding-knob switch visual as ReminderModal's active/inactive
          toggle, reused here for consistency. */}
      <section className="flex flex-col gap-2.5 mt-2">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">Tampilan</span>
        <div className="w-full h-12 rounded-xl bg-overlay/5 border border-overlay/10 flex items-center justify-between px-4">
          <span className="flex items-center gap-2 text-on-surface font-label-caps text-xs">
            {settings.theme === 'light' ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
            Mode {settings.theme === 'light' ? 'Terang' : 'Gelap'}
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

      {/* Settings / Pengaturan Menu */}
      <section className="flex flex-col gap-2.5 mt-2">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">Pengaturan</span>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onNavigateGuide}
            className="w-full h-12 rounded-xl bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
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
            className="w-full h-12 rounded-xl bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
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
            className="w-full h-12 rounded-xl bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
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
            className="w-full h-12 rounded-xl bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Kelola Kategori
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onNavigateHistory}
            className="w-full h-12 rounded-xl bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Riwayat Transaksi
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onNavigateActivityLog}
            className="w-full h-12 rounded-xl bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Log Activity
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onNavigateDebtManager}
            className="w-full h-12 rounded-xl bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Kelola Cicilan/Hutang
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
            className="w-full h-12 rounded-xl bg-overlay/5 border border-overlay/10 text-on-surface font-label-caps text-xs flex items-center justify-between px-4 hover:bg-overlay/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-primary" />
              Bantuan &amp; Dukungan
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </a>
        </div>
      </section>

      {/* Dangerous Actions */}
      <section className="flex flex-col gap-2.5 mt-2">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">Tindakan Keamanan</span>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin melakukan RESET DATA? Seluruh transaksi yang ditambahkan akan dihapus dan kembali ke mock data awal.')) {
                onResetData();
              }
            }}
            className="w-full h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-orange-500/20 active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Data Ke Mockup Awal
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full h-12 rounded-xl bg-danger/10 border border-danger/20 text-danger font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-danger/20 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Aplikasi
          </button>
        </div>
      </section>

      <p className="text-center text-[10px] text-on-surface-variant/40 font-mono-data pb-1">
        KantongKu V{APP_VERSION}
      </p>
    </div>
  );
}
