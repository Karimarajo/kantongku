import { Transaction, Pocket, UserProfile, Category } from './types';

// Format number as Indonesian Rupiah (e.g., Rp 10.000.000 or -Rp 150.000)
export function formatRupiah(amount: number, withPrefix = true): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(absAmount);
  
  if (withPrefix) {
    return `${isNegative ? '-' : ''}Rp ${formatted}`;
  }
  return `${isNegative ? '-' : ''}${formatted}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  
  // Reset hours to compare dates easily
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const timeString = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace('.', ':');

  if (targetDate.getTime() === today.getTime()) {
    return `Hari Ini, ${timeString}`;
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return `Kemarin, ${timeString}`;
  } else {
    const formattedDate = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
    return `${formattedDate}, ${timeString}`;
  }
}

// Pengeluaran per minggu kalender riil (Senin-Minggu, dinamis 4/5/6 minggu
// tergantung bulan) untuk SATU bulan target — diekstrak dari ActivityView
// lama (menu "Analisis", sekarang dihapus) supaya bisa dipakai ulang baik di
// TransactionHistoryPage (grafik mingguan bulan berjalan) maupun
// MonthlyExpenseView (grafik mingguan untuk bulan yang sedang dilihat user,
// bisa bulan lampau). Logika pembagian minggu SAMA PERSIS dengan versi lama
// — jangan diubah tanpa mengubah keduanya sekaligus.
export function getWeeklyExpenseTrend(transactions: Transaction[], year: number, month: number): number[] {
  const outgoingThisMonth = transactions.filter(t => {
    if (t.type !== 'outgoing') return false;
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  if (outgoingThisMonth.length === 0) return [0, 0, 0, 0];

  // Cari hari pertama bulan ini jatuh di hari apa (0 = Minggu, 1 = Senin, ..., 6 = Sabtu)
  const firstDayOfMonth = new Date(year, month, 1);
  let dayOfWeek = firstDayOfMonth.getDay();
  // Normalisasi agar Senin = 0, Selasa = 1, ..., Minggu = 6
  dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Hitung total minggu riil kalender di bulan ini
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalWeeksNeeded = Math.ceil((totalDaysInMonth + dayOfWeek) / 7);

  const liveWeeks = Array(totalWeeksNeeded).fill(0);

  outgoingThisMonth.forEach(t => {
    const day = new Date(t.date).getDate();
    // Tentukan indeks minggu riil (Senin - Minggu)
    const weekIndex = Math.floor((day + dayOfWeek - 1) / 7);
    if (weekIndex >= 0 && weekIndex < liveWeeks.length) {
      liveWeeks[weekIndex] += t.amount;
    }
  });

  return liveWeeks;
}

export function getDefaultProfile(email: string, displayName?: string | null, photoURL?: string | null): UserProfile {
  const cleanName = email.split('@')[0];
  const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  return {
    email: email,
    name: displayName || capitalizedName || 'Pengguna',
    avatarUrl: photoURL || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZ1t6mUd4xCqLFKL2_c7K6KITRzXBT_6bsXGtqgvFwzZriYpqC6DM5hZqNMlO-yE5apNldrM4VqcMFlX5niuVlXnMQY3dOY6Fpfr6qcyIZJ8iHW_D5324RTE9IQW7Iah0OaQ28b5kORr3X-eUxBgt_qp2S4qOnUxvstVpmSvhU0JmeLPI5nyPcvQyVXKOM7nDOcIDH6bihMJveNbQuZ5wxEoz9EoKxFCxSK3S9c-kI0kIX55XsbWdw',
    joinedAt: new Date().toISOString(),
  };
}

export function generateWhatsAppReport(
  transactions: Transaction[],
  pockets: Pocket[],
  totalBalance: number,
  categories: Category[] = []
): string {
  const now = new Date();
  const bulan = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const tanggal = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Filter transaksi bulan berjalan
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyTrans = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Hitung total pemasukan & pengeluaran bulan ini
  const totalIncome = monthlyTrans.filter(t => t.type === 'incoming').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthlyTrans.filter(t => t.type === 'outgoing').reduce((s, t) => s + t.amount, 0);

  // Kelompokkan pengeluaran per kategori
  const categoryMap: Record<string, { name: string; total: number; count: number }> = {};
  monthlyTrans.filter(t => t.type === 'outgoing').forEach(t => {
    const catInfo = categories.find(c => c.id === t.category);
    const catName = catInfo?.name || t.category;
    if (!categoryMap[t.category]) categoryMap[t.category] = { name: catName, total: 0, count: 0 };
    categoryMap[t.category].total += t.amount;
    categoryMap[t.category].count += 1;
  });

  // Kelompokkan pemasukan per kategori
  const incomeMap: Record<string, { name: string; total: number; count: number }> = {};
  monthlyTrans.filter(t => t.type === 'incoming').forEach(t => {
    const catInfo = categories.find(c => c.id === t.category);
    const catName = catInfo?.name || t.category;
    if (!incomeMap[t.category]) incomeMap[t.category] = { name: catName, total: 0, count: 0 };
    incomeMap[t.category].total += t.amount;
    incomeMap[t.category].count += 1;
  });

  const sortedExpenses = Object.values(categoryMap).sort((a, b) => b.total - a.total);
  const sortedIncome = Object.values(incomeMap).sort((a, b) => b.total - a.total);

  let report = `*📊 LAPORAN KAS KANTONGKU*\n`;
  report += `📅 Periode: *${bulan}*\n`;
  report += `🗓️ Diekspor: ${tanggal}\n`;
  report += `─────────────────────\n\n`;

  report += `*💰 RINGKASAN SALDO*\n`;
  report += `• Total Saldo: *${formatRupiah(totalBalance)}*\n`;
  pockets.forEach(p => {
    report += `  └ ${p.name}: ${formatRupiah(p.balance)}\n`;
  });

  report += `\n*📈 PEMASUKAN BULAN INI: ${formatRupiah(totalIncome)}*\n`;
  if (sortedIncome.length > 0) {
    sortedIncome.forEach(cat => {
      report += `  • ${cat.name}: *${formatRupiah(cat.total)}* (${cat.count}x)\n`;
    });
  } else {
    report += `  (Tidak ada pemasukan)\n`;
  }

  report += `\n*📉 PENGELUARAN BULAN INI: ${formatRupiah(totalExpense)}*\n`;
  if (sortedExpenses.length > 0) {
    sortedExpenses.forEach(cat => {
      report += `  • ${cat.name}: *${formatRupiah(cat.total)}* (${cat.count}x)\n`;
    });
  } else {
    report += `  (Tidak ada pengeluaran)\n`;
  }

  const selisih = totalIncome - totalExpense;
  const selisihEmoji = selisih >= 0 ? '✅' : '⚠️';
  report += `\n${selisihEmoji} *Selisih: ${selisih >= 0 ? '+' : ''}${formatRupiah(selisih)}*\n`;
  report += `─────────────────────\n`;
  report += `_Dibuat otomatis via KantongKu App_ 🏦`;

  return encodeURIComponent(report);
}

export function getCategoryIconComponent(iconName: string) {
  const map: Record<string, any> = {
    food: 'Utensils',
    shopping: 'ShoppingBag',
    coffee: 'Coffee',
    sports: 'Dumbbell',
    health: 'HeartPulse',
    social: 'Users',
    income: 'Coins',
    home: 'Home',
    car: 'Car',
    plane: 'Plane',
    game: 'Gamepad2',
    education: 'GraduationCap',
    gift: 'Gift',
    business: 'Briefcase',
    book: 'BookOpen',
    wrench: 'Wrench',
    electricity: 'Zap',
    wifi: 'Wifi',
    tv: 'Tv',
    film: 'Film',
    clothing: 'Shirt',
    beauty: 'Sparkles',
    baby: 'Baby',
    pet: 'PawPrint',
    gadget: 'Smartphone',
    piggy: 'PiggyBank',
    ticket: 'Ticket',
    bus: 'Bus',
    receipt: 'Receipt',
    charity: 'Heart'
  };
  return map[iconName] || 'Receipt';
}

export function getCategoryColorHex(colorName: string) {
  const map: Record<string, string> = {
    emerald: '#10B981',
    indigo: '#3B82F6',
    amber: '#F59E0B',
    rose: '#EF4444',
    purple: '#8B5CF6',
    teal: '#14B8A6',
    orange: '#F97316',
    cyan: '#06B6D4',
    pink: '#EC4899',
    yellow: '#EAB308',
    sky: '#0EA5E9',
    lime: '#84CC16',
    violet: '#7C3AED',
    fuchsia: '#D946EF',
    slate: '#64748B'
  };
  return map[colorName] || '#64748B';
}

