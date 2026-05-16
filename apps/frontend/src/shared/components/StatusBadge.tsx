// apps/frontend/src/shared/components/StatusBadge.tsx
import type { LucideIcon } from 'lucide-react';
import './StatusBadge.css';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

type StatusBadgeProps = {
  value: string;
  tone?: Tone;
  icon?: LucideIcon;
  size?: 'sm' | 'md';
};

export function StatusBadge({ value, tone = 'neutral', icon: Icon, size = 'md' }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone} ${size === 'sm' ? 'status-badge--sm' : ''}`.trim()}>
      {Icon ? <Icon size={10} strokeWidth={2} aria-hidden="true" /> : null}
      {value}
    </span>
  );
}
