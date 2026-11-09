"use client";

import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { Fragment, useState, useMemo, useRef } from "react";
import { Plus, Edit2, Trash2, PackageOpen, Eye, History, UploadCloud, ShieldOff, Printer, FileDown, Camera } from "lucide-react";
import {
  PageHeader, Badge, Modal, Field, SearchInput,
  EmptyState, LoadingTable, ConfirmDialog, DataTable, ListScroll,
} from "@/components/ui/Breadcrumbs";
import { ExportButtons } from "@/components/ExportButtons";
import { ImportModal } from "@/components/ImportModal";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { downloadCSV } from "@/lib/exports";
import { AreaSelect } from "@/components/AreaSelect";
import { CnicNadraInput } from "@/components/CnicNadraInput";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "date" | "select" | "textarea" | "boolean" | "password" | "photo" | "jsonList" | "cnicNadra";
  options?: { value: string | number; label: string }[];
  /** Load select options dynamically from an API (also used to display labels in the table). */
  optionsFrom?: { api: string; valueKey: string; labelKey: string };
  /** Cascading dropdown: options load from `api?{parentField}={parentValue}`.
   *  altParentField: secondary parent (e.g. city can follow district OR province). */
  cascade?: { parentField: string; api: string; altParentField?: string };
  /** jsonList columns (for structured histories: qualifications, experience etc.) */
  columns?: { key: string; label: string }[];
  required?: boolean;
  hideInTable?: boolean;
  hideInForm?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  className?: string;
  /** Group fields under a section header inside the form */
  section?: string;
  /** Area dropdown tied to the row's cityId (with add-new-area flow) */
  areaOf?: string; // key of the city field, e.g. "cityId"
  /** column to store the selected area's readable name (e.g. "area") */
  storeNameAs?: string;
  /** CNIC field with NADRA verify button; maps NADRA record fields onto row keys */
  nadraFill?: { name?: string; fatherName?: string; dob?: string; gender?: string; address?: string; verifiedKey?: string };
  /** Suggest the next serial number from existing rows (e.g. membership no) */
  suggestNext?: boolean;
  /** Return an error string to block saving (e.g. duplicate membership no) */
  validate?: (value: unknown, row: Record<string, unknown>, existing: Record<string, unknown>[]) => string | null;
};

type CrudPageProps = {
  title: string;
  subtitle?: string;
  apiBase: string;
  /** Permission module key e.g. "donations.donors" */
  module: string;
  fields: FieldDef[];
  singular?: string;
  searchPlaceholder?: string;
  emptyIcon?: React.ReactNode;
  defaultValues?: Record<string, unknown>;
  totalColumn?: string;
  /** Per-row print handler (e.g. donor/donee registration form) */
  rowPrint?: (row: Record<string, unknown>) => void;
  /** Keep the horizontal scrollbar visible within the viewport (max-height table container) */
  stickyScroll?: boolean;
};

const emptyRow = (fields: FieldDef[], defaults: Record<string, unknown> = {}) => {
  const obj: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.key === "id" || f.key === "createdAt" || f.key === "updatedAt") continue;
    if (defaults[f.key] !== undefined) { obj[f.key] = defaults[f.key]; continue; }
    if (f.type === "boolean") obj[f.key] = false;
    else if (f.type === "jsonList") obj[f.key] = [];
    else obj[f.key] = "";
  }
  return obj;
};

type AuditEntry = {
  id: number;
  userName: string | null;
  action: string;
  changes: { field: string; oldValue: unknown; newValue: unknown }[];
  createdAt: string;
};

