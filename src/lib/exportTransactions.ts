// Export helper for Riwayat Transaksi (Transaction History) — CSV needs no
// dependency (plain string join + Blob download); PDF uses jsPDF +
// jspdf-autotable (added specifically for this feature, see package.json).
// Both consume exactly the caller's already-filtered transaction list — the
// export always reflects "whatever's currently shown", never a separate
// unfiltered query.
import { Transaction, Pocket, Account, Category } from '../types';
import { formatRupiah } from '../utils';
import logoImg from '../logo.png';

export interface ExportRow {
  no: number;
  tanggal: string;
  transaksi: string;
  nominal: number;
  tipe: string;
  // Task (revisi export PDF): kolom ledger bergaya mutasi rekening —
  // kredit = nominal kalau Pemasukan (0 kalau Pengeluaran), debit
  // sebaliknya, balance = saldo BERJALAN (kredit - debit) diakumulasi
  // KRONOLOGIS (tanggal lama -> baru) di seluruh baris yang di-export, lalu
  // dipetakan balik ke urutan tampil `rows` apa adanya (biasanya baru -> lama,
  // mengikuti Riwayat Transaksi). Ini saldo relatif terhadap data yang
  // di-export saja (mengikuti filter aktif), bukan saldo akun mutlak —
  // konsisten dengan prinsip export ini yang selalu "apa yang lagi tampil".
  kredit: number;
  debit: number;
  balance: number;
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
  // Saldo berjalan harus diakumulasi urut TANGGAL (lama -> baru) supaya
  // masuk akal secara ledger, terlepas dari urutan tampil `transactions`
  // yang masuk ke fungsi ini (Riwayat Transaksi selalu baru -> lama).
  const chronological = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const runningBalanceById = new Map<string, number>();
  let running = 0;
  chronological.forEach(t => {
    running += t.type === 'incoming' ? t.amount : -t.amount;
    runningBalanceById.set(t.id, running);
  });

