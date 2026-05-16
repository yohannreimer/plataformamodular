// apps/frontend/src/shared/components/PageHeader.tsx
import type { ReactNode } from 'react';
import './PageHeader.css';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="page-header-shared">
      <div className="page-header-shared__row">
        <div>
          <p className="page-header-shared__eyebrow">{eyebrow}</p>
          <h1 className="page-header-shared__title">{title}</h1>
          {description ? (
            <p className="page-header-shared__description">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="page-header-shared__action">{action}</div>
        ) : null}
      </div>
    </div>
  );
}