/* ---------- photo field ---------- */
function PhotoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", file.name);
      fd.append("linkType", "general");
      const res = await fetch("/api/media", { method: "POST", credentials: "include", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Upload failed");
      onChange(j.data.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-gray-300" />}
      </div>
      <div className="flex-1 space-y-1.5">
        <input className="input" placeholder="Photo URL or upload →" value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1" onClick={() => fileRef.current?.click()} disabled={busy}>
          <UploadCloud className="w-3.5 h-3.5" /> {busy ? "Uploading…" : "Upload photo"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </div>
    </div>
  );
}

/* ---------- jsonList editor ---------- */
function JsonListEditor({ cols, value, onChange }: { cols: { key: string; label: string }[]; value: Record<string, string>[]; onChange: (v: Record<string, string>[]) => void }) {
  const rows = Array.isArray(value) ? value : [];
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            {cols.map((c) => <th key={c.key} className="text-left px-2 py-1.5 font-semibold">{c.label}</th>)}
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-100">
              {cols.map((c) => (
                <td key={c.key} className="px-1.5 py-1">
                  <input className="w-full border border-gray-200 rounded px-1.5 py-1 text-xs" value={r[c.key] ?? ""}
                    onChange={(e) => onChange(rows.map((x, xi) => (xi === i ? { ...x, [c.key]: e.target.value } : x)))} />
                </td>
              ))}
              <td className="px-1">
                <button type="button" className="text-gray-400 hover:text-rose-600" onClick={() => onChange(rows.filter((_, xi) => xi !== i))}>✕</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={cols.length + 1} className="text-center text-gray-400 py-2">No entries — add below</td></tr>}
        </tbody>
      </table>
      <button type="button" className="w-full text-xs font-semibold text-emerald-700 hover:bg-emerald-50 py-1.5 border-t border-gray-100"
        onClick={() => onChange([...rows, Object.fromEntries(cols.map((c) => [c.key, ""]))])}>
        + Add row
      </button>
    </div>
  );
}

/* ---------- suggest next serial number (e.g. membership no) ---------- */
export function suggestNextNumber(existing: Record<string, unknown>[], key: string): string | null {
  const vals = existing.map((r) => String(r[key] ?? "")).filter(Boolean);
  if (!vals.length) return null;
  let max = 0;
  let prefix = "";
  for (const v of vals) {
    const m = v.match(/^(.*?)(\d+)$/);
    if (m && Number(m[2]) > max) {
      max = Number(m[2]);
      prefix = m[1];
    }
  }
  const pad = Math.max(String(max).length, 4);
  return `${prefix}${String(max + 1).padStart(pad, "0")}`;
}

