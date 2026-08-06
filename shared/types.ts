/**
 * Domain types shared by the FreshCart API and web client.
 * All money values are integer cents to keep arithmetic exact.
 */

export type CategoryId =
  | 'produce'
  | 'bakery'
  | 'dairy-eggs'
  | 'meat-seafood'
  | 'pantry'
  | 'beverages'
  | 'snacks'
  | 'frozen'
  | 'household';

export interface Category {
  id: CategoryId;
  name: string;
  emoji: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: CategoryId;
  /** Sale unit shown next to the price, e.g. "500 g" or "dozen". */
  unit: string;
  price: number;
  /** Original price when the item is discounted. */
  compareAtPrice?: number;
  emoji: string;
  description: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  /** Typical days between repeat purchases, used to time reorder reminders. */
  reorderDays: number;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface StockLevel {
  productId: string;
  /** Units physically in the warehouse. */
  onHand: number;
  /** Units held by in-flight checkouts. */
  reserved: number;
  /** onHand - reserved: what a shopper can actually add to their cart. */
  available: number;
  status: StockStatus;
  /** Threshold at or below which the item is flagged as low stock. */
  lowStockThreshold: number;
  /** ISO timestamp of the next expected delivery while out of stock. */
  restockEta: string | null;
  updatedAt: number;
}

export type StockChangeReason =
  | 'snapshot'
  | 'purchase'
  | 'other-shopper'
  | 'reservation'
  | 'reservation-released'
  | 'restock'
  | 'shrinkage';

export interface StockChange {
  stock: StockLevel;
  reason: StockChangeReason;
  /** Signed unit delta on `available`. */
  delta: number;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface OrderLine extends CartLine {
  name: string;
  emoji: string;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface PriceBreakdown {
  subtotal: number;
  discount: number;
  discountCode: string | null;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tip: number;
  total: number;
  /** Spend needed to unlock free delivery, 0 once unlocked. */
  freeDeliveryRemaining: number;
}

export type PaymentMethodType = 'card' | 'upi' | 'wallet' | 'cash';

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'processing'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  status: PaymentIntentStatus;
  amount: number;
  currency: 'usd';
  breakdown: PriceBreakdown;
  lines: OrderLine[];
  /** Set when status is `requires_action`; the client must submit an OTP. */
  nextAction: { type: 'otp_challenge'; deliveryTarget: string } | null;
  lastError: PaymentError | null;
  /** Epoch ms at which the inventory hold on these items expires. */
  reservationExpiresAt: number;
  createdAt: number;
}

export interface PaymentError {
  code:
    | 'incomplete_card'
    | 'invalid_number'
    | 'invalid_expiry'
    | 'invalid_cvc'
    | 'card_declined'
    | 'insufficient_funds'
    | 'expired_card'
    | 'authentication_failed'
    | 'reservation_expired'
    | 'out_of_stock'
    | 'invalid_vpa';
  message: string;
  /** Form field the message should be attached to, when applicable. */
  field?: 'number' | 'expiry' | 'cvc' | 'name' | 'otp' | 'vpa';
}

export interface CardDetails {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export type OrderStatus = 'confirmed' | 'packing' | 'out_for_delivery' | 'delivered';

export interface Order {
  id: string;
  userId: string;
  lines: OrderLine[];
  breakdown: PriceBreakdown;
  status: OrderStatus;
  placedAt: string;
  deliverySlot: string;
  payment: {
    method: PaymentMethodType;
    brand: string | null;
    last4: string | null;
    intentId: string;
    receiptUrl: string;
  };
}

export type RecommendationKind =
  | 'buy_it_again'
  | 'due_for_reorder'
  | 'picked_for_you'
  | 'pairs_with_cart';

export interface Recommendation {
  productId: string;
  kind: RecommendationKind;
  /** Human-readable explanation rendered in the UI. */
  reason: string;
  score: number;
}

export interface RecommendationSection {
  kind: RecommendationKind;
  title: string;
  subtitle: string;
  items: Recommendation[];
}

export interface PurchaseStat {
  productId: string;
  timesPurchased: number;
  unitsPurchased: number;
  lastPurchasedAt: string;
  /** Days until the item is expected to run out, negative when overdue. */
  daysUntilDue: number;
}

export interface CatalogResponse {
  categories: Category[];
  products: Product[];
  stock: StockLevel[];
  serverTime: number;
}

export interface ProfileResponse {
  userId: string;
  name: string;
  address: string;
  orderCount: number;
  topCategories: { category: CategoryId; share: number }[];
  purchaseStats: PurchaseStat[];
}

/** Frames pushed from the API over the inventory WebSocket. */
export type ServerEvent =
  | { type: 'stock:snapshot'; stock: StockLevel[]; serverTime: number }
  | { type: 'stock:changed'; changes: StockChange[]; note: string; serverTime: number }
  | { type: 'activity'; message: string; serverTime: number };
