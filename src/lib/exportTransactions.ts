// Export helper for Riwayat Transaksi (Transaction History) — CSV needs no
// dependency (plain string join + Blob download); PDF uses jsPDF +
// jspdf-autotable (added specifically for this feature, see package.json).
// Both consume exactly the caller's already-filtered transaction list — the
// export always reflects "whatever's currently shown", never a separate
// unfiltered query.
import { Transaction, Pocket, Account, Category } from '../types';
import { formatRupiah } from '../utils';

export interface ExportRow {
  no: number;
  tanggal: string;
  transaksi: string;
  nominal: number;
  tipe: string;
  kantong: string;
  wallet: string;
  kategori: string;
  catatan: string;
  inputOleh: string;
}

// Absolute date, not utils.ts's formatDate() — that one renders "Hari ini"/
// "Kemarin" relative to the moment it's called, which is meaningless once
// baked into a downloaded file.
function formatAbsoluteDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function buildExportRows(
  transactions: Transaction[],
  pockets: Pocket[],
  accounts: Account[],
  categories: Category[],
  currentUserEmail: string
): ExportRow[] {
  return transactions.map((t, idx) => ({
    no: idx + 1,
    tanggal: formatAbsoluteDate(t.date),
    transaksi: t.title,
    nominal: t.amount,
    tipe: t.type === 'incoming' ? 'Pemasukan' : 'Pengeluaran',
    kantong: pockets.find(p => p.id === t.pocketId)?.name || t.pocketId,
    wallet: accounts.find(a => a.id === t.accountId)?.name || t.accountId,
    kategori: categories.find(c => c.id === t.category)?.name || t.category,
    catatan: t.notes || '',
    // Falls back to "me" (the viewer) for transactions with no stamped
    // author — every transaction the CURRENT user's own client ever created
    // predates or simply never needed this field; only shared-pocket
    // transactions from someone else are ever explicitly stamped.
    inputOleh: t.inputBy || currentUserEmail,
  }));
}

const EXPORT_HEADERS = ['No', 'Tanggal', 'Transaksi', 'Nominal', 'Tipe', 'Kantong', 'Wallet', 'Kategori', 'Catatan', 'Input Oleh'];

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase() || 'riwayat-transaksi';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function exportTransactionsToCsv(rows: ExportRow[], title: string) {
  const lines = [
    csvEscape(title),
    '',
    EXPORT_HEADERS.join(','),
    ...rows.map(r =>
      [r.no, r.tanggal, r.transaksi, r.nominal, r.tipe, r.kantong, r.wallet, r.kategori, r.catatan, r.inputOleh]
        .map(csvEscape)
        .join(',')
    ),
  ];
  // Leading BOM so Excel (still the most common opener for a .csv on
  // Windows) recognizes this as UTF-8 instead of mangling "Rp"/accented text.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${sanitizeFilename(title)}.csv`);
}

// Dynamically imported so the ~200KB jsPDF bundle only loads if/when someone
// actually clicks "Export PDF", not on every page load of Riwayat Transaksi.
export async function exportTransactionsToPdf(rows: ExportRow[], title: string) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  autoTable(doc, {
    startY: 22,
    head: [EXPORT_HEADERS],
    body: rows.map(r => [r.no, r.tanggal, r.transaksi, formatRupiah(r.nominal), r.tipe, r.kantong, r.wallet, r.kategori, r.catatan, r.inputOleh]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129] },
    columnStyles: { 2: { cellWidth: 40 }, 8: { cellWidth: 35 } },
  });
  doc.save(`${sanitizeFilename(title)}.pdf`);
}
