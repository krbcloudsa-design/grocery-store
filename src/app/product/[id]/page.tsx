"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { QtyStepper } from "@/components/qty-stepper";
import { categoryBySlug, effectivePrice, productById, productsByCategory } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { discountPercent, formatINR } from "@/lib/format";

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const product = productById(params.id);
  const { qtyOf } = useCart();

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-ink-900">Product not found</h1>
        <Link href="/" className="mt-4 inline-block text-brand-700 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const category = categoryBySlug(product.category);
  const qty = qtyOf(product.id);
  const unitPrice = effectivePrice(product, Math.max(qty, product.moq));
  const off = discountPercent(product.price, product.mrp);
  const related = productsByCategory(product.category)
    .filter((item) => item.id !== product.id)
    .slice(0, 5);

  const specs: [string, string][] = [
    ["Sold as", product.packSize],
    ["Source", product.origin],
    ["Shelf life", product.shelfLife],
    ["Storage", product.storage],
    ["Minimum order", `${product.moq} ${product.unit}`],
    ["GST", product.gstRate === 0 ? "Exempt" : `${product.gstRate}%`],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/category/${product.category}`} className="hover:text-brand-700">
          {category?.name}
        </Link>{" "}
        / <span className="text-ink-800">{product.name}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[420px_1fr]">
        <div>
          <div
            className={`grid h-80 place-items-center rounded-2xl border border-ink-100 bg-gradient-to-br ${
              category?.gradient ?? "from-ink-50 to-white"
            } text-8xl`}
          >
            <span aria-hidden>{product.emoji}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-[11px] text-ink-600">
            <div className="rounded-lg border border-ink-100 p-2">
              <p className="text-lg" aria-hidden>
                ✅
              </p>
              Quality checked
            </div>
            <div className="rounded-lg border border-ink-100 p-2">
              <p className="text-lg" aria-hidden>
                ❄️
              </p>
              Cold chain
            </div>
            <div className="rounded-lg border border-ink-100 p-2">
              <p className="text-lg" aria-hidden>
                ↩️
              </p>
              Same-day credit
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">
            {product.name}
          </h1>
          {product.localName && <p className="text-sm text-ink-500">{product.localName}</p>}

          <p className="mt-4 max-w-2xl leading-relaxed text-ink-600">{product.description}</p>

          <div className="mt-6 rounded-2xl border border-ink-100 p-5">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-extrabold text-ink-900">{formatINR(unitPrice)}</span>
              <span className="text-sm text-ink-500">per {product.unit}</span>
              {off > 0 && (
                <>
                  <span className="text-sm text-ink-400 line-through">
                    {formatINR(product.mrp)}
                  </span>
                  <span className="rounded bg-brand-600 px-1.5 py-0.5 text-xs font-bold text-white">
                    {off}% off
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-500">{product.packSize}</p>

            {product.bulkSlabs?.length ? (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
                  Bulk pricing
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div
                    className={`rounded-lg border p-2 ${
                      unitPrice === product.price
                        ? "border-brand-500 bg-brand-50"
                        : "border-ink-100"
                    }`}
                  >
                    <p className="font-semibold text-ink-900">
                      {product.moq}+ {product.unit}
                    </p>
                    <p className="text-ink-600">
                      {formatINR(product.price)}/{product.unit}
                    </p>
                  </div>
                  {product.bulkSlabs.map((slab) => (
                    <div
                      key={slab.qty}
                      className={`rounded-lg border p-2 ${
                        unitPrice === slab.price ? "border-brand-500 bg-brand-50" : "border-ink-100"
                      }`}
                    >
                      <p className="font-semibold text-ink-900">
                        {slab.qty}+ {product.unit}
                      </p>
                      <p className="text-ink-600">
                        {formatINR(slab.price)}/{product.unit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="w-48">
                <QtyStepper product={product} />
              </div>
              <Link
                href="/cart"
                className="rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-brand-300 hover:text-brand-700"
              >
                Go to cart
              </Link>
              {qty > 0 && (
                <span className="text-sm text-ink-600">
                  Line total{" "}
                  <span className="font-bold text-ink-900">{formatINR(unitPrice * qty)}</span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
              Product details
            </h2>
            <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {specs.map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-ink-100 pb-2">
                  <dt className="text-sm text-ink-500">{label}</dt>
                  <dd className="text-sm font-medium text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-extrabold tracking-tight text-ink-900">
            More from {category?.name}
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
