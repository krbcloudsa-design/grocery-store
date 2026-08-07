import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { categories, searchProducts } from "@/lib/catalog";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = searchProducts(query);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
        {query ? (
          <>
            {results.length} result{results.length === 1 ? "" : "s"} for{" "}
            <span className="text-brand-700">&ldquo;{query}&rdquo;</span>
          </>
        ) : (
          "Search the catalogue"
        )}
      </h1>

      {results.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-ink-50/60 p-8">
          <p className="text-sm text-ink-600">
            {query
              ? "Nothing matched that search. Try a shorter term, or browse a category below."
              : "Type an item in the search bar above, or start from a category."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                {category.emoji} {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
