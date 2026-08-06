import { products } from './data/catalog.js';
import { inventory } from './inventory.js';

const NEIGHBOURHOODS = [
  'Park Slope',
  'Williamsburg',
  'Astoria',
  'Harlem',
  'Bushwick',
  'Long Island City',
];

/**
 * Stands in for the rest of the customer base. Without other shoppers drawing
 * stock down, "real-time inventory" would have nothing to show, so this drives
 * the same ledger the checkout uses — including selling items out.
 */
export function startShopperSimulation(): NodeJS.Timeout {
  const tick = () => {
    const buyable = products.filter((product) => (inventory.get(product.id)?.available ?? 0) > 0);
    if (buyable.length === 0) return;

    // Skew towards items that are already scarce so shoppers see sell-outs.
    const weighted = buyable.flatMap((product) => {
      const level = inventory.get(product.id)!;
      const weight = level.status === 'low_stock' ? 4 : 1;
      return Array.from({ length: weight }, () => product);
    });
    const product = weighted[Math.floor(Math.random() * weighted.length)];
    const level = inventory.get(product.id)!;
    const quantity = Math.min(level.available, 1 + Math.floor(Math.random() * 2));
    const neighbourhood = NEIGHBOURHOODS[Math.floor(Math.random() * NEIGHBOURHOODS.length)];

    inventory.sellNow(
      [{ productId: product.id, quantity }],
      'other-shopper',
      `A shopper in ${neighbourhood} just bought ${quantity} × ${product.name}`,
    );
  };

  const timer = setInterval(tick, 4500);
  timer.unref?.();
  return timer;
}
