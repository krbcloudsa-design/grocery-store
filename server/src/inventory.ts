import { EventEmitter } from 'node:events';
import type { CartLine, StockChange, StockChangeReason, StockLevel } from '../../shared/types.js';
import { products } from './data/catalog.js';

/** How long a checkout may hold stock before the units go back on the shelf. */
export const RESERVATION_TTL_MS = 10 * 60 * 1000;

/** Window in which an out-of-stock item gets a replenishment delivery. */
const RESTOCK_DELAY_MS = { min: 40_000, max: 95_000 };

interface Reservation {
  id: string;
  lines: CartLine[];
  expiresAt: number;
  timer: NodeJS.Timeout;
}

export interface ReserveFailure {
  productId: string;
  requested: number;
  available: number;
}

let reservationSeq = 0;

/**
 * Authoritative, in-memory inventory ledger.
 *
 * `onHand` is what sits in the warehouse and `reserved` is what in-flight
 * checkouts are holding, so `available` is what any shopper may add to a cart.
 * Every mutation emits a `change` event, which the WebSocket hub forwards to
 * connected clients — that is what makes availability update live in the UI.
 */
class InventoryStore extends EventEmitter {
  private levels = new Map<string, StockLevel>();
  private reservations = new Map<string, Reservation>();
  private restockTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    for (const product of products) {
      const available = product.startingStock;
      this.levels.set(product.id, {
        productId: product.id,
        onHand: available,
        reserved: 0,
        available,
        status: statusFor(available, product.lowStockThreshold),
        lowStockThreshold: product.lowStockThreshold,
        restockEta: null,
        updatedAt: Date.now(),
      });
      if (available === 0) this.scheduleRestock(product.id);
    }
  }

  snapshot(): StockLevel[] {
    return [...this.levels.values()].map((level) => ({ ...level }));
  }

  get(productId: string): StockLevel | undefined {
    const level = this.levels.get(productId);
    return level ? { ...level } : undefined;
  }

  /**
   * Holds units for a checkout. Either every line is held or none are, so a
   * shopper never pays for something another shopper took mid-checkout.
   */
  reserve(lines: CartLine[]): { ok: true; id: string; expiresAt: number } | { ok: false; failures: ReserveFailure[] } {
    const failures: ReserveFailure[] = [];
    for (const line of lines) {
      const level = this.levels.get(line.productId);
      if (!level || level.available < line.quantity) {
        failures.push({
          productId: line.productId,
          requested: line.quantity,
          available: level?.available ?? 0,
        });
      }
    }
    if (failures.length > 0) return { ok: false, failures };

    const id = `rsv_${++reservationSeq}_${Date.now().toString(36)}`;
    const expiresAt = Date.now() + RESERVATION_TTL_MS;
    const timer = setTimeout(() => this.release(id, 'reservation-released'), RESERVATION_TTL_MS);
    timer.unref?.();
    this.reservations.set(id, { id, lines: lines.map((line) => ({ ...line })), expiresAt, timer });

    this.mutate(
      lines.map((line) => ({ productId: line.productId, reserved: line.quantity })),
      'reservation',
      'Items held for a checkout in progress',
    );
    return { ok: true, id, expiresAt };
  }

  /** Returns held units to the shelf; safe to call twice. */
  release(reservationId: string, reason: StockChangeReason = 'reservation-released'): void {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return;
    clearTimeout(reservation.timer);
    this.reservations.delete(reservationId);
    this.mutate(
      reservation.lines.map((line) => ({ productId: line.productId, reserved: -line.quantity })),
      reason,
      'Checkout abandoned — items returned to the shelf',
    );
  }

  /** Turns a hold into a sale: the units leave the warehouse for good. */
  commit(reservationId: string): CartLine[] | null {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) return null;
    clearTimeout(reservation.timer);
    this.reservations.delete(reservationId);
    this.mutate(
      reservation.lines.map((line) => ({
        productId: line.productId,
        reserved: -line.quantity,
        onHand: -line.quantity,
      })),
      'purchase',
      'Your order was picked from the warehouse',
    );
    return reservation.lines;
  }

  isReservationActive(reservationId: string): boolean {
    return this.reservations.has(reservationId);
  }

  /** Immediate sale with no hold — used by the concurrent-shopper simulation. */
  sellNow(lines: CartLine[], reason: StockChangeReason, note: string): void {
    const applicable = lines.filter((line) => (this.levels.get(line.productId)?.available ?? 0) >= line.quantity);
    if (applicable.length === 0) return;
    this.mutate(
      applicable.map((line) => ({ productId: line.productId, onHand: -line.quantity })),
      reason,
      note,
    );
  }

  restock(productId: string, units: number, note = 'Replenishment delivery arrived'): void {
    this.mutate([{ productId, onHand: units }], 'restock', note);
  }

  private mutate(
    deltas: { productId: string; onHand?: number; reserved?: number }[],
    reason: StockChangeReason,
    note: string,
  ): void {
    const changes: StockChange[] = [];
    for (const delta of deltas) {
      const level = this.levels.get(delta.productId);
      if (!level) continue;
      const previousAvailable = level.available;
      level.onHand = Math.max(0, level.onHand + (delta.onHand ?? 0));
      level.reserved = Math.max(0, level.reserved + (delta.reserved ?? 0));
      level.available = Math.max(0, level.onHand - level.reserved);
      level.status = statusFor(level.available, level.lowStockThreshold);
      level.updatedAt = Date.now();

      if (level.available === 0) {
        this.scheduleRestock(delta.productId);
      } else if (level.restockEta) {
        level.restockEta = null;
        const timer = this.restockTimers.get(delta.productId);
        if (timer) clearTimeout(timer);
        this.restockTimers.delete(delta.productId);
      }

      changes.push({ stock: { ...level }, reason, delta: level.available - previousAvailable });
    }
    if (changes.length > 0) this.emit('change', changes, note);
  }

  private scheduleRestock(productId: string): void {
    if (this.restockTimers.has(productId)) return;
    const level = this.levels.get(productId);
    if (!level) return;
    const wait = RESTOCK_DELAY_MS.min + Math.random() * (RESTOCK_DELAY_MS.max - RESTOCK_DELAY_MS.min);
    level.restockEta = new Date(Date.now() + wait).toISOString();
    const timer = setTimeout(() => {
      this.restockTimers.delete(productId);
      const product = products.find((candidate) => candidate.id === productId);
      const units = Math.max(10, Math.round((product?.lowStockThreshold ?? 8) * 2.5));
      this.restock(productId, units, 'Back in stock — a replenishment delivery just landed');
    }, wait);
    timer.unref?.();
    this.restockTimers.set(productId, timer);
  }
}

function statusFor(available: number, lowStockThreshold: number) {
  if (available <= 0) return 'out_of_stock' as const;
  if (available <= lowStockThreshold) return 'low_stock' as const;
  return 'in_stock' as const;
}

export const inventory = new InventoryStore();
