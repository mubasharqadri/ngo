"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ChevronRight, Home } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
  padding = "md",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}) {
  const pad = padding === "sm" ? "p-4" : padding === "lg" ? "p-6" : "p-5";
  return <div className={clsx("card", pad, className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "emerald",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "emerald" | "amber" | "sky" | "rose" | "violet";
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <Card className="flex items-start justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-gray-500 font-medium">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
      </div>
      {icon && (
        <div className={clsx("rounded-lg p-2.5", tones[tone])}>{icon}</div>
      )}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      {icon && <div className="mx-auto mb-3 text-gray-400">{icon}</div>}
      <h3 className="font-semibold text-gray-800">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-3 border-b border-gray-100 flex gap-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-4" style={{ width: `${100 / cols}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-3 border-b border-gray-50 flex gap-2">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="skeleton h-3" style={{ width: `${100 / cols}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose" | "sky" | "violet";
}) {
  const tones: Record<string, string> = {
    slate: "bg-gray-100 text-gray-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return <span className={clsx("badge", tones[tone])}>{children}</span>;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
      <Link href="/" className="hover:text-gray-800 flex items-center">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-gray-400" />
          {it.href ? (
            <Link href={it.href} className="hover:text-gray-800">{it.label}</Link>
          ) : (
            <span className="text-gray-800 font-medium">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx("relative bg-white rounded-xl shadow-xl w-full", widths[size])}>
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-gray-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 mb-1 block">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-gray-400 mt-1 block">{hint}</span>}
    </label>
  );
}

export function Tabs({
  value,
  onChange,
  tabs,
}: {
  value: string;
  onChange: (v: string) => void;
  tabs: { id: string; label: string; count?: number }[];
}) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition",
            value === t.id
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  danger = false,
  loading,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            className={clsx("btn", danger ? "btn-danger" : "btn-primary")}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Working..." : confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      className="input max-w-xs"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Single-context scroll wrapper — keeps the horizontal scrollbar visible in the first view. */
export function ListScroll({ children, height = "calc(100vh - 280px)" }: { children: React.ReactNode; height?: string }) {
  return (
    <div className="list-scroll" style={{ maxHeight: height }}>
      {children}
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  onRowClick,
  empty,
  keyField = "id",
  bare = false,
}: {
  columns: { key: string; label: string; render?: (row: T) => React.ReactNode; className?: string }[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  keyField?: string;
  /** bare: render just the table (for use inside ListScroll, which owns scrolling) */
  bare?: boolean;
}) {
  if (!rows.length) {
    return empty || <EmptyState title="No records yet" description="Create your first entry to get started." />;
  }
  const table = (
    <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.className}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={String((row as Record<string, unknown>)[keyField] ?? i)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
  );
  if (bare) return table;
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">{table}</div>
    </Card>
  );
}
