import React, { useMemo } from 'react';
import { Transaction, Category } from '../types';
import { getCategoryColorHex } from '../utils';
import DonutChart, { DonutDatum } from './DonutChart';
import { X } from 'lucide-react';

export interface CategoryDonutFilter {
  type: 'incoming' | 'outgoing';
  id: string;
  name: string;
}

interface CategoryDonutChartProps {
  // Caller decides the scope (e.g. "this month" in ActivityView, or
  // "whatever the other filters currently allow" in TransactionHistoryPage)
  // — this component just aggregates whatever list it's given, it has no
  // date/period logic of its own.
  transactions: Transaction[];
  categories: Category[];
  expenseTitle?: string;
  incomeTitle?: string;
  expenseEmptyLabel?: string;
  incomeEmptyLabel?: string;
  // Fully controlled (like an <input value onChange>) rather than owning its
  // own internal state — a page with its own "Reset Filter" button (e.g.
  // TransactionHistoryPage) needs to be able to clear the donut selection
  // from outside, which an internally-stated component couldn't support.
  value: CategoryDonutFilter | null;
  onChange: (filter: CategoryDonutFilter | null) => void;
}

// Reusable "2 donut charts (pengeluaran/pemasukan) + klik-slice/legend untuk
// filter, toggle-off pada klik ulang" widget (Task 7) — originally built
// inline in ActivityView.tsx (Statistik), extracted here so
// TransactionHistoryPage.tsx (Riwayat Transaksi) can reuse the exact same
// aggregation + interaction logic instead of a second copy.
export default function CategoryDonutChart({
  transactions,
  categories,
  expenseTitle = 'Pengeluaran',
  incomeTitle = 'Pemasukan',
  expenseEmptyLabel = 'Belum ada pengeluaran.',
  incomeEmptyLabel = 'Belum ada pemasukan.',
  value,
  onChange,
}: CategoryDonutChartProps) {
  const getCategoryBreakdown = (type: 'incoming' | 'outgoing'): DonutDatum[] => {
    const totals: Record<string, number> = {};
    transactions.filter(t => t.type === type).forEach(t => {
      const isValidCat = categories.some(c => c.id === t.category);
      const targetCategory = (t.category && isValidCat) ? t.category : 'lainnya';
      totals[targetCategory] = (totals[targetCategory] || 0) + t.amount;
    });
    return Object.keys(totals)
      .map(catId => {
        const catInfo = categories.find(c => c.id === catId);
        return {
          id: catId,
          category: catInfo?.name || 'Lain-lain',
          amount: totals[catId],
          color: getCategoryColorHex(catInfo?.color || 'slate'),
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  const expenseByCategory = useMemo(() => getCategoryBreakdown('outgoing'), [transactions, categories]);
  const incomeByCategory = useMemo(() => getCategoryBreakdown('incoming'), [transactions, categories]);

  const handleSelect = (type: 'incoming' | 'outgoing', d: DonutDatum) => {
    const isSame = value && value.type === type && value.id === d.id;
    onChange(isSame ? null : { type, id: d.id, name: d.category });
  };

  return (
    <div className="flex flex-col gap-2.5 w-full min-w-0">
      <div className="grid grid-cols-2 gap-3">
        <DonutChart
          title={expenseTitle}
          data={expenseByCategory}
          emptyLabel={expenseEmptyLabel}
          selectedId={value?.type === 'outgoing' ? value.id : null}
          onSelect={(d) => handleSelect('outgoing', d)}
        />
        <DonutChart
          title={incomeTitle}
          data={incomeByCategory}
          emptyLabel={incomeEmptyLabel}
          selectedId={value?.type === 'incoming' ? value.id : null}
          onSelect={(d) => handleSelect('incoming', d)}
        />
      </div>
      {value && (
        <button
          onClick={() => onChange(null)}
          className="self-start flex items-center gap-1.5 text-[11px] font-label-caps text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 hover:bg-primary/20 transition-all"
        >
          Filter: {value.name} <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
