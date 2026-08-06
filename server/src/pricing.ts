import type { CartLine, OrderLine, PriceBreakdown } from '../../shared/types.js';
import { productById } from './data/catalog.js';

export const FREE_DELIVERY_THRESHOLD = 3500;
const DELIVERY_FEE = 399;
const SERVICE_FEE = 199;
const TAX_RATE = 0.0825;

interface Promo {
  code: string;
  label: string;
  /** Returns the discount in cents for a given pre-discount subtotal. */
  discount: (subtotal: number) => number;
  freeDelivery?: boolean;
  minSubtotal?: number;
}

const promos: Promo[] = [
  {
    code: 'FRESH10',
    label: '10% off your basket, up to $8',
    discount: (subtotal) => Math.min(Math.round(subtotal * 0.1), 800),
  },
  {
    code: 'WELCOME5',
    label: '$5 off orders over $25',
    minSubtotal: 2500,
    discount: () => 500,
  },
  {
    code: 'FREEDEL',
    label: 'Free delivery on any basket',
    discount: () => 0,
    freeDelivery: true,
  },
];

export const promoCatalog = promos.map(({ code, label, minSubtotal }) => ({ code, label, minSubtotal }));

export function toOrderLines(cart: CartLine[]): OrderLine[] {
  const lines: OrderLine[] = [];
  for (const line of cart) {
    const product = productById.get(line.productId);
    if (!product || line.quantity <= 0) continue;
    lines.push({
      productId: product.id,
      quantity: line.quantity,
      name: product.name,
      emoji: product.emoji,
      unit: product.unit,
      unitPrice: product.price,
      lineTotal: product.price * line.quantity,
    });
  }
  return lines;
}

export function priceOrder(
  lines: OrderLine[],
  options: { tip?: number; promoCode?: string | null } = {},
): PriceBreakdown {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const tip = Math.max(0, Math.round(options.tip ?? 0));

  const requested = options.promoCode?.trim().toUpperCase() || null;
  const promo = promos.find((candidate) => candidate.code === requested);
  const promoApplies = promo != null && subtotal >= (promo.minSubtotal ?? 0);
  const discount = promoApplies ? Math.min(promo.discount(subtotal), subtotal) : 0;

  const discountedSubtotal = subtotal - discount;
  const qualifiesFreeDelivery =
    discountedSubtotal >= FREE_DELIVERY_THRESHOLD || (promoApplies && promo.freeDelivery === true);

  const deliveryFee = subtotal === 0 || qualifiesFreeDelivery ? 0 : DELIVERY_FEE;
  const serviceFee = subtotal === 0 ? 0 : SERVICE_FEE;
  const tax = Math.round(discountedSubtotal * TAX_RATE);

  return {
    subtotal,
    discount,
    discountCode: promoApplies ? promo.code : null,
    deliveryFee,
    serviceFee,
    tax,
    tip,
    total: discountedSubtotal + deliveryFee + serviceFee + tax + tip,
    freeDeliveryRemaining: Math.max(0, FREE_DELIVERY_THRESHOLD - discountedSubtotal),
  };
}
