"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categories } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";

function SearchField() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }}
      className="relative flex-1"
      role="search"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
        <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search onion, chicken curry cut, paneer…"
        aria-label="Search products"
        className="h-11 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-4 text-sm outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </form>
  );
}

export function SiteHeader() {
  const { itemCount, subtotal, ready } = useCart();
  const [openNav, setOpenNav] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white">
      <div className="bg-ink-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-[11px]">
          <p>Serving Bengaluru, Mumbai, Delhi NCR, Hyderabad and Pune</p>
          <div className="hidden gap-4 sm:flex">
            <span>Next-day delivery before 9 AM</span>
            <a href="tel:+919856474743" className="hover:text-brand-300">
              Support 98564 74743
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-lg text-white">
            🍲
          </span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight text-ink-900">
              Rasoi<span className="text-brand-600">Direct</span>
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-ink-400 sm:block">
              Restaurant supplies
            </span>
          </span>
        </Link>

        <div className="hidden flex-1 md:block">
          <SearchField />
        </div>

        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/orders"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-50"
          >
            Orders
          </Link>
          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <span>Cart</span>
            <span className="rounded bg-brand-800/40 px-1.5 py-0.5 text-xs tabular-nums">
              {ready ? itemCount : 0}
            </span>
            <span className="hidden tabular-nums sm:inline">
              {formatINR(ready ? subtotal : 0)}
            </span>
          </Link>
        </nav>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <SearchField />
      </div>

      <div className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
          <button
            onClick={() => setOpenNav((open) => !open)}
            className="flex shrink-0 cursor-pointer items-center gap-2 py-2.5 pr-4 text-sm font-semibold text-ink-800"
            aria-expanded={openNav}
          >
            <span aria-hidden>☰</span> All categories
          </button>
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="whitespace-nowrap rounded-md px-3 py-2.5 text-sm text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>

        {openNav && (
          <div className="border-t border-ink-100 bg-ink-50">
            <div className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  onClick={() => setOpenNav(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-white"
                >
                  <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-ink-100">
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </span>
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