  return transactions.map((t, idx) => ({
    no: idx + 1,
    tanggal: formatAbsoluteDate(t.date),
    transaksi: t.title,
    nominal: t.amount,
    tipe: t.type === 'incoming' ? 'Pemasukan' : 'Pengeluaran',
    kredit: t.type === 'incoming' ? t.amount : 0,
    debit: t.type === 'outgoing' ? t.amount : 0,
    balance: runningBalanceById.get(t.id) ?? 0,
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

export interface ExportSummary {
  totalTransaksi: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  selisih: number;
}

export function computeExportSummary(rows: ExportRow[]): ExportSummary {
  const totalPemasukan = rows.filter(r => r.tipe === 'Pemasukan').reduce((sum, r) => sum + r.nominal, 0);
  const totalPengeluaran = rows.filter(r => r.tipe === 'Pengeluaran').reduce((sum, r) => sum + r.nominal, 0);
  return {
    totalTransaksi: rows.length,
    totalPemasukan,
    totalPengeluaran,
    selisih: totalPemasukan - totalPengeluaran,
  };
}

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

// Delimiter is ";" not ",": Excel versi Indonesia (list separator lokal
// koma-desimal) membaca CSV berdasarkan pemisah daftar Windows, yang di
// locale ID adalah titik koma — kalau dipaksa koma, saat file di-double-klik
// semua kolom nyatu jadi satu ("tidak rapi"). Titik koma bikin Excel ID
// otomatis memecah ke kolom yang benar tanpa perlu wizard Text-to-Columns.
const CSV_DELIMITER = ';';

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[;",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function csvRow(values: (string | number)[]): string {
  return values.map(csvEscape).join(CSV_DELIMITER);
}

export function exportTransactionsToCsv(rows: ExportRow[], title: string) {
  const summary = computeExportSummary(rows);
  const lines = [
    csvEscape(title),
    '',
    csvRow(['Total Transaksi', summary.totalTransaksi]),
    csvRow(['Total Pemasukan', summary.totalPemasukan]),
    csvRow(['Total Pengeluaran', summary.totalPengeluaran]),
    csvRow(['Selisih', summary.selisih]),
    '',
    csvRow(EXPORT_HEADERS),
    ...rows.map(r =>
      csvRow([r.no, r.tanggal, r.transaksi, r.nominal, r.tipe, r.kantong, r.wallet, r.kategori, r.catatan, r.inputOleh])
    ),
  ];
  // Leading BOM so Excel (still the most common opener for a .csv on
  // Windows) recognizes this as UTF-8 instead of mangling "Rp"/accented text.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${sanitizeFilename(title)}.csv`);
}

export interface ExportGeneratedBy {
  name: string;
  email: string;
}

const PDF_HEADERS = ['No', 'Tanggal', 'Transaksi', 'Kredit', 'Debit', 'Balance', 'Kategori', 'Catatan'];
const BRAND_GREEN: [number, number, number] = [16, 185, 129];
const CREDIT_GREEN: [number, number, number] = [22, 163, 74];
const DEBIT_RED: [number, number, number] = [220, 38, 38];
const BALANCE_BLACK: [number, number, number] = [17, 24, 39];

// `logoImg` resolves (via Vite) to a served URL, not a data: URI — jsPDF's
// addImage() needs actual image bytes, so it's fetched once and converted
// here. Wrapped by the caller in try/catch: a logo that fails to load
// (offline edge case, etc.) should never block the export itself.
async function loadLogoAsDataUrl(): Promise<string> {
  const res = await fetch(logoImg);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Dynamically imported so the ~200KB jsPDF bundle only loads if/when someone
// actually clicks "Export PDF", not on every page load of Riwayat Transaksi.
export async function exportTransactionsToPdf(rows: ExportRow[], title: string, generatedBy: ExportGeneratedBy) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const summary = computeExportSummary(rows);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;

  // Task (revisi): kop surat logo + wordmark KantongKu di atas.
  try {
    const logoDataUrl = await loadLogoAsDataUrl();
    doc.addImage(logoDataUrl, 'PNG', marginX, 10, 14, 14);
  } catch {
    // Gagal muat logo (mis. offline) — lanjut tanpa logo, jangan gagalkan export-nya.
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...BRAND_GREEN);
  doc.text('KantongKu', marginX + 17, 19);

  doc.setDrawColor(225, 225, 225);
  doc.line(marginX, 27, pageWidth - marginX, 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(title, marginX, 35);

  // Task (revisi): "Generated pada tanggal dan jam berapa, oleh siapa".
  const now = new Date();
  const generatedDate = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const generatedTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `Dibuat pada ${generatedDate}, pukul ${generatedTime} WIB oleh ${generatedBy.name} (${generatedBy.email})`,
    marginX,
    40.5
  );

  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  const summaryLine = `Total Transaksi: ${summary.totalTransaksi}   |   Pemasukan: ${formatRupiah(summary.totalPemasukan)}   |   Pengeluaran: ${formatRupiah(summary.totalPengeluaran)}   |   Selisih: ${formatRupiah(summary.selisih)}`;
  doc.text(summaryLine, marginX, 46.5);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 51,
    head: [PDF_HEADERS],
    body: rows.map(r => [
      r.no,
      r.tanggal,
      r.transaksi,
      r.kredit > 0 ? formatRupiah(r.kredit) : '',
      r.debit > 0 ? formatRupiah(r.debit) : '',
      formatRupiah(r.balance),
      r.kategori,
      r.catatan,
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.8, overflow: 'linebreak' },
    headStyles: { fillColor: BRAND_GREEN },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20 },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 20 },
    },
    // Kredit hijau, Debit merah, Balance hitam tegas — sesuai konvensi
    // warna buku kas/mutasi rekening yang diminta.
    didParseCell: (data: any) => {
      if (data.section !== 'body') return;
      if (data.column.index === 3) data.cell.styles.textColor = CREDIT_GREEN;
      else if (data.column.index === 4) data.cell.styles.textColor = DEBIT_RED;
      else if (data.column.index === 5) {
        data.cell.styles.textColor = BALANCE_BLACK;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  doc.save(`${sanitizeFilename(title)}.pdf`);
}
