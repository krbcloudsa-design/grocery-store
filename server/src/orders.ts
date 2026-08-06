import type { CartLine, Order, OrderStatus, PaymentMethodType, PriceBreakdown } from '../../shared/types.js';
import { DEMO_USER, demoOrderSeeds } from './data/history.js';
import { priceOrder, toOrderLines } from './pricing.js';

let orderSeq = 1000;
const orders: Order[] = [];

export interface RecordOrderInput {
  userId: string;
  cart: CartLine[];
  breakdown: PriceBreakdown;
  deliverySlot: string;
  payment: { method: PaymentMethodType; brand: string | null; last4: string | null; intentId: string };
  placedAt?: Date;
}

export function recordOrder(input: RecordOrderInput): Order {
  const id = `FC-${++orderSeq}`;
  const placedAt = input.placedAt ?? new Date();
  const order: Order = {
    id,
    userId: input.userId,
    lines: toOrderLines(input.cart),
    breakdown: input.breakdown,
    status: 'confirmed',
    placedAt: placedAt.toISOString(),
    deliverySlot: input.deliverySlot,
    payment: {
      ...input.payment,
      receiptUrl: `/receipts/${id}.pdf`,
    },
  };
  orders.unshift(order);
  return order;
}

/**
 * Delivery status is derived from age rather than stored, so a fresh order
 * visibly moves from "confirmed" to "delivered" while the demo is open.
 */
function statusFor(order: Order): OrderStatus {
  const minutes = (Date.now() - new Date(order.placedAt).getTime()) / 60_000;
  if (minutes < 1) return 'confirmed';
  if (minutes < 3) return 'packing';
  if (minutes < 7) return 'out_for_delivery';
  return 'delivered';
}

export function listOrders(userId: string): Order[] {
  return orders
    .filter((order) => order.userId === userId)
    .map((order) => ({ ...order, status: statusFor(order) }));
}

export function findOrder(orderId: string): Order | undefined {
  const order = orders.find((candidate) => candidate.id === orderId);
  return order ? { ...order, status: statusFor(order) } : undefined;
}

/** Every basket a user has bought, newest first — the input to recommendations. */
export function userBaskets(userId: string): { placedAt: Date; lines: CartLine[] }[] {
  return orders
    .filter((order) => order.userId === userId)
    .map((order) => ({
      placedAt: new Date(order.placedAt),
      lines: order.lines.map(({ productId, quantity }) => ({ productId, quantity })),
    }));
}

export function seedDemoOrders(): void {
  const slots = ['Tomorrow, 9–11am', 'Today, 6–8pm', 'Saturday, 10am–12pm', 'Today, 4–6pm'];
  for (const [index, seed] of demoOrderSeeds().entries()) {
    const lines = toOrderLines(seed.lines);
    recordOrder({
      userId: DEMO_USER.id,
      cart: seed.lines,
      breakdown: priceOrder(lines, { tip: 200 }),
      deliverySlot: slots[index % slots.length],
      payment: { method: 'card', brand: 'Visa', last4: '4242', intentId: `pi_seed_${index}` },
      placedAt: seed.placedAt,
    });
  }
}
