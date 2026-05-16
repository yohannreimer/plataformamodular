// apps/frontend/src/shared/components/Panel.tsx
import { useState } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './Panel.css';

type PanelProps = PropsWithChildren<{
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  flush?: boolean;
  className?: string;
}>;

export function Panel({
  eyebrow,
  title,
  description,
  action,
  collapsible = false,
  defaultCollapsed = false,
  flush = false,
  className,
  children
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const hasHeader = eyebrow || title || description || action || collapsible;

  return (
    <section className={`panel-shared ${className ?? ''}`.trim()}>
      {hasHeader ? (
        <div className={`panel-shared__header ${!title ? 'panel-shared__header--no-divider' : ''}`.trim()}>
          <div>
            {eyebrow ? <p className="panel-shared__eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="panel-shared__title">{title}</h2> : null}
            {description ? <p className="panel-shared__description">{description}</p> : null}
          </div>
          <div className="panel-shared__action" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {action}
            {collapsible ? (
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expandir' : 'Recolher'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-soft)', display: 'flex' }}
              >
                {collapsed
                  ? <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
                  : <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
                }
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {!collapsed ? (
        <div className={`panel-shared__body ${flush ? 'panel-shared__body--flush' : ''}`.trim()}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
