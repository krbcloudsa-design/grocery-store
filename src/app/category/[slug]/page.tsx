import { categories } from "@/lib/catalog";
import CategoryClient from "./category-client";

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export default function CategoryPage() {
  return <CategoryClient />;
}
