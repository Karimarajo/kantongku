import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import {
  LogOut, User, Calendar, RefreshCw, Mail,
  CreditCard, Moon, Sun, Volume2, VolumeX,
  Camera, Edit3, Save, X, Check,
  Wallet, Tag, Receipt, History, ChevronRight
} from 'lucide-react';

export interface AppSettings {
  currency: 'IDR' | 'USD';
  theme: 'dark' | 'light';
  alarmRem: boolean;
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
  onNavigateActivityLog
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
        <h1 className="font-headline-md text-2xl text-white font-bold leading-tight">Profil Pengguna</h1>
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
              className="flex-1 h-9 bg-surface-variant/40 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-primary/60 text-center"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
            />
            <button onClick={handleSaveName} className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditingName(false); setNameInput(userProfile.name); }} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-on-surface-variant flex items-center justify-center hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-white font-bold text-lg">{userProfile.name}</h2>
            <button
              onClick={() => { setEditingName(true); setNameInput(userProfile.name); }}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
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

        <div className="w-full flex items-center justify-center gap-1.5 text-xs text-on-surface-variant/70 border-t border-white/5 pt-3 mt-1">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Terdaftar Sejak: {new Date(userProfile.joinedAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
        </div>
      </section>

      {/* Settings / Pengaturan Menu */}
      <section className="flex flex-col gap-2.5 mt-2">
        <span className="text-xs font-label-caps text-on-surface-variant uppercase tracking-wider block">Pengaturan</span>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onOpenPocketManager}
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-label-caps text-xs flex items-center justify-between px-4 hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Kelola Kantong
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onOpenCategoryManager}
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-label-caps text-xs flex items-center justify-between px-4 hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Kelola Kategori
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onNavigateHistory}
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-label-caps text-xs flex items-center justify-between px-4 hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Riwayat Transaksi
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>

          <button
            onClick={onNavigateActivityLog}
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-label-caps text-xs flex items-center justify-between px-4 hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Log Activity
            </span>
            <ChevronRight className="w-4 h-4 text-on-surface-variant/50" />
          </button>
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
            className="w-full h-12 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-[#EF4444]/20 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Aplikasi
          </button>
        </div>
      </section>
    </div>
  );
}
