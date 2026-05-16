// apps/frontend/src/shared/components/DataTable.tsx
import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import './DataTable.css';

export type DataTableColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => ReactNode;
};

type DataTableProps<T extends Record<string, unknown>> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  sortKey,
  sortDir = 'asc',
  onSort,
  emptyMessage = 'Nenhum registro encontrado.',
  loading = false
}: DataTableProps<T>) {
  return (
    <table className="data-table-shared">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} data-align={col.align ?? 'left'}>
              {col.sortable && onSort ? (
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  data-active={sortKey === col.key ? 'true' : 'false'}
                >
                  {col.label}
                  {sortKey === col.key
                    ? sortDir === 'asc'
                      ? <ArrowUp size={12} strokeWidth={2} aria-hidden="true" />
                      : <ArrowDown size={12} strokeWidth={2} aria-hidden="true" />
                    : <ArrowUpDown size={12} strokeWidth={2} aria-hidden="true" />
                  }
                </button>
              ) : col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={columns.length} className="data-table-shared__empty">
              Carregando...
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="data-table-shared__empty">
              {emptyMessage}
            </td>
          </tr>
        ) : rows.map((row, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={col.key} data-align={col.align ?? 'left'}>
                {col.render ? col.render(row) : (row[col.key] as ReactNode)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
