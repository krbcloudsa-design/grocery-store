import Link from "next/link";
import { categories } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-ink-100 bg-ink-900 text-ink-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-lg">
              🍲
            </span>
            <span className="text-lg font-extrabold text-white">
              Rasoi<span className="text-brand-400">Direct</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-300">
            One supply partner for every Indian restaurant kitchen — vegetables, meat, groceries
            and packaging, delivered before your prep begins.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.slice(0, 6).map((category) => (
              <li key={category.slug}>
                <Link href={`/category/${category.slug}`} className="hover:text-brand-300">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Company</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>About us</li>
            <li>Become a supplier</li>
            <li>Careers</li>
            <li>Food safety policy</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Support</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/orders" className="hover:text-brand-300">
                Track your order
              </Link>
            </li>
            <li>Returns &amp; credit notes</li>
            <li>
              <a href="tel:+919856474743" className="hover:text-brand-300">
                98564 74743 (7 AM - 10 PM)
              </a>
            </li>
            <li>care@rasoidirect.in</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} RasoiDirect Supply Pvt Ltd. FSSAI Lic. 10012345678901</p>
          <p>Prices exclusive of GST unless stated. Demo storefront.</p>
        </div>
      </div>
    </footer>
  );
}
