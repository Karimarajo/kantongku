import React from 'react';
import { formatRupiah } from '../utils';

export interface DonutDatum {
  id: string; // category id — stable key for click-to-filter, unlike `category` (display name)
  category: string;
  amount: number;
  color: string; // resolved hex color
}

interface DonutChartProps {
  title: string;
  data: DonutDatum[];
  emptyLabel?: string;
  selectedId?: string | null;
  onSelect?: (datum: DonutDatum) => void;
}

const SIZE = 108;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Native SVG donut chart (stroke-dasharray/stroke-dashoffset trick) — no chart
// library, mirrors the manual-SVG style already used for the weekly trend chart.
// Slices and legend rows are both clickable (via onSelect) when provided —
// used by ActivityView to filter the "Terbesar" list below each donut.
export default function DonutChart({ title, data, emptyLabel, selectedId, onSelect }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const hasData = total > 0 && data.length > 0;

  let cumulative = 0;

  return (
    <div className="glass-card rounded-xl p-3.5 flex flex-col items-center gap-3 w-full min-w-0">
      <h3 className="text-[10px] font-label-caps text-on-surface-variant uppercase tracking-wider text-center truncate w-full">
        {title}
      </h3>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-on-surface-variant/40 text-center min-h-[108px]">
          <span className="text-[11px] leading-relaxed px-2">{emptyLabel || 'Belum ada data bulan ini.'}</span>
        </div>
      ) : (
        <>
          <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={STROKE}
              />
              {data.map((d, idx) => {
                const fraction = d.amount / total;
                const arcLength = fraction * CIRCUMFERENCE;
                const dashOffset = -cumulative;
                cumulative += arcLength;
                const isDimmed = !!selectedId && selectedId !== d.id;
                return (
                  <circle
                    key={idx}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={d.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${arcLength} ${CIRCUMFERENCE - arcLength}`}
                    strokeDashoffset={dashOffset}
                    opacity={isDimmed ? 0.25 : 1}
                    className={onSelect ? 'cursor-pointer transition-opacity' : undefined}
                    onClick={onSelect ? () => onSelect(d) : undefined}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center px-2 pointer-events-none">
              <span className="font-mono-data text-[9px] font-bold text-on-surface text-center leading-tight break-words">
                {formatRupiah(total)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full min-w-0">
            {data.slice(0, 5).map((d, idx) => {
              const percent = Math.round((d.amount / total) * 100);
              const isSelected = selectedId === d.id;
              return (
                <div
                  key={idx}
                  onClick={onSelect ? () => onSelect(d) : undefined}
                  className={`flex items-center gap-1.5 text-[10px] min-w-0 rounded-md px-1 -mx-1 py-0.5 transition-colors ${onSelect ? 'cursor-pointer hover:bg-overlay/5' : ''} ${isSelected ? 'bg-overlay/5' : ''}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <span className={`truncate flex-grow min-w-0 ${isSelected ? 'text-on-surface font-semibold' : 'text-on-surface/80'}`}>{d.category}</span>
                  <span className="text-on-surface-variant font-mono-data shrink-0">{percent}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
