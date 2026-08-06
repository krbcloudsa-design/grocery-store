import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useStore } from '../store.tsx';

const TONES = {
  info: { ring: 'ring-clay-200', icon: Info, colour: 'text-clay-700' },
  success: { ring: 'ring-leaf-200', icon: CheckCircle2, colour: 'text-leaf-600' },
  warning: { ring: 'ring-amber-200', icon: AlertTriangle, colour: 'text-amber-600' },
} as const;

export function Toasts() {
  const { toasts, dismissToast } = useStore();

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => {
        const tone = TONES[toast.tone];
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            className={`animate-slide-up pointer-events-auto flex items-start gap-2.5 rounded-2xl bg-white p-3 shadow-xl ring-1 ${tone.ring}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.colour}`} />
            <div className="grow">
              <p className="text-xs font-bold text-clay-900">{toast.title}</p>
              {toast.body && <p className="text-[11px] leading-snug text-clay-600">{toast.body}</p>}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismissToast(toast.id)}
              className="rounded-md p-0.5 text-clay-300 transition hover:bg-clay-100 hover:text-clay-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
