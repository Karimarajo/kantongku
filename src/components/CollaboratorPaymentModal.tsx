import React, { useEffect, useRef, useState } from 'react';
import { CollaboratorOrder } from '../types';
import { Loader2, Copy, Check, X, CreditCard } from 'lucide-react';
import QrisImage from './QrisImage';

interface CollaboratorPaymentModalProps {
  order: CollaboratorOrder | null;
  collaboratorEmail: string;
  onClose: () => void;
  // Fired once polling detects the order reached 'settlement' — parent
  // refreshes the collaborators list and closes the modal.
  onConfirmed: () => void;
}

// Payment instructions for a collaborator-seat order — visually mirrors
// Landing.tsx's "paying" step (same static-QRIS CTA / polling pattern) but
// as an in-app modal, since Landing.tsx itself is the public unauthenticated
// page and isn't set up to be embedded inside the logged-in app. Backend
// infra (order, polling endpoint, admin confirm) is fully shared — this is
// just the UI shell.
export default function CollaboratorPaymentModal({ order, collaboratorEmail, onClose, onConfirmed }: CollaboratorPaymentModalProps) {
  const [status, setStatus] = useState<'pending' | 'settlement' | 'expired' | 'error'>('pending');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!order) return;
    setStatus('pending');

    const poll = async () => {
      try {
        const res = await fetch(`/api/payment/status/${order.order_code}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'settlement') {
          setStatus('settlement');
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(onConfirmed, 1800); // let the success message actually be seen
        } else if (data.status === 'expired') {
          setStatus('expired');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Ignore transient polling errors — next tick retries.
      }
    };

    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.order_code]);

  if (!order) return null;

  const handleCopyAmount = () => {
    navigator.clipboard?.writeText(String(order.total_amount)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card rounded-xl p-card_padding w-full max-w-sm border border-white/10 z-10 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Bayar Undangan Kolaborator
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-on-surface-variant -mt-3">
          Untuk mengaktifkan akses <span className="text-white font-semibold">{collaboratorEmail}</span> sebagai kolaborator.
        </p>

        {status === 'settlement' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Check className="w-10 h-10 text-primary" />
            <p className="text-white font-headline-sm">Pembayaran dikonfirmasi!</p>
            <p className="text-xs text-on-surface-variant">Kolaborator sekarang aktif.</p>
          </div>
        ) : status === 'expired' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-xs text-rose-400 block px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
              Order sudah kedaluwarsa (lebih dari 24 jam). Undang ulang untuk membuat order baru.
            </span>
            <button onClick={onClose} className="h-11 px-6 rounded-xl bg-primary text-on-primary font-semibold text-sm">
              Tutup
            </button>
          </div>
        ) : (
          <>
            <div className="w-full bg-surface-variant/40 border border-white/10 rounded-xl p-4">
              <p className="text-[10px] font-label-caps text-primary/80 tracking-wider uppercase mb-1">Total yang harus dibayar</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white font-mono-data">{formatCurrency(order.total_amount)}</p>
                <button type="button" onClick={handleCopyAmount} className="text-on-surface-variant/60 hover:text-primary transition-colors" title="Salin nominal">
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Task 2: satu-satunya jalur pembayaran — QRIS statis + kode
                unik, dikonfirmasi manual oleh admin. Fixed after live prod
                test: a small fixed-size QR was too small for a phone camera
                to focus/scan reliably — QrisImage renders it bigger inline
                AND offers a genuine full-screen view (no container ceiling
                at all) via tap or the button underneath. */}
            <QrisImage src={order.qrImage} boxClassName="max-w-[320px]" />
            <p className="text-[11px] text-on-surface-variant/60 text-center -mt-1">
              Scan pakai aplikasi apa saja yang mendukung QRIS — pastikan nominalnya persis sama sampai 3 digit terakhir.
            </p>

            <div className="flex items-center justify-center gap-2 text-on-surface-variant">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-xs">Menunggu konfirmasi admin ({order.order_code})...</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
