// apps/frontend/src/shared/components/KpiCard.tsx
import type { ReactNode } from 'react';
import './KpiCard.css';

type SparklineProps = { series: number[]; accentColor?: string };

function Sparkline({ series, accentColor = 'var(--brand-ink)' }: SparklineProps) {
  const max = Math.max(...series, 1);
  const w = 80;
  const h = 28;
  const step = w / (series.length - 1);
  const points = series
    .map((v, i) => `${i * step},${h - (v / max) * h}`)
    .join(' ');
  return (
    <svg
      className="kpi-card-shared__sparkline"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={accentColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type KpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  accentColor?: string;
  sparkSeries?: number[];
  delta?: string;
  deltaTone?: 'positive' | 'warning' | 'critical';
  href?: string;
};

export function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
  accentColor,
  sparkSeries,
  delta,
  deltaTone,
  href
}: KpiCardProps) {
  const toneClass = tone !== 'neutral' ? ` kpi-card-shared--${tone}` : '';
  const className = `kpi-card-shared${toneClass}`;

  const inner = (
    <>
      <p className="kpi-card-shared__label">{label}</p>
      <p className="kpi-card-shared__value">{value}</p>
      {sparkSeries && sparkSeries.length > 1 ? (
        <Sparkline series={sparkSeries} accentColor={accentColor} />
      ) : null}
      {(hint || delta) ? (
        <div className="kpi-card-shared__footer">
          {hint ? <span className="kpi-card-shared__hint">{hint}</span> : <span />}
          {delta ? (
            <span className={`kpi-card-shared__delta kpi-card-shared__delta--${deltaTone ?? 'positive'}`}>
              {delta}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (href) {
    return <a href={href} className={className}>{inner}</a>;
  }
  return <article className={className}>{inner}</article>;
}
