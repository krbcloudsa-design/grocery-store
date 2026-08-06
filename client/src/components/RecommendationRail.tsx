import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RecommendationSection } from '@shared/types.ts';
import { useStore } from '../store.tsx';
import { ProductCard } from './ProductCard.tsx';

const ACCENTS: Record<RecommendationSection['kind'], string> = {
  due_for_reorder: 'bg-amber-100 text-amber-800',
  pairs_with_cart: 'bg-sky-100 text-sky-800',
  buy_it_again: 'bg-leaf-100 text-leaf-800',
  picked_for_you: 'bg-violet-100 text-violet-800',
};

const LABELS: Record<RecommendationSection['kind'], string> = {
  due_for_reorder: 'Reorder timing',
  pairs_with_cart: 'Basket match',
  buy_it_again: 'Order history',
  picked_for_you: 'Collaborative filtering',
};

export function RecommendationRail({ section }: { section: RecommendationSection }) {
  const { productById } = useStore();
  const scroller = useRef<HTMLDivElement>(null);

  const scroll = (direction: 1 | -1) => {
    scroller.current?.scrollBy({ left: direction * 420, behavior: 'smooth' });
  };

  const cards = section.items
    .map((item) => ({ item, product: productById.get(item.productId) }))
    .filter((entry): entry is { item: typeof entry.item; product: NonNullable<typeof entry.product> } =>
      Boolean(entry.product),
    );

  if (cards.length === 0) return null;

  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-clay-900">{section.title}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACCENTS[section.kind]}`}>
              {LABELS[section.kind]}
            </span>
          </div>
          <p className="text-sm text-clay-600">{section.subtitle}</p>
        </div>
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scroll(-1)}
            className="rounded-full bg-white p-1.5 ring-1 ring-clay-200 transition hover:bg-clay-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scroll(1)}
            className="rounded-full bg-white p-1.5 ring-1 ring-clay-200 transition hover:bg-clay-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={scroller} className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {cards.map(({ item, product }) => (
          <ProductCard key={`${section.kind}-${product.id}`} product={product} reason={item.reason} compact />
        ))}
      </div>
    </section>
  );
}
