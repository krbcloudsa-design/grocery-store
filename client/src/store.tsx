import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  CartLine,
  Category,
  Order,
  PriceBreakdown,
  Product,
  ProfileResponse,
  RecommendationSection,
  ServerEvent,
  StockLevel,
} from '@shared/types.ts';
import { api } from './api.ts';

export interface Toast {
  id: number;
  tone: 'info' | 'success' | 'warning';
  title: string;
  body?: string;
}

export interface ActivityEntry {
  id: number;
  message: string;
  at: number;
  tone: 'sale' | 'restock' | 'hold';
}

type Connection = 'connecting' | 'live' | 'offline';

interface StoreValue {
  ready: boolean;
  categories: Category[];
  products: Product[];
  productById: Map<string, Product>;
  stock: Map<string, StockLevel>;
  availableFor: (productId: string) => number;
  connection: Connection;
  lastSyncAt: number;
  activity: ActivityEntry[];
  flashed: Set<string>;
  cart: CartLine[];
  cartCount: number;
  quantityOf: (productId: string) => number;
  addToCart: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  reorder: (order: Order) => void;
  breakdown: PriceBreakdown;
  tip: number;
  setTip: (tip: number) => void;
  promoCode: string | null;
  applyPromo: (code: string) => void;
  removePromo: () => void;
  promoRejected: string | null;
  deliverySlot: string;
  setDeliverySlot: (slot: string) => void;
  deliverySlots: string[];
  promos: { code: string; label: string; minSubtotal?: number }[];
  testCards: { number: string; behaviour: string }[];
  recommendations: RecommendationSection[];
  orders: Order[];
  refreshOrders: () => void;
  profile: ProfileResponse | null;
  onOrderPlaced: (order: Order) => void;
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  requestRestock: (productId: string) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY_BREAKDOWN: PriceBreakdown = {
  subtotal: 0,
  discount: 0,
  discountCode: null,
  deliveryFee: 0,
  serviceFee: 0,
  tax: 0,
  tip: 0,
  total: 0,
  freeDeliveryRemaining: 3500,
};

const CART_STORAGE_KEY = 'freshcart.cart.v1';

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed)
      ? parsed.filter((line) => typeof line.productId === 'string' && line.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

let sequence = 0;
const nextId = () => ++sequence;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Map<string, StockLevel>>(new Map());
  const [connection, setConnection] = useState<Connection>('connecting');
  const [lastSyncAt, setLastSyncAt] = useState(Date.now());
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [flashed, setFlashed] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<CartLine[]>(loadCart);
  const [tip, setTip] = useState(200);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoRejected, setPromoRejected] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<PriceBreakdown>(EMPTY_BREAKDOWN);
  const [recommendations, setRecommendations] = useState<RecommendationSection[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [deliverySlots, setDeliverySlots] = useState<string[]>([]);
  const [deliverySlot, setDeliverySlot] = useState('');
  const [promos, setPromos] = useState<{ code: string; label: string; minSubtotal?: number }[]>([]);
  const [testCards, setTestCards] = useState<{ number: string; behaviour: string }[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = nextId();
    setToasts((current) => [...current.slice(-3), { ...toast, id }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 6000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catalog, options, profileResponse, orderResponse] = await Promise.all([
          api.catalog(),
          api.checkoutOptions(),
          api.profile(),
          api.orders(),
        ]);
        if (cancelled) return;
        setCategories(catalog.categories);
        setProducts(catalog.products);
        setStock(new Map(catalog.stock.map((level) => [level.productId, level])));
        setPromos(options.promos);
        setTestCards(options.testCards);
        setDeliverySlots(options.deliverySlots);
        setDeliverySlot((current) => current || options.deliverySlots[1] || options.deliverySlots[0]);
        setProfile(profileResponse);
        setOrders(orderResponse.orders);
        setReady(true);
      } catch {
        if (!cancelled) {
          pushToast({
            tone: 'warning',
            title: 'Could not reach the store',
            body: 'The API is not responding. Start it with npm run dev.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pushToast]);

  /**
   * Live inventory feed. Every mutation on the server arrives here, so cards
   * flip to "out of stock" and cart quantities get clamped without a refresh.
   */
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    let attempts = 0;
    let closed = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

      socket.onopen = () => {
        attempts = 0;
        setConnection('live');
      };

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data as string) as ServerEvent;
        setLastSyncAt(payload.serverTime);

        if (payload.type === 'stock:snapshot') {
          setStock(new Map(payload.stock.map((level) => [level.productId, level])));
          return;
        }
        if (payload.type !== 'stock:changed') return;

        setStock((current) => {
          const next = new Map(current);
          for (const change of payload.changes) next.set(change.stock.productId, change.stock);
          return next;
        });

        const touched = payload.changes.map((change) => change.stock.productId);
        setFlashed(new Set(touched));
        window.setTimeout(() => setFlashed(new Set()), 1200);

        const reason = payload.changes[0]?.reason;
        if (reason === 'other-shopper' || reason === 'restock') {
          setActivity((current) =>
            [
              {
                id: nextId(),
                message: payload.note,
                at: payload.serverTime,
                tone: reason === 'restock' ? ('restock' as const) : ('sale' as const),
              },
              ...current,
            ].slice(0, 24),
          );
        }

        // Keep the basket honest: never let a line exceed what is on the shelf.
        const clamps: { name: string; available: number }[] = [];
        const nextCart = cartRef.current
          .map((line) => {
            const change = payload.changes.find((entry) => entry.stock.productId === line.productId);
            if (!change || change.stock.available >= line.quantity) return line;
            clamps.push({
              name: productById.get(line.productId)?.name ?? line.productId,
              available: change.stock.available,
            });
            return { ...line, quantity: change.stock.available };
          })
          .filter((line) => line.quantity > 0);

        if (clamps.length > 0) {
          setCart(nextCart);
          const first = clamps[0];
          pushToast({
            tone: 'warning',
            title:
              first.available === 0
                ? `${first.name} just sold out`
                : `Only ${first.available} left of ${first.name}`,
            body: 'We updated your basket to match live stock.',
          });
        }
      };

      socket.onclose = () => {
        if (closed) return;
        setConnection('offline');
        attempts += 1;
        retry = window.setTimeout(connect, Math.min(8000, 500 * 2 ** attempts));
      };
    };

    connect();
    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      if (!socket) return;
      socket.onclose = null;
      // Closing a still-connecting socket logs a warning, so wait for the handshake.
      if (socket.readyState === WebSocket.CONNECTING) {
        const pending = socket;
        pending.addEventListener('open', () => pending.close());
      } else {
        socket.close();
      }
    };
  }, [productById, pushToast]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.price(cart, tip, promoCode);
        if (!cancelled) setBreakdown(response.breakdown);
      } catch {
        /* pricing retries on the next change */
      }
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cart, tip, promoCode, ready]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.recommendations(cart);
        if (!cancelled) setRecommendations(response.sections);
      } catch {
        /* recommendations are non-critical */
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cart, ready, orders]);

  const availableFor = useCallback(
    (productId: string) => stock.get(productId)?.available ?? 0,
    [stock],
  );

  const quantityOf = useCallback(
    (productId: string) => cart.find((line) => line.productId === productId)?.quantity ?? 0,
    [cart],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const available = stock.get(productId)?.available ?? 0;
      const capped = Math.max(0, Math.min(quantity, available));
      setCart((current) => {
        const without = current.filter((line) => line.productId !== productId);
        return capped === 0 ? without : [...without, { productId, quantity: capped }];
      });
      if (quantity > available) {
        pushToast({
          tone: 'warning',
          title: available === 0 ? 'That item just sold out' : `Only ${available} available right now`,
          body: 'Live stock limits how many you can add.',
        });
      }
    },
    [pushToast, stock],
  );

  const addToCart = useCallback(
    (productId: string, quantity = 1) => {
      setQuantity(productId, quantityOf(productId) + quantity);
    },
    [quantityOf, setQuantity],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const reorder = useCallback(
    (order: Order) => {
      const skipped: string[] = [];
      const merged = new Map(cartRef.current.map((line) => [line.productId, line.quantity]));
      for (const line of order.lines) {
        const available = stock.get(line.productId)?.available ?? 0;
        const wanted = (merged.get(line.productId) ?? 0) + line.quantity;
        if (available === 0) {
          skipped.push(line.name);
          continue;
        }
        merged.set(line.productId, Math.min(wanted, available));
      }
      setCart([...merged.entries()].map(([productId, quantity]) => ({ productId, quantity })));
      pushToast({
        tone: skipped.length ? 'warning' : 'success',
        title: skipped.length ? 'Added what was in stock' : `Added ${order.lines.length} items to your basket`,
        body: skipped.length ? `Out of stock: ${skipped.join(', ')}` : undefined,
      });
    },
    [pushToast, stock],
  );

  const applyPromo = useCallback(
    async (code: string) => {
      const normalised = code.trim().toUpperCase();
      if (!normalised) return;
      const response = await api.price(cartRef.current, tip, normalised);
      if (response.breakdown.discountCode === normalised || normalised === 'FREEDEL') {
        setPromoCode(normalised);
        setPromoRejected(null);
        setBreakdown(response.breakdown);
        pushToast({ tone: 'success', title: `${normalised} applied` });
      } else {
        setPromoRejected(normalised);
      }
    },
    [pushToast, tip],
  );

  const removePromo = useCallback(() => {
    setPromoCode(null);
    setPromoRejected(null);
  }, []);

  const onOrderPlaced = useCallback(
    async (order: Order) => {
      setCart([]);
      setPromoCode(null);
      setOrders((current) => [order, ...current]);
      try {
        const [profileResponse, orderResponse] = await Promise.all([api.profile(), api.orders()]);
        setProfile(profileResponse);
        setOrders(orderResponse.orders);
      } catch {
        /* the optimistic order already shows in the panel */
      }
    },
    [],
  );

  const refreshOrders = useCallback(async () => {
    try {
      const response = await api.orders();
      setOrders(response.orders);
    } catch {
      /* the panel keeps showing the last known statuses */
    }
  }, []);

  const requestRestock = useCallback(
    async (productId: string) => {
      try {
        await api.restock(productId);
      } catch {
        pushToast({ tone: 'warning', title: 'Could not reach the warehouse' });
      }
    },
    [pushToast],
  );

  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);

  const value: StoreValue = {
    ready,
    categories,
    products,
    productById,
    stock,
    availableFor,
    connection,
    lastSyncAt,
    activity,
    flashed,
    cart,
    cartCount,
    quantityOf,
    addToCart,
    setQuantity,
    clearCart,
    reorder,
    breakdown,
    tip,
    setTip,
    promoCode,
    applyPromo,
    removePromo,
    promoRejected,
    deliverySlot,
    setDeliverySlot,
    deliverySlots,
    promos,
    testCards,
    recommendations,
    orders,
    refreshOrders,
    profile,
    onOrderPlaced,
    toasts,
    pushToast,
    dismissToast,
    requestRestock,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}
