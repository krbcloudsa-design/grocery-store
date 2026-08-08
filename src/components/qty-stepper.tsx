"use client";

import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

export function QtyStepper({
  product,
  size = "md",
}: {
  product: Product;
  size?: "sm" | "md";
}) {
  const { qtyOf, increment, decrement, addToCart, ready } = useCart();
  const qty = qtyOf(product.id);

  const height = size === "sm" ? "h-9" : "h-11";
  const text = size === "sm" ? "text-sm" : "text-base";

  if (!product.inStock) {
    return (
      <button
        disabled
        className={`${height} ${text} w-full rounded-lg border border-ink-200 bg-ink-50 font-semibold text-ink-400`}
      >
        Out of stock
      </button>
    );
  }

  if (!ready || qty === 0) {
    return (
      <button
        onClick={() => addToCart(product.id)}
        className={`${height} ${text} w-full cursor-pointer rounded-lg border border-brand-600 bg-brand-50 font-semibold text-brand-700 transition hover:bg-brand-600 hover:text-white`}
      >
        Add · {product.moq} {product.unit}
      </button>
    );
  }

  return (
    <div
      className={`${height} ${text} flex w-full items-center justify-between overflow-hidden rounded-lg bg-brand-600 font-semibold text-white`}
    >
      <button
        onClick={() => decrement(product.id)}
        aria-label={`Decrease ${product.name}`}
        className="h-full cursor-pointer px-3 text-lg transition hover:bg-brand-700"
      >
        −
      </button>
      <span className="tabular-nums">
        {qty} {product.unit}
      </span>
      <button
        onClick={() => increment(product.id)}
        aria-label={`Increase ${product.name}`}
        className="h-full cursor-pointer px-3 text-lg transition hover:bg-brand-700"
      >
        +
      </button>
    </div>
  );
}
