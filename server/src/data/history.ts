import type { CartLine } from '../../../shared/types.js';

/**
 * Synthetic purchase history. The recommender needs a population of baskets to
 * learn "shoppers who buy X also buy Y" from, so baskets are generated from a
 * handful of shopper archetypes with a seeded PRNG — deterministic across
 * restarts, but with enough overlap between archetypes to be interesting.
 */

const archetypes: { name: string; pool: string[]; size: [number, number] }[] = [
  {
    name: 'breakfast regular',
    pool: [
      'p_milk', 'p_eggs', 'p_coffee', 'p_croissant', 'p_banana', 'p_orangejuice',
      'p_yogurt', 'p_honey', 'p_peanutbutter', 'p_bagel', 'p_oatmilk', 'p_blueberry',
    ],
    size: [4, 7],
  },
  {
    name: 'pasta night',
    pool: [
      'p_pasta', 'p_passata', 'p_oliveoil', 'p_cheddar', 'p_mince', 'p_tomato',
      'p_sourdough', 'p_darkchoc', 'p_broccoli',
    ],
    size: [4, 6],
  },
  {
    name: 'health focused',
    pool: [
      'p_spinach', 'p_broccoli', 'p_avocado', 'p_salmon', 'p_blueberry', 'p_yogurt',
      'p_oatmilk', 'p_hummus', 'p_sparkling', 'p_strawberry', 'p_eggs',
    ],
    size: [4, 7],
  },
  {
    name: 'family shop',
    pool: [
      'p_chicken', 'p_rice', 'p_peas', 'p_fries', 'p_pizza', 'p_milk', 'p_eggs',
      'p_kitchenroll', 'p_crisps', 'p_icecream', 'p_pasta',
    ],
    size: [5, 8],
  },
  {
    name: 'household run',
    pool: [
      'p_kitchenroll', 'p_dishsoap', 'p_binbags', 'p_laundry', 'p_milk', 'p_tea',
      'p_pasta', 'p_rice', 'p_passata',
    ],
    size: [3, 6],
  },
  {
    name: 'movie night',
    pool: ['p_popcorn', 'p_crisps', 'p_darkchoc', 'p_icecream', 'p_pizza', 'p_sparkling', 'p_hummus'],
    size: [3, 5],
  },
  {
    name: 'weekend brunch',
    pool: [
      'p_avocado', 'p_sourdough', 'p_eggs', 'p_salmon', 'p_lemon', 'p_coffee',
      'p_strawberry', 'p_croissant', 'p_butter', 'p_prawns',
    ],
    size: [4, 7],
  },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Baskets from other shoppers, used only to mine co-purchase signal. */
export const communityBaskets: string[][] = (() => {
  const random = mulberry32(20260806);
  const baskets: string[][] = [];
  for (let index = 0; index < 220; index += 1) {
    const archetype = archetypes[Math.floor(random() * archetypes.length)];
    const [min, max] = archetype.size;
    const size = min + Math.floor(random() * (max - min + 1));
    const basket = new Set<string>();
    while (basket.size < size) {
      basket.add(archetype.pool[Math.floor(random() * archetype.pool.length)]);
    }
    // A tenth of shops pick up one thing from a neighbouring aisle.
    if (random() < 0.35) {
      const other = archetypes[Math.floor(random() * archetypes.length)];
      basket.add(other.pool[Math.floor(random() * other.pool.length)]);
    }
    baskets.push([...basket]);
  }
  return baskets;
})();

/**
 * The demo shopper's own order history: a brunch-and-fresh-food persona with
 * repeat staples, so "buy it again" and reorder timing have something to work
 * with on first load.
 */
const demoBaskets: { daysAgo: number; lines: CartLine[] }[] = [
  {
    daysAgo: 3,
    lines: [
      { productId: 'p_milk', quantity: 1 },
      { productId: 'p_spinach', quantity: 1 },
      { productId: 'p_sourdough', quantity: 1 },
      { productId: 'p_yogurt', quantity: 2 },
      { productId: 'p_banana', quantity: 1 },
    ],
  },
  {
    daysAgo: 9,
    lines: [
      { productId: 'p_coffee', quantity: 1 },
      { productId: 'p_oatmilk', quantity: 2 },
      { productId: 'p_avocado', quantity: 1 },
      { productId: 'p_eggs', quantity: 1 },
      { productId: 'p_sourdough', quantity: 1 },
    ],
  },
  {
    daysAgo: 15,
    lines: [
      { productId: 'p_milk', quantity: 1 },
      { productId: 'p_banana', quantity: 2 },
      { productId: 'p_salmon', quantity: 1 },
      { productId: 'p_lemon', quantity: 1 },
      { productId: 'p_spinach', quantity: 1 },
      { productId: 'p_oliveoil', quantity: 1 },
    ],
  },
  {
    daysAgo: 22,
    lines: [
      { productId: 'p_eggs', quantity: 1 },
      { productId: 'p_coffee', quantity: 1 },
      { productId: 'p_yogurt', quantity: 1 },
      { productId: 'p_strawberry', quantity: 1 },
      { productId: 'p_darkchoc', quantity: 2 },
    ],
  },
  {
    daysAgo: 28,
    lines: [
      { productId: 'p_milk', quantity: 2 },
      { productId: 'p_pasta', quantity: 2 },
      { productId: 'p_passata', quantity: 2 },
      { productId: 'p_cheddar', quantity: 1 },
      { productId: 'p_banana', quantity: 1 },
    ],
  },
  {
    daysAgo: 37,
    lines: [
      { productId: 'p_sourdough', quantity: 1 },
      { productId: 'p_butter', quantity: 1 },
      { productId: 'p_avocado', quantity: 2 },
      { productId: 'p_eggs', quantity: 1 },
      { productId: 'p_coffee', quantity: 1 },
    ],
  },
  {
    daysAgo: 46,
    lines: [
      { productId: 'p_milk', quantity: 1 },
      { productId: 'p_spinach', quantity: 2 },
      { productId: 'p_broccoli', quantity: 1 },
      { productId: 'p_chicken', quantity: 1 },
      { productId: 'p_rice', quantity: 1 },
    ],
  },
  {
    daysAgo: 58,
    lines: [
      { productId: 'p_coffee', quantity: 1 },
      { productId: 'p_banana', quantity: 1 },
      { productId: 'p_yogurt', quantity: 2 },
      { productId: 'p_honey', quantity: 1 },
      { productId: 'p_kitchenroll', quantity: 1 },
    ],
  },
];

export const DEMO_USER = {
  id: 'u_demo',
  name: 'Aanya Sharma',
  address: '18 Rosewood Lane, Apt 4B, Brooklyn NY',
};

export function demoOrderSeeds(): { placedAt: Date; lines: CartLine[] }[] {
  const dayMs = 24 * 60 * 60 * 1000;
  return demoBaskets.map((basket) => ({
    placedAt: new Date(Date.now() - basket.daysAgo * dayMs),
    lines: basket.lines,
  }));
}
