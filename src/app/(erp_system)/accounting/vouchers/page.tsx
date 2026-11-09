"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Plus, Eye, Ban, Trash2, History as HistoryIcon, Printer, UploadCloud, FileDown, Edit2, BookOpen } from "lucide-react";
import { PageHeader, Badge, DataTable, EmptyState, LoadingTable, SearchInput, ConfirmDialog, Modal, Field, ListScroll } from "@/components/ui/Breadcrumbs";
import { ExportButtons } from "@/components/ExportButtons";
import { ImportModal } from "@/components/ImportModal";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { printVoucherA4, downloadCSV } from "@/lib/exports";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";

type Voucher = { id: number; voucherNo: string; date: string; type: string; narration: string | null; totalAmount: string; status: string | null; postedByName: string | null };
type AuditEntry = { id: number; userName: string | null; action: string; changes: { field: string; oldValue: unknown; newValue: unknown }[]; createdAt: string };

const typeTone: Record<string, "emerald" | "rose" | "sky" | "slate" | "amber" | "violet"> = {
  CRV: "emerald", BRV: "sky", CPV: "rose", BPV: "amber", JV: "violet", CV: "slate",
};

function VouchersInner() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const allowCreate = can("accounting.vouchers", "create");
  const allowEdit = can("accounting.vouchers", "edit");
  const allowDelete = can("accounting.vouchers", "delete");
  const allowPrint = can("accounting.vouchers", "print");
  const allowImport = can("accounting.vouchers", "import");

  const [editing, setEditing] = useState<Voucher | null>(null);
  const [cancelling, setCancelling] = useState<Voucher | null>(null);
  const [deleting, setDeleting] = useState<Voucher | null>(null);
  const [historyRow, setHistoryRow] = useState<Voucher | null>(null);
  const [importing, setImporting] = useState(false);
  const [printBusy, setPrintBusy] = useState<number | null>(null);

  const { data, isLoading } = useQuery<Voucher[]>({
    queryKey: ["vouchers", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "500" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/accounting/vouchers?${params}`, { credentials: "include" });
      return (await res.json()).data;
    },
  });

  const { data: auditEntries } = useQuery<AuditEntry[]>({
    queryKey: ["voucher-audit", historyRow?.id],
    enabled: !!historyRow,
    queryFn: async () => (await (await fetch(`/api/administration/audit?module=accounting.vouchers&recordId=${historyRow!.id}`, { credentials: "include" })).json()).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["vouchers"] });

  const editMut = useMutation({
    mutationFn: async (v: Voucher) => {
      const res = await fetch(`/api/accounting/vouchers?id=${v.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ date: v.date, narration: v.narration }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setEditing(null); toast.push({ title: "Voucher updated", desc: "Change logged." }); },
    onError: () => toast.push({ title: "Update failed", tone: "error" }),
  });

  const cancelMut = useMutation({
    mutationFn: async (v: Voucher) => {
      const res = await fetch(`/api/accounting/vouchers?id=${v.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setCancelling(null); toast.push({ title: "Voucher cancelled", desc: "Excluded from financial statements.", tone: "info" }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (v: Voucher) => {
      const res = await fetch(`/api/accounting/vouchers?id=${v.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.push({ title: "Voucher deleted", tone: "info" }); },
  });

  async function quickPrint(v: Voucher) {
    setPrintBusy(v.id);
    try {
      const res = await fetch(`/api/accounting/vouchers/${v.id}`, { credentials: "include" });
      const d = (await res.json()).data;
      printVoucherA4({
        voucherNo: d.voucherNo,
        typeLabel: d.typeLabel ?? d.type,
        date: d.date,
        narration: d.narration ?? "",
        postedByName: d.postedByName ?? undefined,
        total: Number(d.totalAmount),
        lines: (d.lines ?? []).map((l: any) => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          narration: l.narration,
          debit: Number(l.debit),
          credit: Number(l.credit),
          distributions: (d.distributions ?? [])
            .filter((x: any) => x.lineId === l.id)
            .map((x: any) => ({ costCenterName: x.costCenterName ?? "—", percent: Number(x.percent), amount: Number(x.amount) })),
        })),
      });
    } finally {
      setPrintBusy(null);
    }
  }

  const downloadTemplate = () =>
    downloadCSV("voucher-import-template", [
      "voucherNo", "type", "date", "narration", "accountCode", "debit", "credit", "partnerType", "partnerId", "costCenterId", "distributions",
    ].map((k) => ({ key: k, label: k })), []);

  const exportCols = [
    { key: "voucherNo", label: "Voucher #" }, { key: "date", label: "Date" }, { key: "type", label: "Type" },
    { key: "narration", label: "Narration" }, { key: "totalAmount", label: "Amount (PKR)" }, { key: "status", label: "Status" }, { key: "postedByName", label: "Posted By" },
  ];

  return (
    <div>
      <PageHeader
        title="Vouchers"
        subtitle="Double-entry vouchers — select type first, balanced debit/credit entry"
        actions={
          <div className="flex gap-2 flex-wrap justify-end">
            <button className="btn btn-ghost" onClick={downloadTemplate}><FileDown className="w-4 h-4" /> CSV Format</button>
            {allowImport && <button className="btn btn-ghost" onClick={() => setImporting(true)}><UploadCloud className="w-4 h-4" /> Import CSV</button>}
            {allowCreate && <Link href="/accounting/vouchers/new" className="btn btn-primary"><Plus className="w-4 h-4" /> New Voucher</Link>}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search voucher #, type, narration..." />
        {allowPrint && data && data.length > 0 && (
          <ExportButtons filename="vouchers" title="Voucher Register" columns={exportCols} rows={data as unknown as Record<string, unknown>[]} totalColumn="totalAmount" signatures={["Accountant", "Finance Manager"]} />
        )}
      </div>

      {isLoading && <LoadingTable rows={8} cols={6} />}

      {data && (
        <ListScroll>
          <DataTable bare
            columns={[
              { key: "voucherNo", label: "Voucher #", render: (r) => <Link href={`/accounting/vouchers/${(r as Voucher).id}`} className="text-emerald-700 font-mono hover:underline">{(r as Voucher).voucherNo}</Link> },
              { key: "date", label: "Date" },
              { key: "type", label: "Type", render: (r) => { const t = (r as Voucher).type as VoucherType; return <Badge tone={typeTone[t] ?? "slate"}>{t} · {VOUCHER_TYPES[t]?.label.split(" ")[0] ?? ""}</Badge>; } },
              { key: "narration", label: "Narration", render: (r) => <span className="text-sm text-gray-600">{((r as Voucher).narration ?? "").slice(0, 55)}</span> },
              { key: "totalAmount", label: "Amount", render: (r) => <span className="font-semibold">{Number((r as Voucher).totalAmount).toLocaleString()}</span> },
              { key: "status", label: "Status", render: (r) => <Badge tone={(r as Voucher).status === "cancelled" ? "rose" : "emerald"}>{(r as Voucher).status ?? "posted"}</Badge> },
              {
                key: "_act", label: "Actions", className: "w-40 text-right", render: (row) => {
                  const v = row as Voucher;
                  return (
                    <div className="flex gap-0.5 justify-end">
                      <Link href={`/accounting/vouchers/${v.id}`} className="p-1.5 rounded hover:bg-sky-50 text-gray-400 hover:text-sky-600" title="View"><Eye className="w-3.5 h-3.5" /></Link>
                      {allowPrint && <button className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 disabled:opacity-40" disabled={printBusy === v.id} onClick={() => quickPrint(v)} title="Print A4 (totals, words, page #)"><Printer className="w-3.5 h-3.5" /></button>}
                      {allowEdit && <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-900" onClick={() => setEditing({ ...v })} title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>}
                      <button className="p-1.5 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600" onClick={() => setHistoryRow(v)} title="Change history"><HistoryIcon className="w-3.5 h-3.5" /></button>
                      {allowEdit && v.status !== "cancelled" && <button className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600" onClick={() => setCancelling(v)} title="Cancel voucher"><Ban className="w-3.5 h-3.5" /></button>}
                      {allowDelete && <button className="p-1.5 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600" onClick={() => setDeleting(v)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  );
                },
              },
            ]}
            rows={data as unknown as Record<string, unknown>[]}
            empty={<EmptyState title="No vouchers yet" description="Post your first double-entry voucher." icon={<BookOpen className="w-10 h-10 mx-auto" />} action={allowCreate ? <Link href="/accounting/vouchers/new" className="btn btn-primary"><Plus className="w-4 h-4" /> New Voucher</Link> : undefined} />}
          />
        </ListScroll>
      )}

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${editing?.voucherNo ?? ""}`} size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={editMut.isPending || !editing} onClick={() => editing && editMut.mutate(editing)}>{editMut.isPending ? "Saving..." : "Save"}</button>
          </>
        }>
        {editing && (
          <div className="grid grid-cols-1 gap-4">
            <Field label="Date"><input type="date" className="input" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
            <Field label="Narration"><textarea className="input" rows={3} value={editing.narration ?? ""} onChange={(e) => setEditing({ ...editing, narration: e.target.value || null })} /></Field>
            <p className="text-xs text-gray-500">Entry lines are immutable after posting (audit trail). To correct, cancel this voucher and post a new one.</p>
          </div>
        )}
      </Modal>

      {/* History modal */}
      <Modal open={!!historyRow} onClose={() => setHistoryRow(null)} title={`Change history — ${historyRow?.voucherNo ?? ""}`} size="lg"
        footer={<button className="btn btn-ghost" onClick={() => setHistoryRow(null)}>Close</button>}>
        {!auditEntries && <div className="skeleton h-20 w-full" />}
        {auditEntries && auditEntries.length === 0 && <div className="text-center text-sm text-gray-500 py-6">No change history for this voucher.</div>}
        {auditEntries && auditEntries.length > 0 && (
          <div className="space-y-3">
            {auditEntries.map((a) => (
              <div key={a.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-gray-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><Badge tone={a.action === "create" ? "emerald" : a.action === "delete" || a.action === "cancel" ? "rose" : "amber"}>{a.action}</Badge><span className="text-gray-600 font-medium">{a.userName ?? "System"}</span></div>
                  <span className="text-gray-400">{String(a.createdAt).slice(0, 16).replace("T", " ")}</span>
                </div>
                {a.changes?.length > 0 && (
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left px-3.5 py-1.5 font-medium">Column</th><th className="text-left px-3.5 py-1.5 font-medium">Old</th><th className="text-left px-3.5 py-1.5 font-medium">New</th></tr></thead>
                    <tbody>
                      {a.changes.map((c, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="px-3.5 py-1.5 font-medium">{c.field}</td>
                          <td className="px-3.5 py-1.5 text-gray-500">{c.oldValue === null || c.oldValue === "" ? "—" : String(c.oldValue)}</td>
                          <td className="px-3.5 py-1.5 text-emerald-700">{c.newValue === null || c.newValue === "" ? "—" : String(c.newValue)}</td>
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

      <ConfirmDialog open={!!cancelling} onCancel={() => setCancelling(null)} onConfirm={() => cancelling && cancelMut.mutate(cancelling)}
        title="Cancel voucher?" message={`${cancelling?.voucherNo} will be cancelled and excluded from all financial statements. This is recorded in the audit log.`} confirmText="Cancel voucher" danger loading={cancelMut.isPending} />
      <ConfirmDialog open={!!deleting} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting)}
        title="Delete voucher?" message="This permanently removes the voucher and its entry lines." confirmText="Delete" danger loading={deleteMut.isPending} />

      <ImportModal open={importing} onClose={() => setImporting(false)} api="/api/accounting/vouchers"
        fields={[
          { key: "voucherNo", label: "Voucher #" }, { key: "type", label: "Type (CRV/CPV/BRV/BPV/JV/CV)" }, { key: "date", label: "Date" },
          { key: "narration", label: "Narration" }, { key: "accountCode", label: "Account Code" }, { key: "debit", label: "Debit", type: "number" },
          { key: "credit", label: "Credit", type: "number" }, { key: "partnerType", label: "Partner Type" }, { key: "partnerId", label: "Partner ID", type: "number" },
          { key: "costCenterId", label: "Cost Center ID", type: "number" }, { key: "distributions", label: "Distributions (ccId:pct;ccId:pct)" },
        ]}
        title="Vouchers (grouped by voucher no)" onDone={invalidate} />
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="accounting.vouchers">
      <VouchersInner />
    </RequireAccess>
  );
}
