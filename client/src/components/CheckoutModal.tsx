import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Shield,
  Smartphone,
  Timer,
  Wallet,
  X,
} from 'lucide-react';
import type { Order, PaymentError, PaymentIntent, PaymentMethodType } from '@shared/types.ts';
import { ApiError, api } from '../api.ts';
import { brandOf, formatCardNumber, formatExpiry } from '../lib/card.ts';
import { countdown, money } from '../lib/format.ts';
import { useStore } from '../store.tsx';

type Stage = 'reserving' | 'collect' | 'authenticating' | 'done' | 'conflict';

const METHODS: { id: PaymentMethodType; label: string; hint: string; icon: typeof CreditCard }[] = [
  { id: 'card', label: 'Card', hint: 'Visa, Mastercard, Amex', icon: CreditCard },
  { id: 'upi', label: 'UPI', hint: 'Pay from any UPI app', icon: Smartphone },
  { id: 'wallet', label: 'Wallet', hint: 'FreshCart balance', icon: Wallet },
  { id: 'cash', label: 'Cash', hint: 'Pay the courier', icon: Banknote },
];

export function CheckoutModal({
  open,
  onClose,
  onTrackOrder,
}: {
  open: boolean;
  onClose: () => void;
  onTrackOrder: () => void;
}) {
  const { cart, tip, promoCode, deliverySlot, testCards, onOrderPlaced, setQuantity, pushToast } = useStore();

  const [stage, setStage] = useState<Stage>('reserving');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState<PaymentMethodType>('card');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  const [vpa, setVpa] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PaymentError | null>(null);
  const [conflicts, setConflicts] = useState<{ productId: string; name: string; available: number }[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    setStage('reserving');
    setIntent(null);
    setOrder(null);
    setError(null);
    setConflicts([]);
    setOtp('');
    setBusy(false);

    let cancelled = false;
    (async () => {
      try {
        const response = await api.createIntent({ cart, tip, promoCode, deliverySlot });
        // The panel closed (or remounted) mid-request: drop the hold we just took.
        if (cancelled) {
          void api.cancelIntent(response.intent.id);
          return;
        }
        setIntent(response.intent);
        setStage('collect');
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.unavailable.length > 0) {
          setConflicts(caught.unavailable);
          setStage('conflict');
          return;
        }
        setError(
          caught instanceof ApiError && caught.paymentError
            ? caught.paymentError
            : { code: 'card_declined', message: 'We could not start this checkout. Try again.' },
        );
        setStage('collect');
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-running on cart edits would drop the active hold, so the basket is read once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  const close = useCallback(() => {
    if (intent && stage !== 'done') void api.cancelIntent(intent.id);
    onClose();
  }, [intent, onClose, stage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) close();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [busy, close, open]);

  const settle = (nextIntent: PaymentIntent, placed?: Order) => {
    setIntent(nextIntent);
    if (nextIntent.status === 'requires_action') {
      setStage('authenticating');
      setError(null);
      return;
    }
    if (nextIntent.status === 'succeeded' && placed) {
      setOrder(placed);
      setStage('done');
      void onOrderPlaced(placed);
      pushToast({
        tone: 'success',
        title: `Order ${placed.id} confirmed`,
        body: `Arriving ${placed.deliverySlot.toLowerCase()}`,
      });
    }
  };

  const pay = async () => {
    if (!intent) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.confirmIntent(intent.id, {
        method,
        card: method === 'card' ? card : undefined,
        vpa: method === 'upi' ? vpa : undefined,
      });
      settle(response.intent, response.order);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.paymentError);
        if (caught.intent) setIntent(caught.intent);
        if (caught.paymentError?.code === 'reservation_expired') setStage('conflict');
      }
    } finally {
      setBusy(false);
    }
  };

  const authenticate = async () => {
    if (!intent) return;
    setBusy(true);
    setError(null);
    try {
      const response = await api.authenticateIntent(intent.id, otp);
      settle(response.intent, response.order);
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught.paymentError);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const holdRemaining = intent ? intent.reservationExpiresAt - now : 0;
  const fieldError = (field: PaymentError['field']) =>
    error != null && error.field === field ? error.message : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-6" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close checkout"
        onClick={() => !busy && close()}
        className="absolute inset-0 bg-clay-900/50 backdrop-blur-sm"
      />

      <div className="animate-slide-up relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-clay-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-leaf-600 text-white">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {stage === 'done' ? 'Order confirmed' : 'Secure checkout'}
              </h2>
              <p className="text-[11px] text-clay-600">
                {stage === 'done'
                  ? 'Payment captured and your items are reserved for picking'
                  : 'Encrypted connection · PCI-DSS compliant gateway'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !busy && close()}
            aria-label="Close"
            className="rounded-lg p-1.5 text-clay-600 transition hover:bg-clay-100 disabled:opacity-40"
            disabled={busy}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grow overflow-y-auto md:grid-cols-[1.25fr_1fr]">
          <div className="space-y-4 p-5">
            {stage === 'reserving' && (
              <div className="grid place-items-center gap-3 py-20 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-leaf-600" />
                <p className="text-sm font-semibold">Holding your items…</p>
                <p className="max-w-72 text-xs text-clay-600">
                  We reserve every line in the warehouse before taking payment, so nothing sells out from under you.
                </p>
              </div>
            )}

            {stage === 'conflict' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      {conflicts.length > 0 ? 'Stock changed while you were shopping' : 'Your hold expired'}
                    </p>
                    <p className="text-xs text-amber-800">
                      {conflicts.length > 0
                        ? 'Live inventory moved. Update the affected lines and we will re-reserve them.'
                        : 'The items went back on the shelf. Start checkout again to hold them.'}
                    </p>
                  </div>
                </div>

                {conflicts.length > 0 && (
                  <ul className="space-y-2">
                    {conflicts.map((conflict) => (
                      <li
                        key={conflict.productId}
                        className="flex items-center justify-between rounded-xl bg-clay-50 p-3 text-sm ring-1 ring-clay-200"
                      >
                        <span className="font-medium">{conflict.name}</span>
                        <span className="text-xs font-semibold text-clay-600">
                          {conflict.available === 0 ? 'Sold out' : `${conflict.available} left`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={() => {
                    for (const conflict of conflicts) setQuantity(conflict.productId, conflict.available);
                    close();
                  }}
                  className="w-full rounded-xl bg-clay-900 py-3 text-sm font-bold text-white"
                >
                  Update basket and go back
                </button>
              </div>
            )}

            {stage === 'collect' && intent && (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void pay();
                }}
              >
                <div className="flex items-center justify-between rounded-2xl bg-leaf-50 px-4 py-2.5 ring-1 ring-leaf-200">
                  <p className="flex items-center gap-2 text-xs font-semibold text-leaf-900">
                    <Timer className="h-4 w-4" /> Items held for you
                  </p>
                  <p className="tabular-nums text-sm font-bold text-leaf-800">{countdown(holdRemaining)}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-clay-600">Payment method</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {METHODS.map((option) => {
                      const Icon = option.icon;
                      const active = method === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setMethod(option.id);
                            setError(null);
                          }}
                          className={`rounded-2xl border p-2.5 text-left transition ${
                            active
                              ? 'border-leaf-500 bg-leaf-50 ring-2 ring-leaf-200'
                              : 'border-clay-200 hover:border-clay-300 hover:bg-clay-50'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${active ? 'text-leaf-700' : 'text-clay-600'}`} />
                          <p className="mt-1 text-xs font-bold">{option.label}</p>
                          <p className="text-[10px] leading-tight text-clay-600">{option.hint}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && !error.field && (
                  <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {error.message}
                  </p>
                )}

                {method === 'card' && (
                  <div className="space-y-3">
                    <Field label="Card number" htmlFor="cc-number" error={fieldError('number')}>
                      <div className="relative">
                        <input
                          id="cc-number"
                          name="cardnumber"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          value={card.number}
                          onChange={(event) =>
                            setCard((current) => ({ ...current, number: formatCardNumber(event.target.value) }))
                          }
                          placeholder="4242 4242 4242 4242"
                          className={inputClass(fieldError('number'))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-clay-600">
                          {brandOf(card.number)}
                        </span>
                      </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Expiry" htmlFor="cc-exp" error={fieldError('expiry')}>
                        <input
                          id="cc-exp"
                          name="cc-exp"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          value={card.expiry}
                          onChange={(event) =>
                            setCard((current) => ({ ...current, expiry: formatExpiry(event.target.value) }))
                          }
                          placeholder="MM/YY"
                          className={inputClass(fieldError('expiry'))}
                        />
                      </Field>
                      <Field label="Security code" htmlFor="cc-csc" error={fieldError('cvc')}>
                        <input
                          id="cc-csc"
                          name="cvc"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          value={card.cvc}
                          onChange={(event) =>
                            setCard((current) => ({
                              ...current,
                              cvc: event.target.value.replace(/\D/g, '').slice(0, 4),
                            }))
                          }
                          placeholder="123"
                          className={inputClass(fieldError('cvc'))}
                        />
                      </Field>
                    </div>

                    <Field label="Name on card" htmlFor="cc-name" error={fieldError('name')}>
                      <input
                        id="cc-name"
                        name="ccname"
                        autoComplete="cc-name"
                        value={card.name}
                        onChange={(event) => setCard((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Aanya Sharma"
                        className={inputClass(fieldError('name'))}
                      />
                    </Field>

                    <details className="rounded-xl bg-clay-50 p-3 ring-1 ring-clay-200">
                      <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-clay-600">
                        Sandbox test cards
                      </summary>
                      <ul className="mt-2 space-y-1.5">
                        {testCards.map((testCard) => (
                          <li key={testCard.number} className="flex items-center justify-between gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() =>
                                setCard({
                                  number: formatCardNumber(testCard.number),
                                  expiry: '12/29',
                                  cvc: '123',
                                  name: 'Aanya Sharma',
                                })
                              }
                              className="rounded-md bg-white px-2 py-1 font-mono font-semibold ring-1 ring-clay-200 transition hover:bg-leaf-50"
                            >
                              {testCard.number}
                            </button>
                            <span className="text-right text-clay-600">{testCard.behaviour}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}

                {method === 'upi' && (
                  <Field label="UPI ID" htmlFor="upi-vpa" error={fieldError('vpa')}>
                    <input
                      id="upi-vpa"
                      name="vpa"
                      autoComplete="off"
                      value={vpa}
                      onChange={(event) => setVpa(event.target.value)}
                      placeholder="aanya@okbank"
                      className={inputClass(fieldError('vpa'))}
                    />
                    <p className="mt-1 text-[11px] text-clay-600">
                      Sandbox: any <span className="font-mono">name@bank</span> succeeds,{' '}
                      <span className="font-mono">fail@bank</span> is rejected.
                    </p>
                  </Field>
                )}

                {method === 'wallet' && (
                  <div className="rounded-2xl bg-clay-50 p-4 ring-1 ring-clay-200">
                    <p className="text-sm font-semibold">FreshCart wallet</p>
                    <p className="text-xs text-clay-600">
                      Balance {money(6400)} — enough to cover this order. No further authentication needed.
                    </p>
                  </div>
                )}

                {method === 'cash' && (
                  <div className="rounded-2xl bg-clay-50 p-4 ring-1 ring-clay-200">
                    <p className="text-sm font-semibold">Cash on delivery</p>
                    <p className="text-xs text-clay-600">
                      Please have {money(intent.breakdown.total)} ready. The courier carries change up to {money(2000)}.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy || holdRemaining <= 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-leaf-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Contacting your bank…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> Pay {money(intent.breakdown.total)}
                    </>
                  )}
                </button>

                <p className="flex items-center justify-center gap-1.5 text-[11px] text-clay-600">
                  <Shield className="h-3.5 w-3.5" /> Simulated gateway — no real card is ever charged
                </p>
              </form>
            )}

            {stage === 'authenticating' && intent && (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void authenticate();
                }}
              >
                <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
                  <p className="flex items-center gap-2 text-sm font-bold text-sky-900">
                    <Shield className="h-4 w-4" /> Your bank needs to check it is you
                  </p>
                  <p className="mt-1 text-xs text-sky-800">
                    We sent a one-time code by {intent.nextAction?.deliveryTarget ?? 'SMS'}. Use{' '}
                    <span className="font-mono font-bold">123456</span> in this sandbox.
                  </p>
                </div>

                <Field label="One-time code" htmlFor="otp" error={fieldError('otp')}>
                  <input
                    id="otp"
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className={`${inputClass(fieldError('otp'))} text-center font-mono text-lg tracking-[0.4em]`}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={busy || otp.length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-leaf-600 py-3 text-sm font-bold text-white transition hover:bg-leaf-700 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                  {busy ? 'Verifying…' : 'Verify and pay'}
                </button>
              </form>
            )}

            {stage === 'done' && order && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-leaf-50 p-4 ring-1 ring-leaf-200">
                  <CheckCircle2 className="h-9 w-9 text-leaf-600" />
                  <div>
                    <p className="text-sm font-bold text-leaf-900">Payment captured · {order.id}</p>
                    <p className="text-xs text-leaf-800">
                      Arriving {order.deliverySlot.toLowerCase()} to your saved address.
                    </p>
                  </div>
                </div>

                <dl className="space-y-2 rounded-2xl bg-clay-50 p-4 text-xs ring-1 ring-clay-200">
                  <SummaryRow label="Paid with">
                    {order.payment.method === 'card'
                      ? `${order.payment.brand} •••• ${order.payment.last4}`
                      : order.payment.method === 'upi'
                        ? 'UPI'
                        : order.payment.method === 'wallet'
                          ? 'FreshCart wallet'
                          : 'Cash on delivery'}
                  </SummaryRow>
                  <SummaryRow label="Amount">{money(order.breakdown.total)}</SummaryRow>
                  <SummaryRow label="Items">{order.lines.length} lines · stock deducted</SummaryRow>
                  <SummaryRow label="Receipt">
                    <span className="font-mono">{order.payment.receiptUrl}</span>
                  </SummaryRow>
                </dl>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTrackOrder();
                    }}
                    className="grow rounded-xl bg-leaf-600 py-3 text-sm font-bold text-white transition hover:bg-leaf-700"
                  >
                    Track this order
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-clay-100 px-4 py-3 text-sm font-bold text-clay-700 transition hover:bg-clay-200"
                  >
                    Keep shopping
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="border-t border-clay-200 bg-clay-50 p-5 md:border-l md:border-t-0">
            <h3 className="text-xs font-bold uppercase tracking-wide text-clay-600">Order summary</h3>
            <ul className="mt-3 space-y-2.5">
              {(order?.lines ?? intent?.lines ?? []).map((line) => (
                <li key={line.productId} className="flex items-start gap-2.5 text-xs">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-base ring-1 ring-clay-200">
                    {line.emoji}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="truncate font-semibold text-clay-900">{line.name}</p>
                    <p className="text-clay-600">
                      {line.quantity} × {line.unit}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{money(line.lineTotal)}</span>
                </li>
              ))}
            </ul>

            {(order?.breakdown ?? intent?.breakdown) && (
              <div className="mt-4 space-y-1.5 border-t border-clay-200 pt-3 text-xs">
                {(() => {
                  const total = order?.breakdown ?? intent!.breakdown;
                  return (
                    <>
                      <SummaryRow label="Subtotal">{money(total.subtotal)}</SummaryRow>
                      {total.discount > 0 && (
                        <SummaryRow label={`Discount ${total.discountCode ?? ''}`}>
                          <span className="text-leaf-700">−{money(total.discount)}</span>
                        </SummaryRow>
                      )}
                      <SummaryRow label="Delivery">
                        {total.deliveryFee === 0 ? (
                          <span className="text-leaf-700">Free</span>
                        ) : (
                          money(total.deliveryFee)
                        )}
                      </SummaryRow>
                      <SummaryRow label="Service fee">{money(total.serviceFee)}</SummaryRow>
                      <SummaryRow label="Tax">{money(total.tax)}</SummaryRow>
                      <SummaryRow label="Tip">{money(total.tip)}</SummaryRow>
                      <div className="flex items-center justify-between border-t border-clay-200 pt-2 text-sm font-bold">
                        <span>Total</span>
                        <span className="tabular-nums">{money(total.total)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="mt-4 rounded-xl bg-white p-3 text-[11px] leading-relaxed text-clay-600 ring-1 ring-clay-200">
              <p className="font-semibold text-clay-900">Delivering {deliverySlot.toLowerCase()}</p>
              <p className="mt-1">
                Inventory is decremented only when the charge succeeds. If payment fails, the hold is released and the
                items go straight back on sale.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function inputClass(error: string | null): string {
  return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-clay-300 ${
    error
      ? 'border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
      : 'border-clay-200 focus:border-leaf-400 focus:ring-2 focus:ring-leaf-100'
  }`;
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-clay-600">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-clay-600">{label}</dt>
      <dd className="font-semibold tabular-nums text-clay-900">{children}</dd>
    </div>
  );
}
