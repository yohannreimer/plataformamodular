// apps/frontend/src/shared/components/Toast.tsx
import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import './Toast.css';

type ToastTone = 'success' | 'error' | 'warning';

type ToastItem = {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (item: Omit<ToastItem, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle
};

function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const Icon = TONE_ICON[item.tone];

  useEffect(() => {
    if (item.tone !== 'error') {
      const t = setTimeout(() => onDismiss(item.id), 4000);
      return () => clearTimeout(t);
    }
  }, [item.id, item.tone, onDismiss]);

  return (
    <div className={`toast toast--${item.tone}`} role="alert" aria-live="polite">
      <span className="toast__icon">
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="toast__body">
        <p className="toast__title">{item.title}</p>
        {item.message ? <p className="toast__message">{item.message}</p> : null}
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(item.id)}
        aria-label="Fechar notificação"
      >
        <X size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...item, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-container" aria-label="Notificações">
        {toasts.map((t) => (
          <ToastItemView key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
