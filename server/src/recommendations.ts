import type {
  CartLine,
  CategoryId,
  PurchaseStat,
  Recommendation,
  RecommendationSection,
} from '../../shared/types.js';
import { productById, products } from './data/catalog.js';
import { communityBaskets } from './data/history.js';
import { inventory } from './inventory.js';
import { userBaskets } from './orders.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Item-to-item collaborative filtering.
 *
 * Similarity between two products is their co-occurrence across baskets,
 * normalised by how often each is bought on its own (cosine over the
 * basket-membership vectors). That keeps ubiquitous staples like milk from
 * dominating every recommendation.
 */
function buildSimilarity(baskets: string[][]) {
  const counts = new Map<string, number>();
  const pairs = new Map<string, number>();

  for (const basket of baskets) {
    const unique = [...new Set(basket)];
    for (const item of unique) counts.set(item, (counts.get(item) ?? 0) + 1);
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const key = unique[i] < unique[j] ? `${unique[i]}|${unique[j]}` : `${unique[j]}|${unique[i]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }

  return (a: string, b: string): number => {
    if (a === b) return 0;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const together = pairs.get(key) ?? 0;
    if (together === 0) return 0;
    const denominator = Math.sqrt((counts.get(a) ?? 1) * (counts.get(b) ?? 1));
    return together / denominator;
  };
}

function similarityForUser(userId: string) {
  const own = userBaskets(userId).map((basket) => basket.lines.map((line) => line.productId));
  return buildSimilarity([...communityBaskets, ...own]);
}

export function purchaseStats(userId: string): PurchaseStat[] {
  const stats = new Map<string, { times: number; units: number; last: number }>();
  for (const basket of userBaskets(userId)) {
    for (const line of basket.lines) {
      const entry = stats.get(line.productId) ?? { times: 0, units: 0, last: 0 };
      entry.times += 1;
      entry.units += line.quantity;
      entry.last = Math.max(entry.last, basket.placedAt.getTime());
      stats.set(line.productId, entry);
    }
  }

  return [...stats.entries()]
    .map(([productId, entry]) => {
      const cadence = productById.get(productId)?.reorderDays ?? 14;
      const daysSince = (Date.now() - entry.last) / DAY_MS;
      return {
        productId,
        timesPurchased: entry.times,
        unitsPurchased: entry.units,
        lastPurchasedAt: new Date(entry.last).toISOString(),
        daysUntilDue: Math.round(cadence - daysSince),
      };
    })
    .sort((a, b) => b.timesPurchased - a.timesPurchased || a.daysUntilDue - b.daysUntilDue);
}

export function topCategories(userId: string): { category: CategoryId; share: number }[] {
  const totals = new Map<CategoryId, number>();
  let all = 0;
  for (const basket of userBaskets(userId)) {
    for (const line of basket.lines) {
      const product = productById.get(line.productId);
      if (!product) continue;
      totals.set(product.category, (totals.get(product.category) ?? 0) + line.quantity);
      all += line.quantity;
    }
  }
  if (all === 0) return [];
  return [...totals.entries()]
    .map(([category, units]) => ({ category, share: units / all }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 4);
}

function isBuyable(productId: string): boolean {
  return (inventory.get(productId)?.available ?? 0) > 0;
}

function describeDays(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} weeks ago`;
}

export function recommend(userId: string, cart: CartLine[]): RecommendationSection[] {
  const similarity = similarityForUser(userId);
  const stats = purchaseStats(userId);
  const statByProduct = new Map(stats.map((stat) => [stat.productId, stat]));
  const cartIds = new Set(cart.filter((line) => line.quantity > 0).map((line) => line.productId));
  const affinity = new Map(topCategories(userId).map((entry) => [entry.category, entry.share]));

  const dueForReorder: Recommendation[] = stats
    .filter((stat) => stat.daysUntilDue <= 2 && isBuyable(stat.productId) && !cartIds.has(stat.productId))
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, 8)
    .map((stat) => {
      const cadence = productById.get(stat.productId)?.reorderDays ?? 14;
      const daysSince = Math.round((Date.now() - new Date(stat.lastPurchasedAt).getTime()) / DAY_MS);
      return {
        productId: stat.productId,
        kind: 'due_for_reorder' as const,
        reason:
          stat.daysUntilDue < 0
            ? `You usually reorder every ${cadence} days — last bought ${describeDays(daysSince)}`
            : `Bought ${describeDays(daysSince)}, you normally run out around now`,
        score: 1 - stat.daysUntilDue / 100,
      };
    });

  const dueIds = new Set(dueForReorder.map((item) => item.productId));

  const buyItAgain: Recommendation[] = stats
    .filter((stat) => isBuyable(stat.productId) && !dueIds.has(stat.productId) && !cartIds.has(stat.productId))
    .slice(0, 10)
    .map((stat) => ({
      productId: stat.productId,
      kind: 'buy_it_again' as const,
      reason:
        stat.timesPurchased > 1
          ? `In ${stat.timesPurchased} of your past orders`
          : `You bought this ${describeDays(Math.round((Date.now() - new Date(stat.lastPurchasedAt).getTime()) / DAY_MS))}`,
      score: stat.timesPurchased,
    }));

  const pickedForYou: Recommendation[] = products
    .filter(
      (product) =>
        !statByProduct.has(product.id) && !cartIds.has(product.id) && isBuyable(product.id),
    )
    .map((product) => {
      let best = { productId: '', score: 0 };
      let total = 0;
      for (const stat of stats) {
        // Recent purchases say more about current taste than old ones.
        const daysSince = (Date.now() - new Date(stat.lastPurchasedAt).getTime()) / DAY_MS;
        const recency = 1 / (1 + daysSince / 30);
        const contribution = similarity(stat.productId, product.id) * (1 + Math.log1p(stat.timesPurchased)) * recency;
        total += contribution;
        if (contribution > best.score) best = { productId: stat.productId, score: contribution };
      }
      const categoryBoost = (affinity.get(product.category) ?? 0) * 0.35;
      const anchor = productById.get(best.productId);
      return {
        productId: product.id,
        kind: 'picked_for_you' as const,
        reason: anchor
          ? `Shoppers who buy ${anchor.name} often add this`
          : `Popular in ${product.category.replace('-', ' & ')}, which you shop most`,
        score: total + categoryBoost,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const pairsWithCart: Recommendation[] = cartIds.size
    ? products
        .filter((product) => !cartIds.has(product.id) && isBuyable(product.id))
        .map((product) => {
          let best = { productId: '', score: 0 };
          let total = 0;
          for (const cartId of cartIds) {
            const contribution = similarity(cartId, product.id);
            total += contribution;
            if (contribution > best.score) best = { productId: cartId, score: contribution };
          }
          const anchor = productById.get(best.productId);
          return {
            productId: product.id,
            kind: 'pairs_with_cart' as const,
            reason: anchor ? `Frequently bought with ${anchor.name}` : 'Goes well with your basket',
            score: total,
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    : [];

  const sections: RecommendationSection[] = [
    {
      kind: 'due_for_reorder',
      title: 'Time to restock',
      subtitle: 'Based on how often you reorder these',
      items: dueForReorder,
    },
    {
      kind: 'pairs_with_cart',
      title: 'Goes with your basket',
      subtitle: 'Other shoppers pair these with what you have added',
      items: pairsWithCart,
    },
    {
      kind: 'buy_it_again',
      title: 'Buy it again',
      subtitle: 'From your previous orders',
      items: buyItAgain,
    },
    {
      kind: 'picked_for_you',
      title: 'Picked for you',
      subtitle: 'New to you, matched to your purchase history',
      items: pickedForYou,
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}
