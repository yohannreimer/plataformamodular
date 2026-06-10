import { useCallback, useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

type FinanceBottomSheetProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  dirty?: boolean;
  confirmClose?: () => boolean;
  onClose: () => void;
};

export function FinanceBottomSheet({
  open,
  title,
  description,
  children,
  footer,
  dirty = false,
  confirmClose,
  onClose
}: FinanceBottomSheetProps) {
  const requestClose = useCallback(() => {
    if (dirty && confirmClose && !confirmClose()) {
      return;
    }
    onClose();
  }, [confirmClose, dirty, onClose]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        requestClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, requestClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="finance-bottom-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="finance-bottom-sheet__scrim" onClick={requestClose} />
      <section className="finance-bottom-sheet__panel">
        <div className="finance-bottom-sheet__handle" aria-hidden="true" />
        <header className="finance-bottom-sheet__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="finance-bottom-sheet__close" aria-label={`Fechar ${title}`} onClick={requestClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="finance-bottom-sheet__body">{children}</div>
        {footer ? <footer className="finance-bottom-sheet__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
