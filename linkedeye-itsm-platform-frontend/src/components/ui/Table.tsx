import { useState, useMemo, forwardRef } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectedRows?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: (selected: boolean) => void;
  sortable?: boolean;
  defaultSortField?: string;
  defaultSortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  className?: string;
  variant?: 'default' | 'bordered' | 'striped' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  stickyHeader?: boolean;
}

function Table<T extends object>({
  columns,
  data,
  keyField = 'id',
  isLoading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  onRowClick,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  sortable = false,
  defaultSortField,
  defaultSortDirection = 'asc',
  onSort,
  className,
  variant = 'default',
  size = 'md',
  stickyHeader = false,
}: TableProps<T>) {
  const [sortField, setSortField] = useState<string | undefined>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

  const handleSort = (field: string) => {
    if (!sortable) return;

    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    onSort?.(field, newDirection);
  };

  const sortedData = useMemo(() => {
    if (!sortField || onSort) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortField];
      const bValue = (b as Record<string, unknown>)[sortField];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection, onSort]);

  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown size={14} className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} className="text-primary-600 dark:text-primary-400" />
    ) : (
      <ChevronDown size={14} className="text-primary-600 dark:text-primary-400" />
    );
  };

  // Size styles
  const sizeStyles = {
    sm: {
      cell: 'px-3 py-2 text-xs',
      header: 'px-3 py-2 text-[10px]',
      checkbox: 'w-3.5 h-3.5',
    },
    md: {
      cell: 'px-4 py-3 text-sm',
      header: 'px-4 py-3 text-xs',
      checkbox: 'w-4 h-4',
    },
    lg: {
      cell: 'px-5 py-4 text-base',
      header: 'px-5 py-4 text-sm',
      checkbox: 'w-4 h-4',
    },
  };

  // Variant styles
  const containerVariants = {
    default: 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm',
    bordered: 'bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-700',
    striped: 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm',
    minimal: 'bg-transparent',
  };

  const headerVariants = {
    default: 'bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800',
    bordered: 'bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700',
    striped: 'bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800',
    minimal: 'border-b border-gray-200 dark:border-gray-800',
  };

  const rowVariants = {
    default: 'border-b border-gray-100 dark:border-gray-800 last:border-b-0',
    bordered: 'border-b border-gray-200 dark:border-gray-700 last:border-b-0',
    striped: 'border-b border-gray-100 dark:border-gray-800 last:border-b-0 even:bg-gray-50/50 dark:even:bg-gray-800/30',
    minimal: 'border-b border-gray-100 dark:border-gray-800 last:border-b-0',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={clsx(containerVariants[variant], 'overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead className={clsx(stickyHeader && 'sticky top-0 z-10')}>
            <tr className={headerVariants[variant]}>
              {onSelectRow && (
                <th
                  className={clsx(
                    'w-12',
                    sizeStyles[size].header,
                    'font-semibold text-gray-600 dark:text-gray-400'
                  )}
                  scope="col"
                >
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={(e) => onSelectAll?.(e.target.checked)}
                      className={clsx(
                        sizeStyles[size].checkbox,
                        'rounded border-gray-300 dark:border-gray-600',
                        'text-primary-600 dark:text-primary-500',
                        'focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0',
                        'bg-white dark:bg-gray-700',
                        'transition-colors duration-200',
                        'cursor-pointer'
                      )}
                      aria-label={allSelected ? 'Deselect all rows' : 'Select all rows'}
                    />
                  </div>
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    sizeStyles[size].header,
                    'font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap',
                    alignClasses[column.align || 'left'],
                    column.sortable && sortable && 'cursor-pointer select-none group',
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                  scope="col"
                  aria-sort={sortField === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <div
                    className={clsx(
                      'flex items-center gap-1.5',
                      column.align === 'center' && 'justify-center',
                      column.align === 'right' && 'justify-end',
                      column.sortable && sortable && 'hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-200'
                    )}
                  >
                    <span className="truncate">{column.header}</span>
                    {column.sortable && sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className={rowVariants[variant]}>
                  {onSelectRow && (
                    <td className={clsx('w-12', sizeStyles[size].cell)}>
                      <div className="flex justify-center">
                        <div className={clsx(sizeStyles[size].checkbox, 'bg-gray-200 dark:bg-gray-700 rounded animate-pulse')} />
                      </div>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className={clsx(sizeStyles[size].cell, column.className)}>
                      <div
                        className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                        style={{ width: `${Math.random() * 40 + 40}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectRow ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {emptyIcon || <Inbox size={24} className="text-gray-400 dark:text-gray-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {emptyMessage}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => {
                const rowId = String((row as Record<string, unknown>)[keyField]);
                const isSelected = selectedRows.includes(rowId);

                return (
                  <tr
                    key={rowId}
                    className={clsx(
                      rowVariants[variant],
                      'transition-colors duration-150',
                      onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      isSelected && 'bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30'
                    )}
                    onClick={() => onRowClick?.(row)}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }}
                    role={onRowClick ? 'button' : undefined}
                  >
                    {onSelectRow && (
                      <td
                        className={clsx('w-12', sizeStyles[size].cell)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onSelectRow(rowId)}
                            className={clsx(
                              sizeStyles[size].checkbox,
                              'rounded border-gray-300 dark:border-gray-600',
                              'text-primary-600 dark:text-primary-500',
                              'focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0',
                              'bg-white dark:bg-gray-700',
                              'transition-colors duration-200',
                              'cursor-pointer'
                            )}
                            aria-label={`Select row ${rowId}`}
                          />
                        </div>
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={clsx(
                          sizeStyles[size].cell,
                          'text-gray-900 dark:text-gray-100',
                          alignClasses[column.align || 'left'],
                          column.className
                        )}
                      >
                        {column.render
                          ? column.render((row as Record<string, unknown>)[column.key], row, index)
                          : ((row as Record<string, unknown>)[column.key] as React.ReactNode) ?? (
                              <span className="text-gray-400 dark:text-gray-500">—</span>
                            )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;

// Table Header Component for custom headers
export interface TableHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader = forwardRef<HTMLDivElement, TableHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'px-4 py-3 flex items-center justify-between gap-4',
        'border-b border-gray-200 dark:border-gray-800',
        'bg-white dark:bg-gray-900',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

TableHeader.displayName = 'TableHeader';

// Table Footer Component for pagination
export interface TableFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableFooter = forwardRef<HTMLDivElement, TableFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'px-4 py-3 flex items-center justify-between gap-4',
        'border-t border-gray-200 dark:border-gray-800',
        'bg-gray-50/50 dark:bg-gray-800/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

TableFooter.displayName = 'TableFooter';

// Pagination Info Component
export interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  className?: string;
}

export const PaginationInfo = ({ currentPage, pageSize, totalItems, className }: PaginationInfoProps) => {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <p className={clsx('text-sm text-gray-600 dark:text-gray-400', className)}>
      Showing <span className="font-medium text-gray-900 dark:text-white">{start}</span> to{' '}
      <span className="font-medium text-gray-900 dark:text-white">{end}</span> of{' '}
      <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> results
    </p>
  );
};
