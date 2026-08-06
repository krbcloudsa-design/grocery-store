import { useState } from 'react';
import { BadgePercent, Minus, Plus, ShoppingBasket, Tag, Trash2, Truck } from 'lucide-react';
import { money } from '../lib/format.ts';
import { tileStyle } from '../lib/theme.ts';
import { useStore } from '../store.tsx';
import { Drawer } from './Drawer.tsx';

const TIPS = [0, 200, 350, 500];

export function CartDrawer({
  open,
  onClose,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const {
    cart,
    cartCount,
    productById,
    stock,
    setQuantity,
    clearCart,
    breakdown,
    tip,
    setTip,
    promoCode,
    applyPromo,
    removePromo,
    promoRejected,
    promos,
    deliverySlot,
    setDeliverySlot,
    deliverySlots,
    recommendations,
    addToCart,
  } = useStore();

  const [promoInput, setPromoInput] = useState('');
  const pairings = recommendations.find((section) => section.kind === 'pairs_with_cart');
  const progress = Math.min(100, Math.round((breakdown.subtotal / 3500) * 100));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Your basket"
      subtitle={cartCount === 0 ? 'Nothing here yet' : `${cartCount} item${cartCount === 1 ? '' : 's'} · ${deliverySlot}`}
      footer={
        cart.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-1 text-sm">
              <Row label="Subtotal" value={money(breakdown.subtotal)} />
              {breakdown.discount > 0 && (
                <Row
                  label={`Discount (${breakdown.discountCode})`}
                  value={`−${money(breakdown.discount)}`}
                  tone="discount"
                />
              )}
              <Row
                label="Delivery"
                value={breakdown.deliveryFee === 0 ? 'Free' : money(breakdown.deliveryFee)}
                tone={breakdown.deliveryFee === 0 ? 'discount' : undefined}
              />
              <Row label="Service fee" value={money(breakdown.serviceFee)} />
              <Row label="Estimated tax" value={money(breakdown.tax)} />
              <Row label="Courier tip" value={money(breakdown.tip)} />
              <div className="flex items-center justify-between border-t border-clay-200 pt-2 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums">{money(breakdown.total)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="w-full rounded-xl bg-leaf-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-leaf-700 active:scale-[0.99]"
            >
              Checkout · {money(breakdown.total)}
            </button>
          </div>
        ) : null
      }
    >
      {cart.length === 0 ? (
        <div className="grid place-items-center gap-3 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-leaf-100 text-3xl">🧺</span>
          <p className="text-sm font-semibold text-clay-900">Your basket is empty</p>
          <p className="max-w-64 text-xs text-clay-600">
            Add something from the shelves — we hold stock for you the moment you start checkout.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-leaf-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Browse the aisles
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-clay-200">
            <p className="flex items-center gap-2 text-xs font-medium text-clay-700">
              <Truck className="h-4 w-4 text-leaf-600" />
              {breakdown.freeDeliveryRemaining === 0
                ? 'Free delivery unlocked'
                : `${money(breakdown.freeDeliveryRemaining)} away from free delivery`}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-clay-100">
              <div
                className="h-full rounded-full bg-leaf-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ul className="space-y-2">
            {cart.map((line) => {
              const product = productById.get(line.productId);
              const level = stock.get(line.productId);
              if (!product) return null;
              const remaining = level?.available ?? 0;
              return (
                <li key={line.productId} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-clay-200">
                  <span
                    className="tile-gradient grid h-14 w-14 shrink-0 place-items-center rounded-xl text-2xl"
                    style={tileStyle(product.category)}
                  >
                    {product.emoji}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="truncate text-sm font-semibold text-clay-900">{product.name}</p>
                    <p className="text-[11px] text-clay-600">
                      {product.unit} · {money(product.price)} each
                    </p>
                    {level?.status === 'low_stock' && (
                      <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
                        Only {remaining} left in the warehouse
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-xl bg-clay-100 p-1">
                        <button
                          type="button"
                          aria-label={`Remove one ${product.name}`}
                          onClick={() => setQuantity(line.productId, line.quantity - 1)}
                          className="rounded-lg p-1 text-clay-700 transition hover:bg-white"
                        >
                          {line.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </button>
                        <span className="min-w-5 text-center text-xs font-bold tabular-nums">{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Add one ${product.name}`}
                          disabled={line.quantity >= remaining}
                          onClick={() => setQuantity(line.productId, line.quantity + 1)}
                          className="rounded-lg p-1 text-clay-700 transition hover:bg-white disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold tabular-nums">
                        {money(product.price * line.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-semibold text-clay-600 underline decoration-dotted hover:text-berry-500"
          >
            Empty basket
          </button>

          {pairings && pairings.items.length > 0 && (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-clay-600">
                <BadgePercent className="h-3.5 w-3.5" /> Often added with these
              </h3>
              <ul className="space-y-2">
                {pairings.items.slice(0, 3).map((item) => {
                  const product = productById.get(item.productId);
                  if (!product) return null;
                  return (
                    <li
                      key={item.productId}
                      className="flex items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-clay-200"
                    >
                      <span
                        className="tile-gradient grid h-10 w-10 place-items-center rounded-lg text-xl"
                        style={tileStyle(product.category)}
                      >
                        {product.emoji}
                      </span>
                      <div className="min-w-0 grow">
                        <p className="truncate text-xs font-semibold">{product.name}</p>
                        <p className="truncate text-[11px] text-clay-600">{item.reason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(product.id)}
                        className="shrink-0 rounded-lg bg-leaf-100 px-2.5 py-1.5 text-[11px] font-bold text-leaf-800 transition hover:bg-leaf-200"
                      >
                        {money(product.price)} · Add
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-clay-200">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-clay-600">
              <Tag className="h-3.5 w-3.5" /> Promo code
            </h3>
            {promoCode ? (
              <div className="flex items-center justify-between rounded-xl bg-leaf-50 px-3 py-2">
                <p className="text-xs font-bold text-leaf-800">{promoCode} applied</p>
                <button
                  type="button"
                  onClick={removePromo}
                  className="text-[11px] font-semibold text-clay-600 underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    id="promo-code"
                    name="promo-code"
                    aria-label="Promo code"
                    value={promoInput}
                    onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="grow rounded-xl border border-clay-200 bg-clay-50 px-3 py-2 text-xs uppercase outline-none focus:border-leaf-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => applyPromo(promoInput)}
                    className="rounded-xl bg-clay-900 px-3 py-2 text-xs font-bold text-white"
                  >
                    Apply
                  </button>
                </div>
                {promoRejected && (
                  <p className="text-[11px] font-medium text-berry-500">
                    {promoRejected} does not apply to this basket yet.
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {promos.map((promo) => (
                    <button
                      key={promo.code}
                      type="button"
                      onClick={() => applyPromo(promo.code)}
                      title={promo.label}
                      className="rounded-lg bg-clay-100 px-2 py-1 text-[10px] font-bold text-clay-700 transition hover:bg-leaf-100 hover:text-leaf-800"
                    >
                      {promo.code}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-clay-200">
            <label htmlFor="delivery-slot" className="block text-xs font-bold uppercase tracking-wide text-clay-600">
              Delivery slot
            </label>
            <select
              id="delivery-slot"
              name="delivery-slot"
              value={deliverySlot}
              onChange={(event) => setDeliverySlot(event.target.value)}
              className="w-full rounded-xl border border-clay-200 bg-clay-50 px-3 py-2 text-xs font-medium outline-none focus:border-leaf-400 focus:bg-white"
            >
              {deliverySlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>

            <h3 className="pt-1 text-xs font-bold uppercase tracking-wide text-clay-600">Tip your courier</h3>
            <div className="flex gap-1.5">
              {TIPS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setTip(amount)}
                  className={`grow rounded-xl px-2 py-2 text-xs font-bold transition ${
                    tip === amount
                      ? 'bg-leaf-600 text-white shadow-sm'
                      : 'bg-clay-100 text-clay-700 hover:bg-clay-200'
                  }`}
                >
                  {amount === 0 ? 'None' : money(amount)}
                </button>
              ))}
            </div>
          </section>

          <p className="flex items-start gap-2 rounded-2xl bg-clay-100 p-3 text-[11px] leading-relaxed text-clay-700">
            <ShoppingBasket className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Stock is only held once you start checkout. Until then another shopper can take the last one — the
            basket updates itself if that happens.
          </p>
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'discount' }) {
  return (
    <div className="flex items-center justify-between text-clay-700">
      <span>{label}</span>
      <span className={`tabular-nums ${tone === 'discount' ? 'font-semibold text-leaf-700' : ''}`}>{value}</span>
    </div>
  );
}
