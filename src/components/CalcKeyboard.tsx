import React from 'react';
import { Delete } from 'lucide-react';

interface CalcKeyboardProps {
  onKeyPress: (key: string) => void;
  onClear: () => void;
  onDelete: () => void;
  onEvaluate: () => void;
  onOk: () => void;
}

export default function CalcKeyboard({ onKeyPress, onClear, onDelete, onEvaluate, onOk }: CalcKeyboardProps) {
  const buttons = [
    { label: 'C', action: onClear, className: 'bg-rose-500/10 text-rose-400 font-bold' },
    { label: '÷', action: () => onKeyPress('/'), className: 'bg-overlay/5 text-primary font-bold text-lg' },
    { label: '×', action: () => onKeyPress('*'), className: 'bg-overlay/5 text-primary font-bold text-lg' },
    { label: '⌫', action: onDelete, className: 'bg-overlay/5 text-on-surface/70' },
    
    { label: '7', action: () => onKeyPress('7'), className: 'bg-overlay/5 text-on-surface text-lg' },
    { label: '8', action: () => onKeyPress('8'), className: 'bg-overlay/5 text-on-surface text-lg' },
    { label: '9', action: () => onKeyPress('9'), className: 'bg-overlay/5 text-on-surface text-lg' },
    { label: '-', action: () => onKeyPress('-'), className: 'bg-overlay/5 text-primary font-bold text-lg' },
    
    { label: '4', action: () => onKeyPress('4'), className: 'bg-overlay/5 text-on-surface text-lg' },
    { label: '5', action: () => onKeyPress('5'), className: 'bg-overlay/5 text-on-surface text-lg' },
    { label: '6', action: () => onKeyPress('6'), className: 'bg-overlay/5 text-on-surface text-lg' },
    { label: '+', action: () => onKeyPress('+'), className: 'bg-overlay/5 text-primary font-bold text-lg' },
    
    { label: '1', action: () => onKeyPress('1'), className: 'bg-overlay/5 text-on-surface text-lg' },
    { label: '2', action: () => onKeyPress('2'), className: 'bg-overlay/5 text-on-surface text-lg' },
    { label: '3', action: () => onKeyPress('3'), className: 'bg-overlay/5 text-on-surface text-lg' },
    { label: '=', action: onEvaluate, className: 'bg-primary text-black font-bold text-xl rounded-xl' },
    
    { label: '0', action: () => onKeyPress('0'), className: 'col-span-2 bg-overlay/5 text-on-surface text-lg' },
    { label: '000', action: () => onKeyPress('000'), className: 'bg-overlay/5 text-on-surface font-medium' },
    { label: 'OK', action: onOk, className: 'bg-rose-500 text-on-surface font-bold text-lg rounded-xl active:bg-rose-600 active:scale-95 transition-all' },
  ];

  return (
    <div className="w-full bg-surface-variant p-4 rounded-t-2xl border-t border-overlay/5 grid grid-cols-4 gap-2 select-none">
      {buttons.map((btn, index) => (
        <button
          key={index}
          type="button"
          onClick={btn.action}
          className={`h-12 flex items-center justify-center rounded-xl active:scale-95 transition-all focus:outline-none ${btn.className}`}
        >
          {btn.label === '⌫' ? <Delete className="w-5 h-5" /> : btn.label}
        </button>
      ))}
    </div>
  );
}

// Helper: Format equations nicely for display (adds separators to numbers, keeps operators clean)
export function formatEquation(expr: string): string {
  if (!expr) return '';
  return expr
    .split(/([+\-*/])/)
    .map(part => {
      if (['+', '-', '*', '/'].includes(part)) {
        if (part === '*') return ' × ';
        if (part === '/') return ' ÷ ';
        return ` ${part} `;
      }
      const numStr = part.replace(/[^0-9]/g, '');
      if (!numStr) return part; // Keep typing symbols like dots if user manually tries (though custom keyboard only generates clean strings)
      const num = Number(numStr);
      return new Intl.NumberFormat('id-ID').format(num);
    })
    .join('');
}

// Helper: Evaluate math expression safely
export function evaluateEquation(expr: string): number {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
    if (!sanitized) return 0;
    const result = new Function(`return (${sanitized})`)();
    const num = Number(result);
    return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, Math.round(num));
  } catch (e) {
    return 0;
  }
}
