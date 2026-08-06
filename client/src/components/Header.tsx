import { Carrot, MapPin, Radio, Receipt, Search, ShoppingBasket, X } from 'lucide-react';
import { clockTime, money } from '../lib/format.ts';
import { useStore } from '../store.tsx';

export function Header({
  query,
  onQueryChange,
  onOpenCart,
  onOpenOrders,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
}) {
  const { cartCount, breakdown, connection, lastSyncAt, profile, orders, products } = useStore();

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-leaf-900 text-leaf-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[11px] font-medium">
          <p className="truncate">
            Free delivery over {money(3500)} · Express slots in 45 minutes · Cancel any time before packing
          </p>
          <p
            className="flex shrink-0 items-center gap-1.5"
            title="Availability is streamed from the warehouse over a WebSocket"
          >
            <Radio className={`h-3.5 w-3.5 ${connection === 'live' ? 'text-leaf-300' : 'text-amber-300'}`} />
            <span className="hidden sm:inline">
              {connection === 'live' ? 'Live inventory' : connection === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
            </span>
            <span className="tabular-nums text-leaf-300">{clockTime(lastSyncAt)}</span>
          </p>
        </div>
      </div>

      <div className="border-b border-clay-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <a href="#top" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf-600 text-white shadow-sm">
              <Carrot className="h-5 w-5" />
            </span>
            <span className="hidden text-lg font-extrabold tracking-tight text-clay-900 sm:block">FreshCart</span>
          </a>

          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-xs text-clay-700 transition hover:bg-clay-100 lg:flex"
          >
            <MapPin className="h-4 w-4 text-leaf-600" />
            <span>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-clay-600">
                Deliver to
              </span>
              <span className="block max-w-40 truncate font-medium">
                {profile?.address ?? 'Add an address'}
              </span>
            </span>
          </button>

          <div className="relative grow">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clay-600" />
            <input
              id="fc-search"
              name="search"
              type="search"
              aria-label="Search products"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={`Search ${products.length || ''} products — try “sourdough”, “organic” or “pasta”`}
              className="w-full rounded-xl border border-clay-200 bg-clay-50 py-2.5 pl-9 pr-9 text-sm outline-none transition placeholder:text-clay-600/70 focus:border-leaf-400 focus:bg-white focus:ring-2 focus:ring-leaf-200"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onQueryChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-clay-600 hover:bg-clay-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenOrders}
            className="relative hidden items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-clay-700 transition hover:bg-clay-100 sm:flex"
          >
            <Receipt className="h-4 w-4" />
            Orders
            {orders.length > 0 && (
              <span className="rounded-full bg-clay-200 px-1.5 text-[10px] font-bold">{orders.length}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="flex items-center gap-2 rounded-xl bg-leaf-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-leaf-700"
          >
            <span className="relative">
              <ShoppingBasket className="h-4.5 w-4.5" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-berry-500 px-1 text-[10px] font-bold">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="tabular-nums">{money(breakdown.subtotal)}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
