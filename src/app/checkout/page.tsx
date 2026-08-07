"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { effectivePrice, productById } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { MIN_ORDER_VALUE, deliverySlots, formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";

const paymentMethods = [
  { id: "credit", label: "Pay on credit (7 days)", note: "Approved outlets only" },
  { id: "upi", label: "UPI / Netbanking", note: "Instant confirmation" },
  { id: "cod", label: "Pay on delivery", note: "Cash or card at the gate" },
];

const emptyOutlet = {
  businessName: "",
  contactName: "",
  phone: "",
  gstin: "",
  fssai: "",
  address: "",
  city: "Bengaluru",
  pincode: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, ready, subtotal, gst, deliveryFee, total, placeOrder } = useCart();
  const slots = useMemo(() => deliverySlots(), []);

  const [outlet, setOutlet] = useState(emptyOutlet);
  const [slot, setSlot] = useState(slots[0].id);
  const [payment, setPayment] = useState(paymentMethods[0].id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const field = (key: keyof typeof emptyOutlet) => ({
    value: outlet[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setOutlet((current) => ({ ...current, [key]: event.target.value })),
  });

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-ink-500">Loading…</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Nothing to check out</h1>
        <p className="mt-2 text-ink-600">Your indent is empty.</p>
        <Link
          href="/category/vegetables"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Browse catalogue
        </Link>
      </div>
    );
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!outlet.businessName.trim()) next.businessName = "Restaurant name is required";
    if (!outlet.contactName.trim()) next.contactName = "Contact person is required";
    if (!/^[6-9]\d{9}$/.test(outlet.phone.trim())) next.phone = "Enter a valid 10-digit mobile number";
    if (!outlet.address.trim()) next.address = "Delivery address is required";
    if (!/^\d{6}$/.test(outlet.pincode.trim())) next.pincode = "Enter a valid 6-digit pincode";
    if (outlet.gstin.trim() && !/^[0-9A-Z]{15}$/.test(outlet.gstin.trim().toUpperCase()))
      next.gstin = "GSTIN must be 15 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const items = lines.flatMap((line) => {
      const product = productById(line.productId);
      if (!product) return [];
      const unitPrice = effectivePrice(product, line.qty);
      return [
        {
          productId: product.id,
          name: product.name,
          emoji: product.emoji,
          qty: line.qty,
          unit: product.unit,
          unitPrice,
          lineTotal: unitPrice * line.qty,
        },
      ];
    });

    const order: Order = {
      id: `RD${Date.now().toString().slice(-8)}`,
      placedAt: new Date().toISOString(),
      items,
      subtotal,
      gst,
      deliveryFee,
      total,
      slot: slots.find((entry) => entry.id === slot)?.label ?? slots[0].label,
      paymentMethod: paymentMethods.find((entry) => entry.id === payment)?.label ?? "",
      outlet: { ...outlet, gstin: outlet.gstin.toUpperCase() },
      status: "Confirmed",
    };

    placeOrder(order);
    router.push(`/orders/${order.id}`);
  }

  const inputClass =
    "mt-1 h-11 w-full rounded-lg border px-3 text-sm outline-none transition focus:ring-2";

  const fieldClass = (key: string, extra = "") =>
    `${inputClass} ${extra} ${
      errors[key]
        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
        : "border-ink-200 focus:border-brand-500 focus:ring-brand-100"
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Checkout</h1>
      <p className="mt-1 text-sm text-ink-600">
        Minimum order value {formatINR(MIN_ORDER_VALUE)}. GST invoice is issued against the GSTIN
        below.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-ink-100 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
              Outlet details
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-ink-600">Restaurant / outlet name *</span>
                <input
                  {...field("businessName")}
                  aria-invalid={Boolean(errors.businessName)}
                  className={fieldClass("businessName")}
                  placeholder="Anand Bhavan, Indiranagar"
                />
                {errors.businessName && (
                  <span className="mt-1 block text-xs text-red-600">{errors.businessName}</span>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-600">Contact person *</span>
                <input
                  {...field("contactName")}
                  aria-invalid={Boolean(errors.contactName)}
                  className={fieldClass("contactName")}
                  placeholder="Chef / purchase manager"
                />
                {errors.contactName && (
                  <span className="mt-1 block text-xs text-red-600">{errors.contactName}</span>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-600">Mobile number *</span>
                <input
                  {...field("phone")}
                  inputMode="numeric"
                  maxLength={10}
                  aria-invalid={Boolean(errors.phone)}
                  className={fieldClass("phone")}
                  placeholder="9876543210"
                />
                {errors.phone && <span className="mt-1 block text-xs text-red-600">{errors.phone}</span>}
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-600">GSTIN (for input credit)</span>
                <input
                  {...field("gstin")}
                  maxLength={15}
                  aria-invalid={Boolean(errors.gstin)}
                  className={fieldClass("gstin", "uppercase")}
                  placeholder="29ABCDE1234F1Z5"
                />
                {errors.gstin && <span className="mt-1 block text-xs text-red-600">{errors.gstin}</span>}
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-ink-600">FSSAI licence number</span>
                <input
                  {...field("fssai")}
                  maxLength={14}
                  className={fieldClass("fssai")}
                  placeholder="10012345678901"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-ink-100 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
              Delivery address
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-ink-600">Street address *</span>
                <input
                  {...field("address")}
                  aria-invalid={Boolean(errors.address)}
                  className={fieldClass("address")}
                  placeholder="No 12, 100ft Road, HAL 2nd Stage"
                />
                {errors.address && <span className="mt-1 block text-xs text-red-600">{errors.address}</span>}
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-600">City *</span>
                <input {...field("city")} className={fieldClass("city")} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-600">Pincode *</span>
                <input
                  {...field("pincode")}
                  inputMode="numeric"
                  maxLength={6}
                  aria-invalid={Boolean(errors.pincode)}
                  className={fieldClass("pincode")}
                  placeholder="560038"
                />
                {errors.pincode && <span className="mt-1 block text-xs text-red-600">{errors.pincode}</span>}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-ink-100 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
              Delivery slot
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {slots.map((entry) => (
                <label
                  key={entry.id}
                  className={`cursor-pointer rounded-xl border p-3 transition ${
                    slot === entry.id ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-brand-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={entry.id}
                    checked={slot === entry.id}
                    onChange={() => setSlot(entry.id)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold text-ink-900">{entry.label}</span>
                  <span className="block text-xs text-ink-500">{entry.note}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-ink-100 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Payment</h2>
            <div className="mt-4 space-y-2">
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    payment === method.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-ink-200 hover:border-brand-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={payment === method.id}
                    onChange={() => setPayment(method.id)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="flex-1 text-sm font-semibold text-ink-900">{method.label}</span>
                  <span className="text-xs text-ink-500">{method.note}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-ink-100 p-5 lg:sticky lg:top-40">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Order summary</h2>
          <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {lines.map((line) => {
              const product = productById(line.productId);
              if (!product) return null;
              const unitPrice = effectivePrice(product, line.qty);
              return (
                <li key={line.productId} className="flex items-center gap-3 text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50" aria-hidden>
                    {product.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink-900">{product.name}</span>
                    <span className="block text-xs text-ink-500">
                      {line.qty} {product.unit}
                    </span>
                  </span>
                  <span className="font-semibold text-ink-900">
                    {formatINR(unitPrice * line.qty)}
                  </span>
                </li>
              );
            })}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-600">Item total</dt>
              <dd className="font-medium text-ink-900">{formatINR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">GST</dt>
              <dd className="font-medium text-ink-900">{formatINR(gst)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">Delivery</dt>
              <dd className="font-medium text-ink-900">
                {deliveryFee === 0 ? <span className="text-brand-700">FREE</span> : formatINR(deliveryFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
              <dt className="font-bold text-ink-900">To pay</dt>
              <dd className="font-extrabold text-ink-900">{formatINR(total)}</dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full cursor-pointer rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-200"
          >
            {submitting ? "Placing order…" : `Place order · ${formatINR(total)}`}
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-400">
            Demo checkout — no real payment is collected.
          </p>
        </aside>
      </form>
    </div>
  );
}
