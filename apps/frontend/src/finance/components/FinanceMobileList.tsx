import type { ReactNode } from 'react';

type AmountTone = 'income' | 'expense' | 'neutral';

export function FinanceMobileList({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return (
    <div className="finance-mobile-list" role="list" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function FinanceMobileListCard({
  title,
  amount,
  amountTone = 'neutral',
  status,
  date,
  meta,
  footer,
  onClick,
  disabled = false
}: {
  title: string;
  amount: string;
  amountTone?: AmountTone;
  status?: string;
  date?: string;
  meta?: string[];
  footer?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const visibleMeta = meta?.filter(Boolean) ?? [];
  const content = (
    <>
      <span className="finance-mobile-list-card__head">
        <strong>{title}</strong>
        <span className={`finance-mobile-list-card__amount finance-mobile-list-card__amount--${amountTone}`}>{amount}</span>
      </span>
      {status || date ? (
        <span className="finance-mobile-list-card__subhead">
          {status ? <span>{status}</span> : null}
          {date ? <span>{date}</span> : null}
        </span>
      ) : null}
      {visibleMeta.length > 0 ? (
        <span className="finance-mobile-list-card__meta">
          {visibleMeta.map((item) => (
            <small key={item}>{item}</small>
          ))}
        </span>
      ) : null}
      {footer ? <span className="finance-mobile-list-card__footer">{footer}</span> : null}
    </>
  );

  return (
    <article className="finance-mobile-list-card" role="listitem">
      {onClick ? (
        <button type="button" className="finance-mobile-list-card__button" onClick={onClick} disabled={disabled}>
          {content}
        </button>
      ) : (
        <div className="finance-mobile-list-card__button finance-mobile-list-card__button--static">
          {content}
        </div>
      )}
    </article>
  );
}
