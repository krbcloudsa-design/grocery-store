import type {
  CardDetails,
  CartLine,
  CatalogResponse,
  Order,
  PaymentError,
  PaymentIntent,
  PaymentMethodType,
  PriceBreakdown,
  ProfileResponse,
  RecommendationSection,
  StockLevel,
} from '@shared/types.ts';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }
  return payload as T;
}

/** Carries the gateway's typed error so the checkout form can field-map it. */
export class ApiError extends Error {
  readonly status: number;
  readonly paymentError: PaymentError | null;
  readonly unavailable: { productId: string; name: string; available: number }[];
  readonly intent: PaymentIntent | null;

  constructor(status: number, payload: unknown) {
    const body = (payload ?? {}) as {
      error?: PaymentError | string;
      unavailable?: { productId: string; name: string; available: number }[];
      intent?: PaymentIntent;
    };
    const paymentError = typeof body.error === 'object' && body.error !== null ? body.error : null;
    super(paymentError?.message ?? (typeof body.error === 'string' ? body.error : `Request failed (${status})`));
    this.name = 'ApiError';
    this.status = status;
    this.paymentError = paymentError;
    this.unavailable = body.unavailable ?? [];
    this.intent = body.intent ?? null;
  }
}

export const api = {
  catalog: () => request<CatalogResponse>('/catalog'),

  profile: () => request<ProfileResponse>('/profile'),

  orders: () => request<{ orders: Order[] }>('/orders'),

  stock: () => request<{ stock: StockLevel[] }>('/stock'),

  checkoutOptions: () =>
    request<{
      promos: { code: string; label: string; minSubtotal?: number }[];
      testCards: { number: string; behaviour: string }[];
      deliverySlots: string[];
    }>('/checkout/options'),

  recommendations: (cart: CartLine[]) =>
    request<{ sections: RecommendationSection[] }>('/recommendations', {
      method: 'POST',
      body: JSON.stringify({ cart }),
    }),

  price: (cart: CartLine[], tip: number, promoCode: string | null) =>
    request<{ breakdown: PriceBreakdown }>('/cart/price', {
      method: 'POST',
      body: JSON.stringify({ cart, tip, promoCode }),
    }),

  createIntent: (input: { cart: CartLine[]; tip: number; promoCode: string | null; deliverySlot: string }) =>
    request<{ intent: PaymentIntent }>('/payments/intents', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  confirmIntent: (id: string, input: { method: PaymentMethodType; card?: CardDetails; vpa?: string }) =>
    request<{ intent: PaymentIntent; order?: Order }>(`/payments/intents/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  authenticateIntent: (id: string, otp: string) =>
    request<{ intent: PaymentIntent; order?: Order }>(`/payments/intents/${id}/authenticate`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
    }),

  cancelIntent: (id: string) =>
    request<{ canceled: boolean }>(`/payments/intents/${id}/cancel`, { method: 'POST' }),

  restock: (productId: string, units = 24) =>
    request<{ stock: StockLevel }>(`/inventory/${productId}/restock`, {
      method: 'POST',
      body: JSON.stringify({ units }),
    }),
};
