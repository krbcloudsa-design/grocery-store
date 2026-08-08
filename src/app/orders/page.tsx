"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";

function OrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { orders, ready, setQty } = useCart();
  const order = orders.find((entry) => entry.id === orderId);

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-ink-500">Loading…</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Order not found</h1>
        <Link href="/orders" className="mt-4 inline-block text-brand-700 hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  const reorder = () => {
    order.items.forEach((item) => setQty(item.productId, item.qty));
    router.push("/cart");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
        <div className="flex items-start gap-4">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 text-2xl text-white"
            aria-hidden
          >
            ✓
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-ink-900">Order confirmed</h1>
            <p className="mt-1 text-sm text-ink-700">
              Indent <span className="font-semibold">#{order.id}</span> is booked for{" "}
              <span className="font-semibold">{order.slot}</span>. We&apos;ll send a WhatsApp update
              when the vehicle leaves our hub.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Delivery slot", order.slot],
          ["Payment", order.paymentMethod],
          ["Status", order.status],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-ink-100 p-4">
            <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
          </div>
        ))}
      </div>
      {order.paymentId && (
        <p className="mt-3 text-xs text-ink-500">Razorpay payment ref: {order.paymentId}</p>
      )}

      <section className="mt-6 rounded-2xl border border-ink-100">
        <h2 className="border-b border-ink-100 px-5 py-4 text-sm font-bold uppercase tracking-wide text-ink-500">
          Items
        </h2>
        <ul className="divide-y divide-ink-100">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-center gap-4 px-5 py-3">
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-ink-100 bg-white">
                <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.productId}`}
                  className="text-sm font-semibold text-ink-900 hover:text-brand-700"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-ink-500">
                  {item.qty} {item.unit} × {formatINR(item.unitPrice)}
                </p>
              </div>
              <span className="text-sm font-bold text-ink-900">{formatINR(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-ink-100 px-5 py-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-600">Item total</dt>
            <dd className="font-medium text-ink-900">{formatINR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">GST</dt>
            <dd className="font-medium text-ink-900">{formatINR(order.gst)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">Delivery</dt>
            <dd className="font-medium text-ink-900">
              {order.deliveryFee === 0 ? (
                <span className="text-brand-700">FREE</span>
              ) : (
                formatINR(order.deliveryFee)
              )}
            </dd>
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-2 text-base">
            <dt className="font-bold text-ink-900">Total paid</dt>
            <dd className="font-extrabold text-ink-900">{formatINR(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-2xl border border-ink-100 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Delivering to</h2>
        <p className="mt-3 text-sm font-semibold text-ink-900">{order.outlet.businessName}</p>
        <p className="text-sm text-ink-600">
          {order.outlet.address}, {order.outlet.city} {order.outlet.pincode}
        </p>
        <p className="mt-1 text-sm text-ink-600">
          {order.outlet.contactName} · {order.outlet.phone}
        </p>
        {order.outlet.gstin && (
          <p className="mt-1 text-xs text-ink-500">GSTIN {order.outlet.gstin}</p>
        )}
        {order.outlet.fssai && (
          <p className="text-xs text-ink-500">FSSAI {order.outlet.fssai}</p>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={reorder}
          className="cursor-pointer rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Reorder this indent
        </button>
        <Link
          href="/orders"
          className="rounded-lg border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-brand-300"
        >
          All orders
        </Link>
      </div>
    </div>
  );
}

function OrdersList() {
  const { orders, ready } = useCart();

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-ink-500">Loading orders…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Your orders</h1>
      <p className="mt-1 text-sm text-ink-600">
        Every indent you have placed, with its GST invoice and delivery slot.
      </p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-ink-100 bg-ink-50/60 p-10 text-center">
          <span className="text-4xl" aria-hidden>
            🧾
          </span>
          <p className="mt-3 text-sm text-ink-600">No orders yet.</p>
          <Link
            href="/category/vegetables"
            className="mt-5 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Place your first indent
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders?id=${order.id}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-100 p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="flex -space-x-2">
                  {order.items.slice(0, 4).map((item) => (
                    <span
                      key={item.productId}
                      className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-ink-50"
                    >
                      <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-900">#{order.id}</p>
                  <p className="text-xs text-ink-500">
                    {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                    {new Date(order.placedAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">Slot: {order.slot}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                    {order.status}
                  </span>
                  <p className="mt-1 text-sm font-extrabold text-ink-900">{formatINR(order.total)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrdersContent() {
  const params = useSearchParams();
  const orderId = params.get("id");

  if (orderId) {
    return <OrderDetail orderId={orderId} />;
  }

  return <OrdersList />;
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20 text-center text-ink-500">Loading…</div>}>
      <OrdersContent />
    </Suspense>
  );
}