/* ---------- form ---------- */
function FormFields({
  fields, value, onChange, optionsMap, existing,
}: {
  fields: FieldDef[];
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  optionsMap: Record<string, { value: string | number; label: string }[]>;
  existing: Record<string, unknown>[];
}) {
  const formFields = fields.filter((f) => !f.hideInForm && f.key !== "id" && f.key !== "createdAt" && f.key !== "passwordHash");
  let lastSection: string | undefined;

  const setField = (f: FieldDef, nv: unknown) => {
    const next = { ...value, [f.key]: nv };
    // clear cascade children when a parent (or alternate parent) changes
    for (const other of fields) {
      if (other.cascade?.parentField === f.key || other.cascade?.altParentField === f.key) {
        next[other.key] = "";
      }
      if (other.areaOf === f.key) {
        next[other.key] = "";
      }
    }
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {formFields.map((f) => {
        let sectionHeader: React.ReactNode = null;
        if (f.section && f.section !== lastSection) {
          lastSection = f.section;
          sectionHeader = (
            <div className="sm:col-span-2 mt-2 first:mt-0 flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-emerald-700 font-bold">{f.section}</span>
              <span className="h-px flex-1 bg-emerald-100" />
            </div>
          );
        }
        const v = value[f.key];
        const opts = f.options ?? (f.optionsFrom ? optionsMap[f.optionsFrom.api] ?? [] : f.cascade ? optionsMap[`cascade:${f.key}`] ?? [] : []);
        let el: React.ReactNode;

        if (f.type === "photo") {
          el = <PhotoInput value={String(v ?? "")} onChange={(nv) => setField(f, nv)} />;
        } else if (f.type === "jsonList" && f.columns) {
          el = <JsonListEditor cols={f.columns} value={(v as Record<string, string>[]) ?? []} onChange={(nv) => setField(f, nv)} />;
        } else if (f.type === "select") {
          el = (
            <Field label={f.label} required={f.required}>
              <select className="input" value={String(v ?? "")} onChange={(e) => setField(f, e.target.value === "" ? null : e.target.value)} disabled={f.cascade && !value[f.cascade.parentField]}>
                <option value="">{f.cascade && !value[f.cascade.parentField] ? `Select ${fields.find((x) => x.key === f.cascade!.parentField)?.label ?? "parent"} first` : "—"}</option>
                {opts.map((o) => (
                  <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                ))}
              </select>
            </Field>
          );
        } else if (f.type === "textarea") {
          el = (
            <Field label={f.label} required={f.required}>
              <textarea className="input" rows={3} value={String(v ?? "")} onChange={(e) => setField(f, e.target.value)} />
            </Field>
          );
        } else if (f.type === "boolean") {
          el = (
            <label className="flex items-center gap-2 pt-5 cursor-pointer">
              <input type="checkbox" checked={Boolean(v)} onChange={(e) => setField(f, e.target.checked)} className="accent-emerald-600" />
              <span className="text-sm">{f.label}</span>
            </label>
          );
        } else if (f.areaOf) {
          el = (
            <Field label={f.label} required={f.required}>
              <AreaSelect
                cityId={value[f.areaOf] as string | number | null}
                value={String(v ?? "")}
                onChange={(id: string, name: string) => {
                  // store both the FK and the readable name (for print/display)
                  const next = { ...value, [f.key]: id };
                  if (f.storeNameAs) next[f.storeNameAs] = name;
                  onChange(next);
                }}
              />
            </Field>
          );
        } else if (f.type === "cnicNadra") {
          const nf = f.nadraFill ?? {};
          el = (
            <Field label={f.label} required={f.required}>
              <CnicNadraInput
                value={String(v ?? "")}
                verified={Boolean(value[nf.verifiedKey ?? "cnicVerified"])}
                onValue={(nv: string) => setField(f, nv)}
                onVerified={(rec) => {
                  if (!rec) return;
                  const next = { ...value };
                  if (nf.name) next[nf.name] = rec.name;
                  if (nf.fatherName) next[nf.fatherName] = rec.fatherName ?? "";
                  if (nf.dob) next[nf.dob] = rec.dateOfBirth ?? "";
                  if (nf.gender) next[nf.gender] = rec.gender ?? "";
                  if (nf.address) next[nf.address] = rec.address ?? "";
                  if (nf.verifiedKey) next[nf.verifiedKey] = true;
                  onChange(next);
                }}
              />
            </Field>
          );
        } else {
          const suggested = f.suggestNext && !v ? suggestNextNumber(existing, f.key) : null;
          const err = f.validate ? f.validate(v, value, existing) : null;
          el = (
            <Field label={f.label} required={f.required}>
              <input
                className="input"
                style={err ? { borderColor: "#e11d48" } : undefined}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "password" ? "password" : "text"}
                value={String(v ?? "")}
                onChange={(e) => setField(f, e.target.value)}
                required={f.required}
              />
              {suggested && (
                <button type="button" className="mt-1 text-xs text-emerald-700 font-semibold hover:underline" onClick={() => setField(f, suggested)}>
                  Suggested next: {suggested} — click to use
                </button>
              )}
              {err && <span className="mt-1 block text-xs text-rose-600 font-medium">{err}</span>}
            </Field>
          );
        }
        const wide = f.type === "jsonList" || f.type === "photo";
        return (
          <Fragment key={f.key}>
            {sectionHeader}
            {wide ? <div className="sm:col-span-2">{el}</div> : el}
          </Fragment>
        );
      })}
    </div>
  );
}

const actionTone: Record<string, "emerald" | "amber" | "rose" | "sky" | "slate" | "violet"> = {
  create: "emerald", import: "sky", update: "amber", delete: "rose", cancel: "rose", login: "violet",
};

