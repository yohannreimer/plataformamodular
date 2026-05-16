// apps/frontend/src/shared/components/Skeleton.tsx
import './Skeleton.css';

type SkeletonBlockProps = {
  height?: number | string;
  width?: number | string;
  className?: string;
};

export function SkeletonBlock({ height = 16, width = '100%', className }: SkeletonBlockProps) {
  return (
    <span
      className={`skeleton-block ${className ?? ''}`.trim()}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width
      }}
      aria-hidden="true"
    />
  );
}
