"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { categories, categoryBySlug, productsByCategory } from "@/lib/catalog";

type SortKey = "relevance" | "price-asc" | "price-desc" | "discount";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const category = categoryBySlug(slug);

  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevance");

  const all = useMemo(() => productsByCategory(slug), [slug]);

  const visible = useMemo(() => {
    let list = all;
    if (selectedSubs.length) list = list.filter((item) => selectedSubs.includes(item.subcategory));
    if (inStockOnly) list = list.filter((item) => item.inStock);
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "discount")
      sorted.sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp);
    return sorted;
  }, [all, selectedSubs, inStockOnly, sort]);

  if (!category) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-ink-900">Category not found</h1>
        <Link href="/" className="mt-4 inline-block text-brand-700 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const toggleSub = (sub: string) =>
    setSelectedSubs((current) =>
      current.includes(sub) ? current.filter((entry) => entry !== sub) : [...current, sub],
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>{" "}
        / <span className="text-ink-800">{category.name}</span>
      </nav>

      <div className="relative mt-3 overflow-hidden rounded-2xl border border-ink-100">
        <div className="relative h-44 sm:h-52">
          <Image
            src={category.image}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1280px"
            className="object-cover"
          />
          <div
            className={`absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-transparent`}
          />
          <div className="absolute inset-0 flex items-end p-6 sm:items-center">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {category.name}
              </h1>
              <p className="mt-1 text-sm text-white/85">{category.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Sub category</h2>
            <ul className="mt-3 space-y-2">
              {category.subcategories.map((sub) => (
                <li key={sub}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={selectedSubs.includes(sub)}
                      onChange={() => toggleSub(sub)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    {sub}
                    <span className="ml-auto text-xs text-ink-400">
                      {all.filter((item) => item.subcategory === sub).length}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Availability</h2>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
                className="h-4 w-4 accent-brand-600"
              />
              In stock only
            </label>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">
              Other categories
            </h2>
            <ul className="mt-3 space-y-1.5">
              {categories
                .filter((entry) => entry.slug !== slug)
                .slice(0, 6)
                .map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      href={`/category/${entry.slug}`}
                      className="flex items-center gap-2 text-sm text-ink-600 hover:text-brand-700"
                    >
                      <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md border border-ink-100">
                        <Image
                          src={entry.image}
                          alt=""
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </span>
                      {entry.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3">
            <p className="text-sm text-ink-600">
              <span className="font-semibold text-ink-900">{visible.length}</span> products
            </p>
            <label className="flex items-center gap-2 text-sm text-ink-600">
              Sort by
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                className="cursor-pointer rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500"
              >
                <option value="relevance">Relevance</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="discount">Biggest discount</option>
              </select>
            </label>
          </div>

          {visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-500">
              No products match these filters.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
