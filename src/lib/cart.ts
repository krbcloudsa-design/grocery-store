"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { effectivePrice, productById } from "./catalog";
import { DELIVERY_FEE, FREE_DELIVERY_ABOVE } from "./format";
import type { CartLine, Order } from "./types";

const CART_KEY = "rasoi.cart.v1";
const ORDERS_KEY = "rasoi.orders.v1";

type StoreState = {
  lines: CartLine[];
  orders: Order[];
  /** False until localStorage has been read, so the server and first client render match. */
  ready: boolean;
};

const SERVER_STATE: StoreState = { lines: [], orders: [], ready: false };

let state = SERVER_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadOnce() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = {
    lines: readJSON<CartLine[]>(CART_KEY, []),
    orders: readJSON<Order[]>(ORDERS_KEY, []),
    ready: true,
  };
}

function persist(next: StoreState) {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(next.lines));
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(next.orders));
  } catch {
    // Storage can be unavailable in private browsing; the session still works in memory.
  }
}

function update(mutate: (current: StoreState) => Partial<StoreState>) {
  loadOnce();
  const next: StoreState = { ...state, ...mutate(state), ready: true };
  state = next;
  persist(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  loadOnce();
  return state;
}

function getServerSnapshot() {
  return SERVER_STATE;
}

export function useCart() {
  const { lines, orders, ready } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const qtyOf = useCallback(
    (productId: string) => lines.find((line) => line.productId === productId)?.qty ?? 0,
    [lines],
  );

  const setQty = useCallback((productId: string, qty: number) => {
    update((current) => {
      if (qty <= 0) {
        return { lines: current.lines.filter((line) => line.productId !== productId) };
      }
      const exists = current.lines.some((line) => line.productId === productId);
      return {
        lines: exists
          ? current.lines.map((line) => (line.productId === productId ? { ...line, qty } : line))
          : [...current.lines, { productId, qty }],
      };
    });
  }, []);

  const addToCart = useCallback((productId: string) => {
    const product = productById(productId);
    if (!product) return;
    update((current) =>
      current.lines.some((line) => line.productId === productId)
        ? {}
        : { lines: [...current.lines, { productId, qty: product.moq }] },
    );
  }, []);

  const increment = useCallback((productId: string) => {
    const product = productById(productId);
    if (!product) return;
    update((current) => {
      const line = current.lines.find((entry) => entry.productId === productId);
      if (!line) return { lines: [...current.lines, { productId, qty: product.moq }] };
      return {
        lines: current.lines.map((entry) =>
          entry.productId === productId ? { ...entry, qty: entry.qty + product.step } : entry,
        ),
      };
    });
  }, []);

  const decrement = useCallback((productId: string) => {
    const product = productById(productId);
    if (!product) return;
    update((current) => {
      const line = current.lines.find((entry) => entry.productId === productId);
      if (!line) return {};
      const nextQty = line.qty - product.step;
      if (nextQty < product.moq) {
        return { lines: current.lines.filter((entry) => entry.productId !== productId) };
      }
      return {
        lines: current.lines.map((entry) =>
          entry.productId === productId ? { ...entry, qty: nextQty } : entry,
        ),
      };
    });
  }, []);

  const clear = useCallback(() => update(() => ({ lines: [] })), []);

  const placeOrder = useCallback((order: Order) => {
    update((current) => ({ lines: [], orders: [order, ...current.orders] }));
  }, []);

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;
    let savings = 0;
    for (const line of lines) {
      const product = productById(line.productId);
      if (!product) continue;
      const unitPrice = effectivePrice(product, line.qty);
      const lineTotal = unitPrice * line.qty;
      subtotal += lineTotal;
      gst += (lineTotal * product.gstRate) / 100;
      savings += (product.mrp - unitPrice) * line.qty;
    }
    const deliveryFee = subtotal === 0 || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    return { subtotal, gst, savings, deliveryFee, total: subtotal + gst + deliveryFee };
  }, [lines]);

  return {
    lines,
    orders,
    ready,
    itemCount: lines.length,
    qtyOf,
    setQty,
    addToCart,
    increment,
    decrement,
    clear,
    placeOrder,
    ...totals,
  };
}
