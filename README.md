# RasoiDirect

A B2B sourcing storefront for Indian restaurants — vegetables, fruits, chicken, mutton, seafood,
dairy, masalas, staples, oils, packaging and cleaning supplies at wholesale rates, modelled on how
Hyperpure serves restaurant kitchens.

This is the first slice: a working catalogue and ordering flow backed by local data, with no
server or database yet.

## What works today

- **Homepage** with hero, live rate card, twelve category aisles, bestsellers and a "how it works"
  explainer.
- **Category pages** with sub-category filters, in-stock filter and price/discount sorting.
- **Product pages** with pack size, source, shelf life, storage, GST rate and bulk price slabs.
- **Cart** that applies bulk slab rates automatically, shows the GST break-up, enforces a
  ₹1,000 minimum order value and gives free delivery above ₹2,500.
- **Checkout** capturing outlet details (GSTIN, FSSAI), delivery address, morning delivery slot and
  payment method, with client-side validation.
- **Orders** history with an order detail view and one-tap reorder.

Cart and order history persist in `localStorage`, so nothing leaves the browser.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Other scripts:

```bash
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit  # typecheck
```

## Project layout

```
src/
  app/
    page.tsx                 landing page
    category/[slug]/         category listing with filters
    product/[id]/            product detail
    cart/                    indent review
    checkout/                outlet details, slot, payment
    orders/                  order history and detail
  components/                header, footer, product card, quantity stepper
  lib/
    catalog.ts               categories, products, search, bulk pricing
    cart.ts                  cart store (useSyncExternalStore + localStorage)
    format.ts                INR formatting, order thresholds, delivery slots
    types.ts                 shared types
```

## Next steps

- Real backend: Postgres catalogue, live pricing per city, stock levels.
- Restaurant accounts with GSTIN verification and credit limits.
- Downloadable GST invoices and credit notes.
- Order tracking with vehicle status and delivery OTP.
- Product photography in place of the current emoji tiles.
