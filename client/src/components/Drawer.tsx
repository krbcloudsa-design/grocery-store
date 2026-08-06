import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-clay-900/40 backdrop-blur-sm"
      />
      <div className="animate-slide-in relative flex h-full w-full max-w-md flex-col bg-clay-50 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-clay-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-clay-900">{title}</h2>
            {subtitle && <p className="text-xs text-clay-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-clay-600 transition hover:bg-clay-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grow overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="border-t border-clay-200 bg-white px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
