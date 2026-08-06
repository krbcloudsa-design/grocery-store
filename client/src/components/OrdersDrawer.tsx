import { useEffect } from 'react';
import { Bike, CheckCheck, PackageCheck, RotateCcw, ShoppingBag } from 'lucide-react';
import type { Order, OrderStatus } from '@shared/types.ts';
import { money, relativeDate } from '../lib/format.ts';
import { useStore } from '../store.tsx';
import { Drawer } from './Drawer.tsx';

const STEPS: { id: OrderStatus; label: string; icon: typeof PackageCheck }[] = [
  { id: 'confirmed', label: 'Confirmed', icon: CheckCheck },
  { id: 'packing', label: 'Packing', icon: ShoppingBag },
  { id: 'out_for_delivery', label: 'On the way', icon: Bike },
  { id: 'delivered', label: 'Delivered', icon: PackageCheck },
];

export function OrdersDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { orders, refreshOrders, reorder, profile } = useStore();

  useEffect(() => {
    if (!open) return;
    refreshOrders();
    const timer = window.setInterval(refreshOrders, 15_000);
    return () => window.clearInterval(timer);
  }, [open, refreshOrders]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Your orders"
      subtitle={profile ? `${profile.name} · ${orders.length} orders on record` : undefined}
    >
      <ul className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onReorder={() => reorder(order)} />
        ))}
      </ul>
    </Drawer>
  );
}

function OrderCard({ order, onReorder }: { order: Order; onReorder: () => void }) {
  const activeIndex = STEPS.findIndex((step) => step.id === order.status);
  const live = order.status !== 'delivered';

  return (
    <li className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-clay-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-clay-900">{order.id}</p>
          <p className="text-[11px] text-clay-600">
            {relativeDate(order.placedAt)} · {order.deliverySlot}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums">{money(order.breakdown.total)}</p>
          <p className="text-[11px] text-clay-600">
            {order.payment.method === 'card'
              ? `${order.payment.brand} •••• ${order.payment.last4}`
              : order.payment.method.toUpperCase()}
          </p>
        </div>
      </div>

      {live && (
        <div className="flex items-center gap-1">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const reached = index <= activeIndex;
            return (
              <div key={step.id} className="flex grow items-center gap-1">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] ${
                    reached ? 'bg-leaf-600 text-white' : 'bg-clay-100 text-clay-600'
                  } ${index === activeIndex ? 'animate-pulse-ring' : ''}`}
                  title={step.label}
                >
                  <Icon className="h-3 w-3" />
                </span>
                {index < STEPS.length - 1 && (
                  <span className={`h-0.5 grow rounded-full ${index < activeIndex ? 'bg-leaf-500' : 'bg-clay-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] font-semibold uppercase tracking-wide text-leaf-700">
        {live ? STEPS[Math.max(0, activeIndex)].label : 'Delivered'}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {order.lines.map((line) => (
          <span
            key={line.productId}
            title={`${line.quantity} × ${line.name}`}
            className="inline-flex items-center gap-1 rounded-lg bg-clay-100 px-1.5 py-1 text-[11px] font-medium"
          >
            <span>{line.emoji}</span>
            {line.quantity}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onReorder}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-clay-100 py-2 text-xs font-bold text-clay-700 transition hover:bg-leaf-100 hover:text-leaf-800"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reorder these items
      </button>
    </li>
  );
}
