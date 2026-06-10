import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { FinanceBottomSheet } from './FinanceBottomSheet';

export function FinanceMobileFilterSheet({
  title,
  activeCount = 0,
  children
}: {
  title: string;
  activeCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const label = activeCount > 0 ? `Abrir ${title.toLowerCase()}, ${activeCount} filtros ativos` : `Abrir ${title.toLowerCase()}`;

  return (
    <>
      <button type="button" className="finance-mobile-filter-trigger" aria-label={label} onClick={() => setOpen(true)}>
        <SlidersHorizontal size={16} aria-hidden="true" />
        <span>Filtros</span>
        {activeCount > 0 ? <strong>{activeCount}</strong> : null}
      </button>
      <FinanceBottomSheet open={open} title={title} onClose={() => setOpen(false)}>
        <div className="finance-mobile-filter-sheet__content">{children}</div>
      </FinanceBottomSheet>
    </>
  );
}
