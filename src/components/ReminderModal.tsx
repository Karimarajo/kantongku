import React, { useState } from 'react';
import { Reminder } from '../types';
import { X, Plus, Trash2, Bell, AlarmClock, CalendarDays, Clock, RefreshCw } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: Reminder[];
  onAddReminder: (reminder: Reminder) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export default function ReminderModal({
  isOpen,
  onClose,
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder
}: ReminderModalProps) {
  const [title, setTitle] = useState('');
  // Menggunakan default string kosong agar HTML5 datetime-local meminta input wajib dari user
  const [targetDateTime, setTargetDateTime] = useState('');
  const [repeatType, setRepeatType] = useState<'once' | 'every_day' | 'every_week' | 'every_month'>('once');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !targetDateTime) return;

    const dateObj = new Date(targetDateTime);
    
    // 1. Ambil jam dan menit (Format: HH:MM)
    const jam = String(dateObj.getHours()).padStart(2, '0');
    const menit = String(dateObj.getMinutes()).padStart(2, '0');
    const timeFormatted = `${jam}:${menit}`; 

    // 2. Ambil tanggal mulai asli (Format: YYYY-MM-DD)
    const dateFormatted = targetDateTime.split('T')[0];

    // 3. Bangun struktur objek Reminder lengkap sesuai interface proyek Anda
    const newReminder: Reminder = {
      id: `rem-${Date.now()}`,
      title: title,
      time: timeFormatted,
      repeatType: repeatType,
      isActive: true,
      createdAt: new Date().toISOString(),
      dayOfWeek: dateObj.getDay(),
      dayOfMonth: dateObj.getDate(),
      targetDate: dateFormatted,
      lastTriggeredDate: ""
    };

    onAddReminder(newReminder);
    
    // Reset Form Input
    setTitle('');
    setTargetDateTime('');
  };

  const getRepeatLabel = (type: string) => {
    switch (type) {
      case 'once': return 'Sekali Saja';
      case 'every_day': return 'Setiap Hari';
      case 'every_week': return 'Setiap Minggu';
      case 'every_month': return 'Setiap Bulan';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060A13]/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="glass-card rounded-2xl w-full max-w-lg border border-overlay/10 relative overflow-hidden flex flex-col my-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-on-surface" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-overlay/5 shrink-0 bg-surface-variant/20">
          <div className="flex items-center gap-2">
            <AlarmClock className="w-5 h-5 text-primary" />
            <h3 className="font-headline-sm text-lg text-on-surface font-bold">
              Pengingat & Alarm Agenda
            </h3>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-overlay/5 border border-overlay/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-overlay/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          
          {/* Create Reminder Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-overlay/5 p-4 rounded-xl border border-overlay/5">
            <h4 className="text-xs font-label-caps text-primary uppercase font-semibold tracking-wider">Buat Pengingat Baru</h4>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-on-surface-variant/70 font-medium">Judul Rencana / Agenda</label>
              <input
                type="text"
                maxLength={40}
                placeholder="Contoh: Bayar cicilan atau iuran kas..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-body-md"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant/70 font-medium flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-primary" /> Atur Tanggal & Jam
                </label>
                <input
                  type="datetime-local"
                  value={targetDateTime}
                  onChange={(e) => setTargetDateTime(e.target.value)}
                  className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-3 text-sm text-on-surface focus:outline-none focus:border-primary/60 font-mono-data"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant/70 font-medium flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-primary" /> Tipe Pengulangan
                </label>
                <select
                  value={repeatType}
                  onChange={(e) => setRepeatType(e.target.value as any)}
                  className="h-10 bg-body-bg/40 border border-overlay/10 rounded-lg px-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 cursor-pointer"
                >
                  <option value="once" className="bg-surface text-on-surface">Sekali Saja</option>
                  <option value="every_day" className="bg-surface text-on-surface">Setiap Hari</option>
                  <option value="every_week" className="bg-surface text-on-surface">Setiap Minggu</option>
                  <option value="every_month" className="bg-surface text-on-surface">Setiap Bulan</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 h-10 w-full bg-primary text-black font-bold text-xs font-label-caps uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Tambah Rencana Pengingat
            </button>
          </form>

          {/* List of Reminders */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-label-caps text-primary uppercase font-semibold tracking-wider">Daftar Pengingat Aktif ({reminders.length})</h4>
            
            {reminders.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant/30 text-xs border border-dashed border-overlay/5 rounded-xl flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 opacity-25 animate-pulse" />
                <span>Belum ada rencana pengingat yang dibuat.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto no-scrollbar">
                {reminders.map((reminder) => {
                  const gabunganWaktu = reminder.targetDate 
                    ? new Date(`${reminder.targetDate}T${reminder.time}`) 
                    : new Date();

                  const formatOpsi: Intl.DateTimeFormatOptions = { 
                    day: 'numeric', 
                    month: 'short' 
                  };
                  
                  const tampilanWaktuLokal = `${gabunganWaktu.toLocaleDateString('id-ID', formatOpsi)} - Pukul ${reminder.time}`;

                  return (
                    <div
                      key={reminder.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border border-overlay/5 transition-all bg-overlay/5 ${
                        reminder.isActive ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          reminder.isActive ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-overlay/5 border border-overlay/5 text-on-surface-variant/40'
                        }`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-on-surface truncate">{reminder.title}</p>
                          <p className="text-[10px] text-on-surface-variant/70 font-mono-data mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-primary/70" /> {tampilanWaktuLokal}
                            <span className="text-on-surface/20">•</span>
                            <RefreshCw className="w-3 h-3 text-primary/70" /> {getRepeatLabel(reminder.repeatType)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Custom Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => onToggleReminder(reminder.id)}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center ${
                            reminder.isActive ? 'bg-primary' : 'bg-overlay/10'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-slate-900 shadow-md transform transition-transform duration-200 ${
                              reminder.isActive ? 'translate-x-4.5' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => onDeleteReminder(reminder.id)}
                          className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}