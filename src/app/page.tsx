import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { bestsellers, categories, productsByCategory } from "@/lib/catalog";
import { MIN_ORDER_VALUE, formatINR } from "@/lib/format";

const valueProps = [
  {
    emoji: "🌾",
    title: "Sourced at the farm",
    body: "We buy from mandis and farmer groups directly, so you skip three layers of middlemen.",
  },
  {
    emoji: "❄️",
    title: "Unbroken cold chain",
    body: "Meat and dairy travel in reefer vans at 0-4°C, temperature logged until your gate.",
  },
  {
    emoji: "🧾",
    title: "GST invoice on every order",
    body: "Input credit ready invoices, itemised by HSN, downloadable from your order history.",
  },
  {
    emoji: "🚚",
    title: "Delivered before prep",
    body: "Order till 9 PM, receive in your 6-9 AM slot. One delivery for the whole kitchen list.",
  },
];

const steps = [
  { n: "01", title: "Register your outlet", body: "Add your GSTIN and FSSAI licence once. Approval is instant for most cities." },
  { n: "02", title: "Build your indent", body: "Search 500+ SKUs, or reorder yesterday's list in one tap from your order history." },
  { n: "03", title: "Pick a delivery slot", body: "Choose the morning or midday slot that fits your kitchen's prep schedule." },
  { n: "04", title: "Receive and verify", body: "Weigh at the gate. Anything below spec is credited back the same day, no arguments." },
];

export default function HomePage() {
  const featured = bestsellers().slice(0, 10);
  const vegetables = productsByCategory("vegetables").slice(0, 5);
  const meat = [...productsByCategory("chicken-poultry"), ...productsByCategory("mutton-meat")].slice(0, 5);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-ink-100 bg-gradient-to-br from-brand-50 via-white to-amber-50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Now serving 5 cities · 4,200+ restaurants
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
              Everything your kitchen needs,{" "}
              <span className="text-brand-600">sourced direct.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-600">
              Vegetables, chicken, mutton, seafood, dairy, masalas and packaging at wholesale
              rates. One order, one invoice, delivered to your restaurant before the day&apos;s prep
              starts.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/category/vegetables"
                className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Start sourcing
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-lg border border-ink-200 bg-white px-6 py-3 text-sm font-semibold text-ink-800 transition hover:border-brand-300 hover:text-brand-700"
              >
                How it works
              </Link>
            </div>

            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-6">
              {[
                ["500+", "SKUs in catalogue"],
                ["6 AM", "Earliest delivery slot"],
                [formatINR(MIN_ORDER_VALUE), "Minimum order"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-2xl font-extrabold text-ink-900">{value}</dt>
                  <dd className="text-xs text-ink-500">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-xl shadow-brand-900/5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
                Today&apos;s rates
              </h2>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                Live
              </span>
            </div>
            <ul className="mt-4 divide-y divide-ink-100">
              {[...vegetables.slice(0, 3), ...meat.slice(0, 2)].map((product) => (
                <li key={product.id} className="flex items-center gap-3 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink-50 text-xl" aria-hidden>
                    {product.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{product.name}</p>
                    <p className="text-xs text-ink-500">{product.origin}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-900">
                      {formatINR(product.price)}
                      <span className="text-xs font-normal text-ink-400">/{product.unit}</span>
                    </p>
                    <p className="text-[11px] text-ink-400 line-through">{formatINR(product.mrp)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
              Rates refresh every morning against mandi arrivals. Locked once your order is placed.
            </p>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="border-b border-ink-100">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((prop) => (
            <div key={prop.title}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-xl" aria-hidden>
                {prop.emoji}
              </span>
              <h3 className="mt-3 text-sm font-bold text-ink-900">{prop.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{prop.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
              Shop by category
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              Twelve aisles that cover an entire restaurant purchase list.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className={`group rounded-xl border border-ink-100 bg-gradient-to-br ${category.gradient} p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md`}
            >
              <span className="text-3xl" aria-hidden>
                {category.emoji}
              </span>
              <h3 className="mt-3 text-sm font-bold text-ink-900">{category.name}</h3>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-600">
                {category.tagline}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="border-y border-ink-100 bg-ink-50/60">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
                Most ordered this week
              </h2>
              <p className="mt-1 text-sm text-ink-600">
                What restaurants around you are restocking right now.
              </p>
            </div>
            <Link href="/category/vegetables" className="text-sm font-semibold text-brand-700 hover:underline">
              View all →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Fresh produce rail */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
              Fresh from the mandi
            </h2>
            <p className="mt-1 text-sm text-ink-600">Harvested yesterday, graded and sorted overnight.</p>
          </div>
          <Link href="/category/vegetables" className="text-sm font-semibold text-brand-700 hover:underline">
            All vegetables →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {vegetables.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Meat rail */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
              Meat &amp; seafood, cold-chain delivered
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              Cut to your spec, vacuum packed, temperature logged end to end.
            </p>
          </div>
          <Link href="/category/chicken-poultry" className="text-sm font-semibold text-brand-700 hover:underline">
            All meat →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {meat.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-ink-100 bg-ink-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <h2 className="text-2xl font-extrabold tracking-tight">How RasoiDirect works</h2>
          <p className="mt-1 text-sm text-ink-300">
            From registration to your first delivery, usually within 24 hours.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <span className="text-xs font-bold tracking-widest text-brand-400">{step.n}</span>
                <h3 className="mt-2 text-base font-bold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 text-center sm:p-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Ready to cut your food cost by 8-12%?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-600">
            Restaurants that move their full indent to RasoiDirect typically save on rate, wastage
            and the labour of managing a dozen vendors.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/category/vegetables"
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Browse the catalogue
            </Link>
            <Link
              href="/cart"
              className="rounded-lg border border-ink-200 bg-white px-6 py-3 text-sm font-semibold text-ink-800 transition hover:border-brand-300"
            >
              View my cart
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
