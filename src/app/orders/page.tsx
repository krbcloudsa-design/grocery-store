"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatINR } from "@/lib/format";

export default function OrdersPage() {
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
                href={`/orders/${order.id}`}
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
