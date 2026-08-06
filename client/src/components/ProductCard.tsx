import { Minus, Plus, Sparkles, Star } from 'lucide-react';
import type { Product } from '@shared/types.ts';
import { money, percentOff } from '../lib/format.ts';
import { tileStyle } from '../lib/theme.ts';
import { useStore } from '../store.tsx';
import { StockBadge } from './StockBadge.tsx';

export function ProductCard({
  product,
  reason,
  compact = false,
}: {
  product: Product;
  /** Explanation shown when the card appears in a recommendation rail. */
  reason?: string;
  compact?: boolean;
}) {
  const { stock, flashed, quantityOf, adjustQuantity, addToCart } = useStore();
  const level = stock.get(product.id);
  const quantity = quantityOf(product.id);
  const soldOut = level?.status === 'out_of_stock';
  const discount = percentOff(product.price, product.compareAtPrice);
  const atLimit = level != null && quantity >= level.available;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-clay-200/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(43,38,32,0.25)] ${
        compact ? 'w-[196px] shrink-0' : ''
      } ${soldOut ? 'opacity-95' : ''}`}
    >
      <div
        className="tile-gradient relative flex h-28 items-center justify-center"
        style={tileStyle(product.category)}
      >
        <span className={`text-5xl drop-shadow-sm transition ${soldOut ? 'grayscale' : 'group-hover:scale-110'}`}>
          {product.emoji}
        </span>

        {discount != null && !soldOut && (
          <span className="absolute left-2 top-2 rounded-md bg-berry-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
            {discount}% OFF
          </span>
        )}

        {soldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-clay-900/80 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex grow flex-col gap-1.5 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-clay-600">{product.brand}</p>
        <h3 className="text-sm font-semibold leading-snug text-clay-900">{product.name}</h3>

        <div className="flex items-center gap-2 text-[11px] text-clay-600">
          <span>{product.unit}</span>
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {product.rating.toFixed(1)}
          </span>
        </div>

        <StockBadge level={level} flashing={flashed.has(product.id)} />

        {reason && (
          <p className="flex items-start gap-1 rounded-lg bg-leaf-50 px-2 py-1 text-[11px] leading-snug text-leaf-800">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            {reason}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-base font-bold text-clay-900">{money(product.price)}</p>
            {product.compareAtPrice && (
              <p className="text-[11px] text-clay-600 line-through">{money(product.compareAtPrice)}</p>
            )}
          </div>

          {soldOut ? (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-xl bg-clay-100 px-3 py-2 text-xs font-semibold text-clay-600"
            >
              Sold out
            </button>
          ) : quantity === 0 ? (
            <button
              type="button"
              onClick={() => addToCart(product.id)}
              className="rounded-xl bg-leaf-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-leaf-700 active:scale-95"
            >
              Add
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-xl bg-leaf-600 p-1 text-white shadow-sm">
              <button
                type="button"
                aria-label={`Remove one ${product.name}`}
                onClick={() => adjustQuantity(product.id, -1)}
                className="rounded-lg p-1 transition hover:bg-leaf-700"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-4 text-center text-xs font-bold">{quantity}</span>
              <button
                type="button"
                aria-label={`Add one ${product.name}`}
                disabled={atLimit}
                onClick={() => adjustQuantity(product.id, 1)}
                className="rounded-lg p-1 transition hover:bg-leaf-700 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
