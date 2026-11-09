"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Plus, Package, Eye, Edit2, Ban, Trash2, History as HistoryIcon, FileDown, UploadCloud } from "lucide-react";
import { PageHeader, Badge, DataTable, EmptyState, LoadingTable, SearchInput, ConfirmDialog, Modal, Field, ListScroll } from "@/components/ui/Breadcrumbs";
import { ExportButtons } from "@/components/ExportButtons";
import { ImportModal } from "@/components/ImportModal";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { downloadCSV } from "@/lib/exports";

type Batch = {
  id: number; batchNo: string; title: string; date: string; fund: string; status: string;
  voucherNo: string | null; voucherType: string | null; notes: string | null;
  assignedCount?: number; resultsCount?: number;
};
type AuditEntry = { id: number; userName: string | null; action: string; changes: { field: string; oldValue: unknown; newValue: unknown }[]; createdAt: string };

function BatchesInner() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const allowCreate = can("donations.disbursements", "create");
  const allowEdit = can("donations.disbursements", "edit");
  const allowDelete = can("donations.disbursements", "delete");
  const allowPrint = can("donations.disbursements", "print");
  const allowCancel = can("donations.disbursements", "cancel") || allowEdit;

  const [editing, setEditing] = useState<Batch | null>(null);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [cancelling, setCancelling] = useState<Batch | null>(null);
  const [historyRow, setHistoryRow] = useState<Batch | null>(null);
  const [importing, setImporting] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">("landscape");

  const { data, isLoading } = useQuery<Batch[]>({
    queryKey: ["batches", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "500" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/donations/disbursements/batches?${params}`, { credentials: "include" });
      return (await res.json()).data;
    },
  });

  const { data: auditEntries } = useQuery<AuditEntry[]>({
    queryKey: ["batch-audit", historyRow?.id],
    enabled: !!historyRow,
    queryFn: async () => (await (await fetch(`/api/administration/audit?module=donations.disbursements&recordId=${historyRow!.id}`, { credentials: "include" })).json()).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["batches"] });

  const editMut = useMutation({
    mutationFn: async (b: Batch) => {
      const res = await fetch(`/api/donations/disbursements/batches?id=${b.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: b.title, date: b.date, fund: b.fund, notes: b.notes }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setEditing(null); toast.push({ title: "Batch updated" }); },
    onError: () => toast.push({ title: "Update failed", tone: "error" }),
  });

  const cancelMut = useMutation({
    mutationFn: async (b: Batch) => {
      const res = await fetch(`/api/donations/disbursements/batches/${b.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setCancelling(null); toast.push({ title: "Batch cancelled", tone: "info" }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (b: Batch) => {
      const res = await fetch(`/api/donations/disbursements/batches?id=${b.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.push({ title: "Batch deleted", tone: "info" }); },
  });

  const downloadTemplate = () =>
    downloadCSV("disbursement-batch-import-template", [
      "batchNo", "title", "date", "fund", "voucherType", "notes",
    ].map((k) => ({ key: k, label: k })), []);

  const exportCols = [
    { key: "batchNo", label: "Batch #" }, { key: "title", label: "Title" }, { key: "date", label: "Date" },
    { key: "fund", label: "Fund" }, { key: "voucherNo", label: "Voucher #" }, { key: "status", label: "Status" },
  ];

  return (
    <div>
      <PageHeader
        title="Disbursement Batches"
        subtitle="Payments to donees — donor receipt reference, workflow and auto payment voucher"
        actions={
          <div className="flex gap-2 flex-wrap justify-end">
            <button className="btn btn-ghost" onClick={downloadTemplate}><FileDown className="w-4 h-4" /> CSV Format</button>
            <button className="btn btn-ghost" onClick={() => setImporting(true)}><UploadCloud className="w-4 h-4" /> Import CSV</button>
            {allowCreate && <Link href="/donations/disbursements/new" className="btn btn-primary"><Plus className="w-4 h-4" /> New Batch</Link>}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search batch # or title..." />
        {allowPrint && data && data.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button className={`px-2.5 py-1.5 text-xs font-semibold transition ${printOrientation === "portrait" ? "bg-[#0e3b2e] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`} onClick={() => setPrintOrientation("portrait")}>▯ Portrait</button>
              <button className={`px-2.5 py-1.5 text-xs font-semibold transition ${printOrientation === "landscape" ? "bg-[#0e3b2e] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`} onClick={() => setPrintOrientation("landscape")}>▭ Landscape</button>
            </div>
            <ExportButtons filename="disbursement-batches" title="Disbursement Batches" columns={exportCols} rows={data as unknown as Record<string, unknown>[]} signatures={["Prepared By", "Approved By"]} orientation={printOrientation} />
          </div>
        )}
      </div>

      {isLoading && <LoadingTable rows={6} cols={6} />}

      {data && (
        <ListScroll>
          <DataTable bare
            columns={[
              { key: "batchNo", label: "Batch #", render: (r) => <Link href={`/donations/disbursements/batches/${(r as Batch).id}`} className="text-emerald-700 font-mono hover:underline">{(r as Batch).batchNo}</Link> },
              { key: "title", label: "Title" },
              { key: "date", label: "Date" },
              { key: "fund", label: "Fund", render: (r) => <Badge tone="sky">{(r as Batch).fund}</Badge> },
              { key: "voucherNo", label: "Voucher", render: (r) => (r as Batch).voucherNo ? <Badge tone="violet">{(r as Batch).voucherNo}</Badge> : <span className="text-xs text-gray-400">{(r as Batch).voucherType ? `${(r as Batch).voucherType} (on payment)` : "—"}</span> },
              {
                key: "status", label: "Status", render: (r) => {
                  const s = (r as Batch).status;
                  return <Badge tone={s === "paid" ? "emerald" : s === "approved" ? "sky" : s === "cancelled" ? "rose" : "slate"}>{s}</Badge>;
                },
              },
              {
                key: "_act", label: "Actions", className: "w-36 text-right", render: (row) => {
                  const b = row as Batch;
                  return (
                    <div className="flex gap-0.5 justify-end">
                      <Link href={`/donations/disbursements/batches/${b.id}`} className="p-1.5 rounded hover:bg-sky-50 text-gray-400 hover:text-sky-600" title="View"><Eye className="w-3.5 h-3.5" /></Link>
                      {allowEdit && <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-900" onClick={() => setEditing({ ...b })} title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>}
                      <button className="p-1.5 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600" onClick={() => setHistoryRow(b)} title="Change history"><HistoryIcon className="w-3.5 h-3.5" /></button>
                      {allowCancel && b.status !== "cancelled" && b.status !== "paid" && <button className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600" onClick={() => setCancelling(b)} title="Cancel"><Ban className="w-3.5 h-3.5" /></button>}
                      {allowDelete && <button className="p-1.5 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600" onClick={() => setDeleting(b)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  );
                },
              },
            ]}
            rows={data as unknown as Record<string, unknown>[]}
            empty={<EmptyState title="No batches yet" icon={<Package className="w-10 h-10" />} action={allowCreate ? <Link href="/donations/disbursements/new" className="btn btn-primary"><Plus className="w-4 h-4" /> New Batch</Link> : undefined} />}
          />
        </ListScroll>
      )}

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit batch ${editing?.batchNo ?? ""}`} size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={editMut.isPending || !editing} onClick={() => editing && editMut.mutate(editing)}>{editMut.isPending ? "Saving..." : "Save"}</button>
          </>
        }>
        {editing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Title"><input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field></div>
            <Field label="Batch Date"><input type="date" className="input" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
            <Field label="Fund / Program">
              <select className="input" value={editing.fund} onChange={(e) => setEditing({ ...editing, fund: e.target.value })}>
                <option value="general">General</option><option value="zakat">Zakat</option><option value="sadaqah">Sadaqah</option>
                <option value="orphan">Orphan Care</option><option value="ration">Ration</option>
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="Notes"><textarea className="input" rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value || null })} /></Field></div>
          </div>
        )}
      </Modal>

      {/* History modal */}
      <Modal open={!!historyRow} onClose={() => setHistoryRow(null)} title={`Change history — ${historyRow?.batchNo ?? ""}`} size="lg"
        footer={<button className="btn btn-ghost" onClick={() => setHistoryRow(null)}>Close</button>}>
        {!auditEntries && <div className="skeleton h-20 w-full" />}
        {auditEntries && auditEntries.length === 0 && <div className="text-center text-sm text-gray-500 py-6">No change history for this batch.</div>}
        {auditEntries && auditEntries.length > 0 && (
          <div className="space-y-3">
            {auditEntries.map((a) => (
              <div key={a.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="px-3.5 py-2 bg-gray-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><Badge tone={a.action === "create" ? "emerald" : a.action === "delete" ? "rose" : a.action === "cancel" ? "rose" : "amber"}>{a.action}</Badge><span className="text-gray-600 font-medium">{a.userName ?? "System"}</span></div>
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
        title="Cancel batch?" message={`${cancelling?.batchNo} will be cancelled. Recorded in the audit log.`} confirmText="Cancel batch" danger loading={cancelMut.isPending} />
      <ConfirmDialog open={!!deleting} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting)}
        title="Delete batch?" message="This removes the batch and all its lines." confirmText="Delete" danger loading={deleteMut.isPending} />

      <ImportModal open={importing} onClose={() => setImporting(false)} api="/api/donations/disbursements/batches"
        fields={[
          { key: "batchNo", label: "Batch #", type: "text" }, { key: "title", label: "Title", type: "text" },
          { key: "date", label: "Date", type: "text" }, { key: "fund", label: "Fund", type: "text" },
          { key: "voucherType", label: "Voucher Type", type: "text" }, { key: "notes", label: "Notes", type: "text" },
        ]}
        title="Disbursement Batches" onDone={invalidate} />
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="donations.disbursements">
      <BatchesInner />
    </RequireAccess>
  );
}
