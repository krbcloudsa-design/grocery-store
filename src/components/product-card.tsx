import Link from "next/link";
import { QtyStepper } from "@/components/qty-stepper";
import { discountPercent, formatINR } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product.price, product.mrp);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-white transition hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-ink-50 to-white text-5xl">
          <span aria-hidden>{product.emoji}</span>
          {off > 0 && (
            <span className="absolute left-2 top-2 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {off}% OFF
            </span>
          )}
          {!product.inStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-semibold text-ink-500">
              Out of stock
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={`/product/${product.id}`} className="block">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900 group-hover:text-brand-700">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-ink-500">{product.packSize}</p>

        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-base font-bold text-ink-900">{formatINR(product.price)}</span>
          <span className="text-xs text-ink-400">/{product.unit}</span>
          {off > 0 && (
            <span className="text-xs text-ink-400 line-through">{formatINR(product.mrp)}</span>
          )}
        </div>

        {product.bulkSlabs?.length ? (
          <p className="text-[11px] font-medium text-brand-700">
            {formatINR(product.bulkSlabs[0].price)}/{product.unit} above {product.bulkSlabs[0].qty}{" "}
            {product.unit}
          </p>
        ) : (
          <p className="text-[11px] text-ink-400">Min order {product.moq} {product.unit}</p>
        )}

        <div className="mt-2">
          <QtyStepper product={product} size="sm" />
        </div>
      </div>
    </div>
  );
}
