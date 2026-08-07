"use client";

import Link from "next/link";
import { effectivePrice, productById } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { FREE_DELIVERY_ABOVE, MIN_ORDER_VALUE, formatINR } from "@/lib/format";

export default function CartPage() {
  const { lines, ready, increment, decrement, setQty, clear, subtotal, gst, deliveryFee, total, savings } =
    useCart();

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-ink-500">Loading cart…</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <span className="text-5xl" aria-hidden>
          🧺
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-ink-900">Your indent is empty</h1>
        <p className="mt-2 text-ink-600">
          Add items from the catalogue and we&apos;ll deliver them in your next morning slot.
        </p>
        <Link
          href="/category/vegetables"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Browse catalogue
        </Link>
      </div>
    );
  }

  const belowMin = subtotal < MIN_ORDER_VALUE;
  const toFreeDelivery = Math.max(0, FREE_DELIVERY_ABOVE - subtotal);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          Your indent ({lines.length} item{lines.length === 1 ? "" : "s"})
        </h1>
        <button onClick={clear} className="cursor-pointer text-sm text-ink-500 hover:text-red-600">
          Clear all
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
          {lines.map((line) => {
            const product = productById(line.productId);
            if (!product) return null;
            const unitPrice = effectivePrice(product, line.qty);
            const slabApplied = unitPrice < product.price;

            return (
              <div key={line.productId} className="flex gap-4 p-4">
                <Link
                  href={`/product/${product.id}`}
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-ink-50 text-3xl"
                >
                  <span aria-hidden>{product.emoji}</span>
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${product.id}`}
                    className="text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {product.name}
                  </Link>
                  <p className="text-xs text-ink-500">{product.packSize}</p>
                  <p className="mt-1 text-xs text-ink-600">
                    {formatINR(unitPrice)}/{product.unit}
                    {slabApplied && (
                      <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                        Bulk rate applied
                      </span>
                    )}
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-9 items-center overflow-hidden rounded-lg border border-ink-200">
                      <button
                        onClick={() => decrement(product.id)}
                        aria-label={`Decrease ${product.name}`}
                        className="h-full cursor-pointer px-3 text-lg text-ink-600 transition hover:bg-ink-50"
                      >
                        −
                      </button>
                      <span className="min-w-16 text-center text-sm font-semibold tabular-nums">
                        {line.qty} {product.unit}
                      </span>
                      <button
                        onClick={() => increment(product.id)}
                        aria-label={`Increase ${product.name}`}
                        className="h-full cursor-pointer px-3 text-lg text-ink-600 transition hover:bg-ink-50"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => setQty(product.id, 0)}
                      className="cursor-pointer text-xs text-ink-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-ink-900">
                    {formatINR(unitPrice * line.qty)}
                  </p>
                  {product.gstRate > 0 && (
                    <p className="text-[11px] text-ink-400">+{product.gstRate}% GST</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="h-fit rounded-2xl border border-ink-100 p-5 lg:sticky lg:top-40">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Bill summary</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-600">Item total</dt>
              <dd className="font-medium text-ink-900">{formatINR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">GST</dt>
              <dd className="font-medium text-ink-900">{formatINR(gst)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">Delivery</dt>
              <dd className="font-medium text-ink-900">
                {deliveryFee === 0 ? (
                  <span className="text-brand-700">FREE</span>
                ) : (
                  formatINR(deliveryFee)
                )}
              </dd>
            </div>
            <div className="mt-3 flex justify-between border-t border-ink-100 pt-3 text-base">
              <dt className="font-bold text-ink-900">To pay</dt>
              <dd className="font-extrabold text-ink-900">{formatINR(total)}</dd>
            </div>
          </dl>

          {savings > 0 && (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
              You save {formatINR(savings)} against retail rates on this order.
            </p>
          )}

          {toFreeDelivery > 0 ? (
            <div className="mt-3">
              <p className="text-xs text-ink-600">
                Add {formatINR(toFreeDelivery)} more for free delivery.
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_ABOVE) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          {belowMin && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Minimum order value is {formatINR(MIN_ORDER_VALUE)}. Add{" "}
              {formatINR(MIN_ORDER_VALUE - subtotal)} more to place this indent.
            </p>
          )}

          {belowMin ? (
            <button
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-lg bg-ink-100 py-3 text-sm font-semibold text-ink-400"
            >
              Proceed to checkout
            </button>
          ) : (
            <Link
              href="/checkout"
              className="mt-4 block w-full rounded-lg bg-brand-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Proceed to checkout
            </Link>
          )}

          <Link
            href="/category/vegetables"
            className="mt-2 block text-center text-xs text-ink-500 hover:text-brand-700"
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
