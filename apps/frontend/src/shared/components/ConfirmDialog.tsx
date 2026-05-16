// apps/frontend/src/shared/components/ConfirmDialog.tsx
import { useEffect, useRef, useState } from 'react';
import './ConfirmDialog.css';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmWord?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmWord,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
      setTyped('');
    } else {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      if ((e as MouseEvent).target === el) onCancel();
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [onCancel]);

  const canConfirm = !confirmWord || typed.trim() === confirmWord;

  return (
    <dialog ref={dialogRef} className="confirm-dialog" onClose={onCancel}>
      <div className="confirm-dialog__header">
        <h2 className="confirm-dialog__title">{title}</h2>
        {description ? <p className="confirm-dialog__description">{description}</p> : null}
      </div>
      {confirmWord ? (
        <div className="confirm-dialog__body">
          <label className="confirm-dialog__label" htmlFor="confirm-word-input">
            Digite <strong>{confirmWord}</strong> para confirmar:
          </label>
          <input
            id="confirm-word-input"
            type="text"
            className="confirm-dialog__input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}
      <div className="confirm-dialog__footer">
        <button type="button" className="confirm-dialog__btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="confirm-dialog__btn confirm-dialog__btn--danger"
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
