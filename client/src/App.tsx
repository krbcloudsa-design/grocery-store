import { useMemo, useState } from 'react';
import { Clock, Leaf, PackageSearch, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import type { CategoryId } from '@shared/types.ts';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { Header } from './components/Header.tsx';
import { LiveInventoryPanel } from './components/LiveInventoryPanel.tsx';
import { OrdersDrawer } from './components/OrdersDrawer.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { RecommendationRail } from './components/RecommendationRail.tsx';
import { Toasts } from './components/Toasts.tsx';
import { money } from './lib/format.ts';
import { useStore } from './store.tsx';

type Sort = 'recommended' | 'price-asc' | 'price-desc' | 'rating';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'rating', label: 'Top rated' },
];

export default function App() {
  const { ready, products, categories, stock, recommendations, profile, cart } = useStore();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [sort, setSort] = useState<Sort>('recommended');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = products.filter((product) => {
      if (category && product.category !== category) return false;
      if (inStockOnly && stock.get(product.id)?.status === 'out_of_stock') return false;
      if (!needle) return true;
      return [product.name, product.brand, product.description, ...product.tags]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });

    const soldOutLast = (id: string) => (stock.get(id)?.status === 'out_of_stock' ? 1 : 0);
    return [...rows].sort((a, b) => {
      const availability = soldOutLast(a.id) - soldOutLast(b.id);
      if (availability !== 0) return availability;
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating || b.reviewCount - a.reviewCount;
      return b.reviewCount - a.reviewCount;
    });
  }, [category, inStockOnly, products, query, sort, stock]);

  const browsing = Boolean(query.trim()) || category !== null;
  const outOfStockCount = useMemo(
    () => [...stock.values()].filter((level) => level.status === 'out_of_stock').length,
    [stock],
  );

  return (
    <div id="top" className="min-h-screen bg-clay-50">
      <Header
        query={query}
        onQueryChange={setQuery}
        onOpenCart={() => setCartOpen(true)}
        onOpenOrders={() => setOrdersOpen(true)}
      />

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-6">
        <section className="grid gap-4 rounded-3xl bg-gradient-to-br from-leaf-800 via-leaf-700 to-leaf-900 p-6 text-leaf-50 shadow-lg md:grid-cols-[1.4fr_1fr] md:p-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-50/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
              <Zap className="h-3.5 w-3.5" /> Express delivery in 45 minutes
            </span>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Market-fresh groceries,
              <br />
              picked and packed the moment you order.
            </h1>
            <p className="max-w-xl text-sm text-leaf-100/90">
              Every price and every unit on this page is live. Availability streams straight from the warehouse, so what
              you see is genuinely what is on the shelf right now.
            </p>
            <div className="flex flex-wrap gap-4 pt-1 text-xs">
              <Feature icon={Leaf} title={`${products.length} products`} body="Nine aisles, one basket" />
              <Feature icon={Clock} title="Live stock" body="Streamed over WebSocket" />
              <Feature icon={ShieldCheck} title="Secure pay" body="Card, UPI, wallet or cash" />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wide text-leaf-100">Your shopping profile</p>
            {profile ? (
              <>
                <p className="text-sm font-semibold">{profile.name}</p>
                <p className="text-[11px] text-leaf-100/80">{profile.address}</p>
                <div className="space-y-1.5 pt-1">
                  {profile.topCategories.map((entry) => {
                    const name = categories.find((item) => item.id === entry.category)?.name ?? entry.category;
                    return (
                      <div key={entry.category}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span>{name}</span>
                          <span className="tabular-nums text-leaf-100/80">{Math.round(entry.share * 100)}%</span>
                        </div>
                        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-leaf-50/20">
                          <div
                            className="h-full rounded-full bg-leaf-300"
                            style={{ width: `${Math.round(entry.share * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="flex items-start gap-1.5 border-t border-leaf-50/20 pt-2 text-[11px] text-leaf-100/85">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Suggestions below come from {profile.orderCount} past orders and what shoppers with similar baskets buy.
                </p>
              </>
            ) : (
              <p className="text-xs text-leaf-100/80">Loading your history…</p>
            )}
          </div>
        </section>

        <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            All aisles
          </Chip>
          {categories.map((item) => (
            <Chip key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>
              <span className="mr-1">{item.emoji}</span>
              {item.name}
            </Chip>
          ))}
        </nav>

        {!browsing && recommendations.length > 0 && (
          <div className="space-y-8">
            {recommendations.map((section) => (
              <RecommendationRail key={section.kind} section={section} />
            ))}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {category ? categories.find((item) => item.id === category)?.name : 'All products'}
                {query.trim() && <span className="text-clay-600"> · “{query.trim()}”</span>}
              </h2>
              <p className="text-sm text-clay-600">
                {filtered.length} product{filtered.length === 1 ? '' : 's'}
                {outOfStockCount > 0 && ` · ${outOfStockCount} sold out right now`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium ring-1 ring-clay-200">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                  className="h-3.5 w-3.5 accent-leaf-600"
                />
                In stock only
              </label>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="rounded-xl bg-white px-3 py-2 text-xs font-medium ring-1 ring-clay-200 outline-none focus:ring-2 focus:ring-leaf-200"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!ready ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-clay-200" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center gap-2 rounded-3xl bg-white py-16 ring-1 ring-clay-200">
              <PackageSearch className="h-8 w-8 text-clay-300" />
              <p className="text-sm font-semibold">Nothing matches that search</p>
              <p className="text-xs text-clay-600">Try a different aisle or clear the filters.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-clay-200 pt-6 text-xs text-clay-600">
          <p className="font-semibold text-clay-900">FreshCart — sample storefront</p>
          <p className="mt-1 max-w-2xl">
            Prices are illustrative and the payment gateway is simulated: no card is charged. Inventory, holds,
            reservations and recommendations are all computed by the bundled API. Free delivery over {money(3500)}.
          </p>
        </footer>
      </main>

      <LiveInventoryPanel />
      <Toasts />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <OrdersDrawer open={ordersOpen} onClose={() => setOrdersOpen(false)} />

      {checkoutOpen && cart.length > 0 && (
        <CheckoutModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          onTrackOrder={() => setOrdersOpen(true)}
        />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
        active
          ? 'bg-clay-900 text-white shadow-sm'
          : 'bg-white text-clay-700 ring-1 ring-clay-200 hover:bg-clay-100'
      }`}
    >
      {children}
    </button>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Leaf;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-leaf-50/15">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-leaf-100/80">{body}</span>
      </span>
    </div>
  );
}
