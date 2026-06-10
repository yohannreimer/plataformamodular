import { useCallback, useEffect, useRef, type ReactNode } from 'react';
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

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  );
}

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => {
    if (dirty && confirmClose && !confirmClose()) {
      return;
    }
    onClose();
  }, [confirmClose, dirty, onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (closeButtonRef.current ?? dialogRef.current)?.focus();

    return () => {
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        requestClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstFocusable || !dialog.contains(activeElement)) {
          event.preventDefault();
          lastFocusable.focus();
        }
        return;
      }

      if (activeElement === lastFocusable || !dialog.contains(activeElement)) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, requestClose]);

  if (!open) {
    return null;
  }

  return (
    <div ref={dialogRef} className="finance-bottom-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
      <div className="finance-bottom-sheet__scrim" onClick={requestClose} />
      <section className="finance-bottom-sheet__panel">
        <div className="finance-bottom-sheet__handle" aria-hidden="true" />
        <header className="finance-bottom-sheet__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            className="finance-bottom-sheet__close"
            aria-label={`Fechar ${title}`}
            onClick={requestClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="finance-bottom-sheet__body">{children}</div>
        {footer ? <footer className="finance-bottom-sheet__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
