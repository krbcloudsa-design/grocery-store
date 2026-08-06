import { createServer } from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import type { CartLine } from '../../shared/types.js';
import { categories, publicProducts } from './data/catalog.js';
import { DEMO_USER } from './data/history.js';
import { inventory } from './inventory.js';
import { listOrders, recordOrder, seedDemoOrders } from './orders.js';
import {
  authenticateIntent,
  cancelIntent,
  confirmIntent,
  createIntent,
  getIntent,
  testCardGuide,
} from './payments.js';
import { priceOrder, promoCatalog, toOrderLines } from './pricing.js';
import { purchaseStats, recommend, topCategories } from './recommendations.js';
import { attachRealtime } from './realtime.js';
import { startShopperSimulation } from './simulator.js';

const PORT = Number(process.env.PORT ?? 4000);
const app = express();

app.use(cors());
app.use(express.json());

seedDemoOrders();

function readCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (line): line is CartLine =>
        typeof line === 'object' &&
        line !== null &&
        typeof (line as CartLine).productId === 'string' &&
        Number.isFinite((line as CartLine).quantity),
    )
    .map((line) => ({ productId: line.productId, quantity: Math.max(0, Math.floor(line.quantity)) }))
    .filter((line) => line.quantity > 0);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', serverTime: Date.now() });
});

app.get('/api/catalog', (_req, res) => {
  res.json({
    categories,
    products: publicProducts(),
    stock: inventory.snapshot(),
    serverTime: Date.now(),
  });
});

app.get('/api/stock', (_req, res) => {
  res.json({ stock: inventory.snapshot(), serverTime: Date.now() });
});

app.get('/api/profile', (_req, res) => {
  res.json({
    userId: DEMO_USER.id,
    name: DEMO_USER.name,
    address: DEMO_USER.address,
    orderCount: listOrders(DEMO_USER.id).length,
    topCategories: topCategories(DEMO_USER.id),
    purchaseStats: purchaseStats(DEMO_USER.id),
  });
});

app.get('/api/orders', (_req, res) => {
  res.json({ orders: listOrders(DEMO_USER.id) });
});

app.post('/api/recommendations', (req, res) => {
  res.json({ sections: recommend(DEMO_USER.id, readCart(req.body?.cart)) });
});

app.post('/api/cart/price', (req, res) => {
  const lines = toOrderLines(readCart(req.body?.cart));
  res.json({
    lines,
    breakdown: priceOrder(lines, { tip: req.body?.tip, promoCode: req.body?.promoCode ?? null }),
  });
});

app.get('/api/checkout/options', (_req, res) => {
  res.json({ promos: promoCatalog, testCards: testCardGuide, deliverySlots: deliverySlots() });
});

app.post('/api/payments/intents', (req, res) => {
  const result = createIntent({
    userId: DEMO_USER.id,
    cart: readCart(req.body?.cart),
    tip: req.body?.tip,
    promoCode: req.body?.promoCode ?? null,
    deliverySlot: typeof req.body?.deliverySlot === 'string' ? req.body.deliverySlot : deliverySlots()[0],
  });
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, unavailable: result.unavailable });
    return;
  }
  res.status(201).json({ intent: result.intent });
});

app.post('/api/payments/intents/:id/confirm', async (req, res) => {
  const result = await confirmIntent(req.params.id, {
    method: req.body?.method ?? 'card',
    card: req.body?.card,
    vpa: req.body?.vpa,
  });
  respondToPaymentResult(res, result);
});

app.post('/api/payments/intents/:id/authenticate', async (req, res) => {
  const result = await authenticateIntent(req.params.id, String(req.body?.otp ?? ''));
  respondToPaymentResult(res, result);
});

app.post('/api/payments/intents/:id/cancel', (req, res) => {
  const canceled = cancelIntent(req.params.id);
  res.status(canceled ? 200 : 409).json({ canceled });
});

/** Lets the demo UI trigger a replenishment so restocking is observable on cue. */
app.post('/api/inventory/:productId/restock', (req, res) => {
  const level = inventory.get(req.params.productId);
  if (!level) {
    res.status(404).json({ error: 'Unknown product' });
    return;
  }
  const units = Math.max(1, Math.min(200, Number(req.body?.units ?? 24)));
  inventory.restock(req.params.productId, units, 'Warehouse booked in a manual replenishment');
  res.json({ stock: inventory.get(req.params.productId) });
});

/**
 * Converts a gateway outcome into an HTTP response, committing inventory and
 * writing the order exactly once, the first time an intent reaches `succeeded`.
 */
function respondToPaymentResult(
  res: express.Response,
  result: Awaited<ReturnType<typeof confirmIntent>>,
): void {
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, intent: result.intent });
    return;
  }

  const { intent, record } = result;
  if (intent.status !== 'succeeded') {
    res.json({ intent });
    return;
  }

  const existing = listOrders(record.userId).find((order) => order.payment.intentId === intent.id);
  if (existing) {
    res.json({ intent, order: existing });
    return;
  }

  const committed = record.reservationId ? inventory.commit(record.reservationId) : null;
  if (!committed && record.reservationId) {
    res.status(409).json({
      error: {
        code: 'reservation_expired',
        message: 'Your items were released before the payment completed.',
      },
      intent,
    });
    return;
  }
  record.reservationId = null;

  const order = recordOrder({
    userId: record.userId,
    cart: record.cart,
    breakdown: intent.breakdown,
    deliverySlot: record.deliverySlot,
    payment: {
      method: record.method ?? 'card',
      brand: record.card?.brand ?? null,
      last4: record.card?.last4 ?? null,
      intentId: intent.id,
    },
  });
  res.json({ intent, order });
}

app.get('/api/payments/intents/:id', (req, res) => {
  const record = getIntent(req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Unknown payment intent' });
    return;
  }
  res.json({ intent: record.intent });
});

function deliverySlots(): string[] {
  const now = new Date();
  const format = (date: Date, window: string) => {
    const day =
      date.toDateString() === now.toDateString()
        ? 'Today'
        : date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${day}, ${window}`;
  };
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return [
    format(now, 'in 45 minutes (express)'),
    format(now, '6–8pm'),
    format(tomorrow, '9–11am'),
    format(tomorrow, '5–7pm'),
  ];
}

// Serve the built client when it exists, so `npm start` runs the whole app.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const server = createServer(app);
attachRealtime(server);
startShopperSimulation();

server.listen(PORT, () => {
  console.log(`FreshCart API listening on http://localhost:${PORT}`);
});
