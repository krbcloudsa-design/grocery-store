# FreshCart

A sample online grocery delivery storefront: a full catalogue with live prices, an integrated
payment gateway, real-time inventory that flips products to **out of stock** the moment the last
unit goes, and product suggestions built from the shopper's own purchase history.

The point of the demo is that none of those four things are faked in the UI layer. Availability,
pricing, holds, charges and recommendations are all computed by the bundled API, and the storefront
only renders what the server says.

## Running it

```bash
npm install
npm run dev
```

- Storefront: <http://localhost:5173>
- API: <http://localhost:4000>

`npm run dev` starts the API and the Vite dev server together. Vite proxies `/api` and the `/ws`
inventory socket to the API, so only the storefront port needs to be open.

Other scripts:

| Command            | What it does                                                    |
| ------------------ | --------------------------------------------------------------- |
| `npm run dev:api`  | API and inventory socket only                                   |
| `npm run dev:web`  | Storefront only                                                 |
| `npm run typecheck`| Typechecks both workspaces                                      |
| `npm run build`    | Production build of the storefront into `client/dist`            |
| `npm start`        | Serves the API and, if built, `client/dist` on a single port     |

## What to try

1. **Watch stock move.** Open the *Live inventory* panel at the bottom right. Simulated shoppers buy
   items every few seconds; the affected card flashes, the badge counts down, and at zero the card
   turns to *Sold out* with an ETA for the next replenishment. Open the site in two tabs to see both
   update at once.
2. **Get clamped by real stock.** Add the last few units of a low-stock item and leave it in the
   basket. When another shopper takes them, the basket quantity is reduced and a toast explains why.
3. **Pay.** Checkout holds every line before asking for money. Use the sandbox cards in the
   payment form: `4242 4242 4242 4242` succeeds, `4000 0000 0000 3220` triggers a 3-D Secure step-up
   (code `123456`), `4000 0000 0000 0002` is declined and `4000 0000 0000 9995` has insufficient
   funds. UPI, wallet and cash on delivery are also wired up.
4. **See personalisation change.** The rails at the top are driven by the demo account's order
   history. Place an order, and *Buy it again*, *Time to restock* and *Picked for you* re-rank on the
   next load. Add pasta to the basket and *Goes with your basket* fills with what other shoppers pair
   with it.
5. **Restock on demand.** The live inventory panel lists everything that is sold out with a
   **Restock** button, so you do not have to wait for the scheduled delivery.

## How it works

### Real-time inventory

`server/src/inventory.ts` is the authoritative ledger. Each product tracks `onHand` (units in the
warehouse) and `reserved` (units held by in-flight checkouts); `available = onHand - reserved` is
what a shopper may add to a basket, and the status thresholds turn that into `in_stock`,
`low_stock` or `out_of_stock`.

Every mutation emits a change event. `server/src/realtime.ts` fans those events out to all connected
browsers over a WebSocket, so the client never polls: it applies a snapshot on connect and patches
individual products after that. Selling out schedules a replenishment delivery, which is why
out-of-stock cards can show "back in ~2 min".

`server/src/simulator.ts` plays the rest of the customer base, weighted towards items that are
already scarce so that sell-outs actually happen while you watch.

### Payments

`server/src/payments.ts` is a simulated PSP with the same shape as a real one, so the storefront has
to handle everything it would in production:

- an intent whose status advances server-side (`requires_payment_method` → `processing` →
  `requires_action` → `succeeded` / `failed`),
- Luhn, expiry and CVC validation with typed error codes mapped back onto individual form fields,
- step-up authentication for 3-D Secure cards, with a limited number of OTP attempts,
- an inventory hold taken when the intent is created and committed **only** when the charge
  succeeds. Failure or abandonment releases the hold and the units go straight back on sale, and the
  hold expires on its own after ten minutes.

Swapping in a live gateway means reimplementing `createIntent`, `confirmIntent` and
`authenticateIntent` against the provider's SDK. The HTTP surface and the client flow do not change.

### Recommendations

`server/src/recommendations.ts` produces four kinds of suggestion, each carrying the reason string
that the UI shows on the card, because a recommendation nobody can explain is hard to trust:

| Section               | Signal                                                                        |
| --------------------- | ----------------------------------------------------------------------------- |
| Time to restock       | Per-product reorder cadence versus when the shopper last bought it            |
| Buy it again          | Frequency across the shopper's own orders                                     |
| Picked for you        | Item-to-item collaborative filtering over the community's baskets, weighted by recency, plus an aisle-affinity boost |
| Goes with your basket | Co-purchase similarity against what is in the basket right now                |

Similarity is co-occurrence normalised by each item's own popularity (cosine over basket-membership
vectors), which stops staples like milk from being recommended alongside everything. The community
baskets in `server/src/data/history.ts` are generated from shopper archetypes with a seeded PRNG, so
the model is deterministic between restarts, and real orders placed during the session are folded
into it immediately.

## Layout

```
shared/types.ts          Domain types shared by API and client
server/src/
  index.ts               HTTP routes
  inventory.ts           Stock ledger, reservations, replenishment
  payments.ts            Simulated payment gateway
  pricing.ts             Fees, tax, promo codes, free-delivery threshold
  recommendations.ts     Collaborative filtering and reorder timing
  realtime.ts            WebSocket fan-out
  simulator.ts           Concurrent-shopper simulation
  orders.ts              Order store and delivery status
  data/                  Catalogue and seeded purchase history
client/src/
  store.tsx              Catalogue, live stock socket, basket, pricing, toasts
  api.ts                 Typed API client
  components/            Header, product cards, basket, checkout, orders, live panel
```

State lives in memory, so restarting the API resets stock and orders to the seed data. That is
deliberate for a demo; a real deployment would put the ledger in a database with row-level locking
on the reservation path.
