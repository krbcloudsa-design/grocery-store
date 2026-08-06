import { useMemo, useState } from 'react';
import { Activity, ChevronDown, PackagePlus, Radio } from 'lucide-react';
import { clockTime } from '../lib/format.ts';
import { useStore } from '../store.tsx';

/**
 * Warehouse-side view of the same inventory stream the shelves use. It doubles
 * as the demo control for replenishment, so a sold-out product can be brought
 * back on cue instead of waiting for the scheduled delivery.
 */
export function LiveInventoryPanel() {
  const { stock, products, activity, connection, lastSyncAt, requestRestock } = useStore();
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    let inStock = 0;
    let low = 0;
    let out = 0;
    let held = 0;
    for (const level of stock.values()) {
      if (level.status === 'out_of_stock') out += 1;
      else if (level.status === 'low_stock') low += 1;
      else inStock += 1;
      held += level.reserved;
    }
    return { inStock, low, out, held };
  }, [stock]);

  const soldOut = products.filter((product) => stock.get(product.id)?.status === 'out_of_stock');

  return (
    <div className="fixed bottom-4 right-4 z-30 w-[min(22rem,calc(100vw-2rem))]">
      {open && (
        <div className="animate-slide-up mb-2 max-h-[26rem] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-clay-200">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="In stock" value={summary.inStock} tone="text-leaf-700" />
            <Stat label="Low" value={summary.low} tone="text-amber-600" />
            <Stat label="Out" value={summary.out} tone="text-rose-600" />
            <Stat label="Held" value={summary.held} tone="text-clay-700" />
          </div>

          {soldOut.length > 0 && (
            <section className="mt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-clay-600">Out of stock</h4>
              <ul className="mt-1.5 space-y-1.5">
                {soldOut.map((product) => (
                  <li key={product.id} className="flex items-center gap-2 text-xs">
                    <span>{product.emoji}</span>
                    <span className="min-w-0 grow truncate font-medium">{product.name}</span>
                    <button
                      type="button"
                      onClick={() => requestRestock(product.id)}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-leaf-100 px-2 py-1 text-[10px] font-bold text-leaf-800 transition hover:bg-leaf-200"
                    >
                      <PackagePlus className="h-3 w-3" /> Restock
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-clay-600">Live warehouse feed</h4>
            <ul className="mt-1.5 space-y-1.5">
              {activity.length === 0 && (
                <li className="text-xs text-clay-600">Waiting for the next movement…</li>
              )}
              {activity.map((entry) => (
                <li key={entry.id} className="flex gap-2 text-[11px] leading-snug">
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      entry.tone === 'restock' ? 'bg-leaf-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="grow text-clay-700">{entry.message}</span>
                  <span className="shrink-0 tabular-nums text-clay-300">
                    {clockTime(entry.at).slice(0, 5)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="ml-auto flex w-full items-center gap-2 rounded-2xl bg-clay-900 px-4 py-3 text-left text-white shadow-xl transition hover:bg-clay-700"
      >
        <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-leaf-600">
          <Activity className="h-4 w-4" />
        </span>
        <span className="grow">
          <span className="block text-xs font-bold">Live inventory</span>
          <span className="flex items-center gap-1 text-[10px] text-clay-300">
            <Radio className={`h-3 w-3 ${connection === 'live' ? 'text-leaf-300' : 'text-amber-300'}`} />
            {connection === 'live' ? `synced ${clockTime(lastSyncAt)}` : 'reconnecting…'}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-clay-50 py-2">
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-clay-600">{label}</p>
    </div>
  );
}
