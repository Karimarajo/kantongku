import React from 'react';
import { ActivityLogEntry } from '../types';
import { formatDate } from '../utils';
import {
  ChevronLeft, Trash2, History, Receipt, Wallet, Tag, Send, PiggyBank, Info
} from 'lucide-react';

interface ActivityLogViewProps {
  activityLog: ActivityLogEntry[];
  onBack: () => void;
  onClearLog: () => void;
}

// Small local icon map for activity-log categories — deliberately separate
// from CategoryIcon.tsx since this feed's "icon" values (send, piggy, tag,
// wallet, receipt) describe the kind of action, not a transaction category.
const getActivityIcon = (icon?: string) => {
  switch (icon) {
    case 'send': return Send;
    case 'piggy': return PiggyBank;
    case 'wallet': return Wallet;
    case 'tag': return Tag;
    case 'receipt': return Receipt;
    default: return Info;
  }
};

export default function ActivityLogView({ activityLog, onBack, onClearLog }: ActivityLogViewProps) {
  const sortedLog = [...activityLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleClear = () => {
    if (activityLog.length === 0) return;
    if (confirm('Apakah Anda yakin ingin membersihkan seluruh Log Activity? Riwayat ini tidak dapat dikembalikan.')) {
      onClearLog();
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full text-left max-h-[calc(100vh-120px)] overflow-y-auto pb-12 no-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-overlay/5 pb-4">
        <button onClick={onBack} className="p-2 bg-overlay/5 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Log Activity
        </h1>
      </div>

      <p className="text-xs text-on-surface-variant leading-relaxed -mt-2">
        Catatan riwayat aktivitas Anda di KantongKu. Log ini bersifat informatif saja dan tidak memengaruhi saldo maupun laporan.
      </p>

      <button
        onClick={handleClear}
        disabled={activityLog.length === 0}
        className="w-full h-11 rounded-xl bg-danger/10 border border-danger/20 text-danger font-label-caps text-xs flex items-center justify-center gap-2 hover:bg-danger/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        <Trash2 className="w-4 h-4" />
        Bersihkan Log
      </button>

      <div className="flex flex-col gap-2 mt-1">
        {sortedLog.length === 0 ? (
          <div className="text-center py-12 text-on-surface/30 flex flex-col items-center gap-2">
            <History className="w-10 h-10 text-on-surface/20" />
            <p className="text-xs">Belum ada aktivitas yang tercatat.</p>
          </div>
        ) : (
          sortedLog.map(entry => {
            const IconComponent = getActivityIcon(entry.icon);
            return (
              <div
                key={entry.id}
                className="flex items-start p-3 gap-3 rounded-xl border border-overlay/5 glass-card"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20 mt-0.5">
                  <IconComponent className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface leading-snug">{entry.message}</p>
                  <p className="text-[10px] text-on-surface/40 font-mono-data mt-1">{formatDate(entry.timestamp)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