/* ======================================================================== */

export function CrudPage({ title, subtitle, apiBase, module, fields, singular, searchPlaceholder, emptyIcon, defaultValues, totalColumn, rowPrint, stickyScroll }: CrudPageProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [viewing, setViewing] = useState<Record<string, unknown> | null>(null);
  const [historyRow, setHistoryRow] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">(
    fields.filter((f) => !f.hideInTable).length > 6 ? "landscape" : "portrait"
  );
  const [newValues, setNewValues] = useState<Record<string, unknown>>(() => emptyRow(fields, defaultValues));

  /** first validation error for a form row (blocks saving) */
  const formError = (row: Record<string, unknown> | null): string | null => {
    if (!row) return null;
    for (const f of fields) {
      if (f.validate) {
        const e = f.validate(row[f.key], row, data ?? []);
        if (e) return e;
      }
    }
    return null;
  };

  const allow = {
    view: can(module, "view"),
    create: can(module, "create"),
    edit: can(module, "edit"),
    delete: can(module, "delete"),
    print: can(module, "print"),
    import: can(module, "import"),
  };

  // dynamic options for optionsFrom fields
  const optionApis = useMemo(() => [...new Set(fields.filter((f) => f.optionsFrom).map((f) => f.optionsFrom!.api))], [fields]);
  const { data: fromApiOptions = {} } = useQuery({
    queryKey: ["options", optionApis],
    enabled: optionApis.length > 0,
    queryFn: async () => {
      const map: Record<string, { value: string | number; label: string }[]> = {};
      await Promise.all(
        optionApis.map(async (a) => {
          try {
            const r = await fetch(`${a}?limit=500`, { credentials: "include" });
            const j = await r.json();
            const src = fields.find((f) => f.optionsFrom?.api === a)?.optionsFrom!;
            map[a] = ((j.data ?? []) as Record<string, unknown>[]).map((row) => ({
              value: row[src.valueKey] as string | number,
              label: String(row[src.labelKey] ?? `#${row[src.valueKey]}`),
            }));
          } catch {
            map[a] = [];
          }
        })
      );
      return map;
    },
  });

  // cascade options — depend on the current parent value in the active form
  const activeForm = editing ?? (creating ? newValues : null);
  const cascadeFields = useMemo(() => fields.filter((f) => f.cascade), [fields]);
  const cascadeQueries = useQueries({
    queries: cascadeFields.map((f) => {
      const c = f.cascade!;
      const altVal = c.altParentField && activeForm ? String(activeForm[c.altParentField] ?? "") : "";
      const parentVal = altVal || (activeForm ? String(activeForm[c.parentField] ?? "") : "");
      const paramName = altVal ? c.altParentField! : c.parentField;
      return {
        queryKey: ["cascade", c.api, paramName, parentVal],
        enabled: !!parentVal,
        staleTime: 60_000,
        queryFn: async () => {
          const r = await fetch(`${c.api}?${paramName}=${parentVal}&limit=500`, { credentials: "include" });
          const j = await r.json();
          return ((j.data ?? []) as Record<string, unknown>[]).map((row) => ({
            value: row.id as string | number,
            label: String(row.name ?? `#${row.id}`),
          }));
        },
      };
    }),
  });

  const optionsMap = useMemo(() => {
    const map: Record<string, { value: string | number; label: string }[]> = { ...fromApiOptions };
    cascadeFields.forEach((f, i) => {
      map[`cascade:${f.key}`] = cascadeQueries[i]?.data ?? [];
    });
    return map;
  }, [fromApiOptions, cascadeFields, cascadeQueries]);

  const { data, isLoading } = useQuery({
    queryKey: [apiBase, search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "500" });
      if (search) params.set("search", search);
      const res = await fetch(`${apiBase}?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const j = await res.json();
      return j.data as Record<string, unknown>[];
    },
  });

  const { data: auditEntries } = useQuery({
    queryKey: ["audit", module, historyRow?.id],
    enabled: !!historyRow,
    queryFn: async () => {
      const res = await fetch(`/api/administration/audit?module=${module}&recordId=${historyRow!.id}`, { credentials: "include" });
      const j = await res.json();
      return (j.data ?? []) as AuditEntry[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [apiBase] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const res = await fetch(apiBase, { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify(row) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to create");
      return j.data;
    },
    onSuccess: () => { invalidate(); setCreating(false); setNewValues(emptyRow(fields, defaultValues)); toast.push({ title: `${singular ?? "Record"} created`, desc: "Change log recorded." }); },
    onError: (e: Error) => toast.push({ title: "Create failed", desc: e.message, tone: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const res = await fetch(`${apiBase}?id=${row.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify(row) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update");
      return j.data;
    },
    onSuccess: () => { invalidate(); setEditing(null); toast.push({ title: `${singular ?? "Record"} updated`, desc: "All column changes were logged." }); },
    onError: (e: Error) => toast.push({ title: "Update failed", desc: e.message, tone: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const res = await fetch(`${apiBase}?id=${row.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.push({ title: `${singular ?? "Record"} deleted`, tone: "info" }); },
    onError: (e: Error) => toast.push({ title: "Delete failed", desc: e.message, tone: "error" }),
  });

  const tableFields = fields.filter((f) => !f.hideInTable);
  const exportColumns = useMemo(() => tableFields.filter((f) => f.key !== "id").map((f) => ({ key: f.key, label: f.label })), [tableFields]);

  const formFields = fields.filter((f) => !f.hideInForm && f.key !== "id" && f.key !== "createdAt" && f.key !== "passwordHash");

  const downloadTemplate = () =>
    downloadCSV(
      `${title.toLowerCase().replace(/\s+/g, "-")}-import-template`,
      formFields.map((f) => ({ key: f.key, label: f.key })),
      []
    );

  const displayValue = (f: FieldDef, row: Record<string, unknown>): React.ReactNode => {
    if (f.render) return f.render(row[f.key], row);
    const v = row[f.key];
    if (v === null || v === undefined || v === "") return <span className="text-gray-400">—</span>;
    if (f.type === "boolean") return <Badge tone={v ? "emerald" : "slate"}>{v ? "Yes" : "No"}</Badge>;
    if (f.type === "date") return String(v).slice(0, 10);
    if (f.type === "password") return "••••••";
    if (f.type === "photo") return <img src={String(v)} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-200" />;
    if (f.type === "jsonList") return <Badge tone="sky">{Array.isArray(v) ? v.length : 0} entries</Badge>;
    if (f.cascade || f.optionsFrom) {
      const opts = f.options ?? optionsMap[f.optionsFrom ? f.optionsFrom.api : `cascade:${f.key}`] ?? [];
      const hit = opts.find((o) => String(o.value) === String(v));
      if (hit) return hit.label;
    }
    if (f.type === "select" && f.options) {
      const hit = f.options.find((o) => String(o.value) === String(v));
      if (hit) return hit.label;
    }
    return String(v);
  };

  const columns = useMemo(() => {
    const cols = tableFields.map((f) => ({
      key: f.key,
      label: f.label,
      className: f.className,
      render: (row: Record<string, unknown>) => displayValue(f, row),
    }));
    cols.push({
      key: "_actions",
      label: "Actions",
      className: "w-40 text-right",
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-0.5 justify-end" onClick={(e) => e.stopPropagation()}>
          <button className="p-1.5 rounded hover:bg-sky-50 text-gray-400 hover:text-sky-600 transition" onClick={() => setViewing(row)} title="View details"><Eye className="w-3.5 h-3.5" /></button>
          <button className="p-1.5 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition" onClick={() => setHistoryRow(row)} title="Change history (audit log)"><History className="w-3.5 h-3.5" /></button>
          {rowPrint && allow.print && (
            <button className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition" onClick={() => rowPrint(row)} title="Print form"><Printer className="w-3.5 h-3.5" /></button>
          )}
          {allow.edit && (
            <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition" onClick={() => setEditing({ ...row })} title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
          )}
          {allow.delete && (
            <button className="p-1.5 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition" onClick={() => setDeleting(row)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      ),
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFields, optionsMap, allow.edit, allow.delete, allow.print, rowPrint]);

  // ---- access gate ----
  if (!allow.view && !isLoading) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto mt-10">
        <ShieldOff className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold mb-1">Access restricted</h2>
        <p className="text-sm text-gray-500 mb-5">Your role does not have permission to open {title}.</p>
      </div>
    );
  }

  const coerce = (payload: Record<string, unknown>) => {
    const out = { ...payload };
    for (const f of fields) {
      if (f.type === "number" && out[f.key] !== "" && out[f.key] !== null && out[f.key] !== undefined) out[f.key] = Number(out[f.key]);
      if (out[f.key] === "") out[f.key] = null;
      if (f.type === "jsonList" && (out[f.key] === null || out[f.key] === undefined)) out[f.key] = [];
    }
    return out;
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button className="btn btn-ghost" onClick={downloadTemplate} title="Download the CSV column format for import">
              <FileDown className="w-4 h-4" /> CSV Format
            </button>
            {allow.import && (
              <button className="btn btn-ghost" onClick={() => setImporting(true)}>
                <UploadCloud className="w-4 h-4" /> Import CSV
              </button>
            )}
            {allow.create && (
              <button className="btn btn-primary" onClick={() => setCreating(true)}>
                <Plus className="w-4 h-4" /> Add {singular ?? "Record"}
              </button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}...`} />
        {allow.print && data && data.length > 0 && (
          <div className="flex items-center gap-2">
            {/* print orientation toggle */}
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden" title="Print / PDF page orientation">
              <button
                className={`px-2.5 py-1.5 text-xs font-semibold transition ${printOrientation === "portrait" ? "bg-[#0e3b2e] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                onClick={() => setPrintOrientation("portrait")}
              >▯ Portrait</button>
              <button
                className={`px-2.5 py-1.5 text-xs font-semibold transition ${printOrientation === "landscape" ? "bg-[#0e3b2e] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                onClick={() => setPrintOrientation("landscape")}
              >▭ Landscape</button>
            </div>
            <ExportButtons filename={title.toLowerCase().replace(/\s+/g, "-")} title={title} subtitle={subtitle} columns={exportColumns} rows={data} totalColumn={totalColumn} signatures={["Prepared By", "Checked By", "Approved By"]} orientation={printOrientation} />
          </div>
        )}
      </div>

      {isLoading && <LoadingTable rows={6} cols={tableFields.length + 1} />}

      {data && (
        <ListScroll>
          <DataTable
            bare
            columns={columns}
            rows={data}
            onRowClick={(r) => setViewing(r)}
            empty={
              <EmptyState
                title={`No ${title.toLowerCase()} yet`}
                description={`Click "Add ${singular ?? "Record"}" to create your first entry.`}
                icon={emptyIcon ?? <PackageOpen className="w-10 h-10 mx-auto" />}
                action={allow.create ? (
                  <button className="btn btn-primary" onClick={() => setCreating(true)}>
                    <Plus className="w-4 h-4" /> Add {singular ?? "Record"}
                  </button>
                ) : undefined}
              />
            }
          />
        </ListScroll>
      )}

      {/* Create */}
      <Modal open={creating} onClose={() => setCreating(false)} title={`Add ${singular ?? "Record"}`} size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={createMutation.isPending || !!formError(newValues)} onClick={() => createMutation.mutate(coerce(newValues))}>
              {createMutation.isPending ? "Saving..." : "Save"}
            </button>
          </>
        }>
        {createMutation.isError && <div className="mb-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{createMutation.error?.message ?? "Failed"}</div>}
        <FormFields fields={fields} value={newValues} onChange={setNewValues} optionsMap={optionsMap} existing={data ?? []} />
      </Modal>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${singular ?? "Record"} #${editing?.id ?? ""}`} size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={updateMutation.isPending || !editing || !!formError(editing)} onClick={() => editing && updateMutation.mutate(coerce(editing))}>
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </>
        }>
        {updateMutation.isError && <div className="mb-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{updateMutation.error?.message ?? "Failed"}</div>}
        {editing && <FormFields fields={fields} value={editing} onChange={setEditing} optionsMap={optionsMap} existing={data ?? []} />}
      </Modal>

      {/* View details */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`${singular ?? "Record"} details`} size="md"
        footer={
          <>
            {viewing && rowPrint && allow.print && <button className="btn btn-ghost" onClick={() => rowPrint(viewing)}><Printer className="w-4 h-4" /> Print form</button>}
            <button className="btn btn-ghost" onClick={() => setViewing(null)}>Close</button>
          </>
        }>
        {viewing && (
          <div className="space-y-2.5">
            {viewing.photoUrl ? (
              <div className="flex justify-center mb-3">
                <img src={String(viewing.photoUrl)} alt="" className="w-28 h-28 rounded-xl object-cover border-2 border-emerald-600" />
              </div>
            ) : null}
            <dl className="space-y-2.5">
              {fields.filter((f) => f.key !== "passwordHash").map((f) => (
                <div key={f.key} className="flex justify-between gap-6 text-sm border-b border-gray-50 pb-2">
                  <dt className="text-gray-500 shrink-0">{f.label}</dt>
                  <dd className="text-right font-medium break-all max-w-[60%]">{displayValue(f, viewing)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>

      {/* Change history */}
      <Modal open={!!historyRow} onClose={() => setHistoryRow(null)} title={`Change history — ${singular ?? "record"} #${historyRow?.id ?? ""}`} size="lg"
        footer={<button className="btn btn-ghost" onClick={() => setHistoryRow(null)}>Close</button>}>
        {!auditEntries && <div className="skeleton h-20 w-full" />}
        {auditEntries && auditEntries.length === 0 && <div className="text-center text-sm text-gray-500 py-6">No change history recorded for this record.</div>}
        {auditEntries && auditEntries.length > 0 && (
          <div className="space-y-3">
            {auditEntries.map((a) => (
              <div key={a.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-gray-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge tone={actionTone[a.action] ?? "slate"}>{a.action}</Badge>
                    <span className="text-gray-600 font-medium">{a.userName ?? "System"}</span>
                  </div>
                  <span className="text-gray-400">{String(a.createdAt).slice(0, 16).replace("T", " ")}</span>
                </div>
                {a.changes?.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100">
                        <th className="text-left px-3.5 py-1.5 font-medium">Column</th>
                        <th className="text-left px-3.5 py-1.5 font-medium">Old value</th>
                        <th className="text-left px-3.5 py-1.5 font-medium">New value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.changes.map((c, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="px-3.5 py-1.5 font-medium">{c.field}</td>
                          <td className="px-3.5 py-1.5 text-gray-500">{c.oldValue === null || c.oldValue === undefined || c.oldValue === "" ? "—" : typeof c.oldValue === "object" ? JSON.stringify(c.oldValue) : String(c.oldValue)}</td>
                          <td className="px-3.5 py-1.5 text-emerald-700">{c.newValue === null || c.newValue === undefined || c.newValue === "" ? "—" : typeof c.newValue === "object" ? JSON.stringify(c.newValue) : String(c.newValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog open={!!deleting} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        title={`Delete ${singular ?? "record"}?`} message="This action cannot be undone. The deletion will be recorded in the audit log." confirmText="Delete" danger loading={deleteMutation.isPending} />

      {/* CSV Import */}
      <ImportModal open={importing} onClose={() => setImporting(false)} api={apiBase}
        fields={formFields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required }))}
        title={title} onDone={invalidate} />
    </div>
  );
}
