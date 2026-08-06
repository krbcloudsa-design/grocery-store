import type { StockLevel } from '@shared/types.ts';
import { minutesUntil } from '../lib/format.ts';

const TONES: Record<StockLevel['status'], string> = {
  in_stock: 'bg-leaf-100 text-leaf-800 ring-leaf-200',
  low_stock: 'bg-amber-100 text-amber-800 ring-amber-200',
  out_of_stock: 'bg-rose-100 text-rose-700 ring-rose-200',
};

const DOTS: Record<StockLevel['status'], string> = {
  in_stock: 'bg-leaf-500',
  low_stock: 'bg-amber-500',
  out_of_stock: 'bg-rose-500',
};

export function stockLabel(level: StockLevel | undefined): string {
  if (!level) return 'Checking stock';
  if (level.status === 'out_of_stock') return 'Out of stock';
  if (level.status === 'low_stock') return `Only ${level.available} left`;
  return `${level.available} in stock`;
}

export function StockBadge({
  level,
  flashing = false,
  showEta = true,
}: {
  level: StockLevel | undefined;
  flashing?: boolean;
  showEta?: boolean;
}) {
  const status = level?.status ?? 'in_stock';
  const eta = showEta && level?.status === 'out_of_stock' ? minutesUntil(level.restockEta) : null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[status]} ${
          flashing ? 'animate-stock-flash' : ''
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${DOTS[status]} ${
            status === 'in_stock' ? 'animate-pulse-ring' : ''
          }`}
        />
        {stockLabel(level)}
      </span>
      {eta !== null && (
        <span className="text-[11px] font-medium text-clay-600">
          {eta === 0 ? 'restocking now' : `back in ~${eta} min`}
        </span>
      )}
    </span>
  );
}
