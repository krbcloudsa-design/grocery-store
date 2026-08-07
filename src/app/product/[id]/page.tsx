import { products } from "@/lib/catalog";
import ProductClient from "./product-client";

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export default function ProductPage() {
  return <ProductClient />;
}
