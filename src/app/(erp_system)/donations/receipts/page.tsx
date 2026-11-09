"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Plus, Eye, Edit2, Ban, Trash2, History as HistoryIcon, Mail, Printer, FileDown, Lock, UploadCloud } from "lucide-react";
import { PageHeader, Badge, DataTable, EmptyState, LoadingTable, SearchInput, ConfirmDialog, Modal, Field, ListScroll } from "@/components/ui/Breadcrumbs";
import { ExportButtons } from "@/components/ExportButtons";
import { ImportModal } from "@/components/ImportModal";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { printA4, downloadCSV } from "@/lib/exports";

const fmtPKR = (n: unknown) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number(n));

type Receipt = {
  id: number; receiptNo: string; receiptDate: string; donationDate: string; donorId: number | null; donorName: string | null;
  totalAmount: string; instrumentNo: string | null; voucherNo: string | null; remarks: string | null;
  restrictUseInFund: boolean; status: string | null;
};
type AuditEntry = { id: number; userName: string | null; action: string; changes: { field: string; oldValue: unknown; newValue: unknown }[]; createdAt: string };

function ReceiptsInner() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const allowCreate = can("donations.receipts", "create");
  const allowEdit = can("donations.receipts", "edit");
  const allowDelete = can("donations.receipts", "delete");
  const allowPrint = can("donations.receipts", "print");
  const allowCancel = can("donations.receipts", "cancel") || allowEdit;

  const [editing, setEditing] = useState<Receipt | null>(null);
  const [deleting, setDeleting] = useState<Receipt | null>(null);
  const [cancelling, setCancelling] = useState<Receipt | null>(null);
  const [historyRow, setHistoryRow] = useState<Receipt | null>(null);
  const [printBusy, setPrintBusy] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">("landscape");

  const { data, isLoading } = useQuery<Receipt[]>({
    queryKey: ["receipts", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "500" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/donations/receipts?${params}`, { credentials: "include" });
      return (await res.json()).data;
    },
  });

  const { data: donors } = useQuery({
    queryKey: ["donors-opts-r"],
    queryFn: async () => (await (await fetch("/api/donations/donors?limit=500", { credentials: "include" })).json()).data,
  });

  const { data: auditEntries } = useQuery<AuditEntry[]>({
    queryKey: ["receipt-audit", historyRow?.id],
    enabled: !!historyRow,
    queryFn: async () => (await (await fetch(`/api/administration/audit?module=donations.receipts&recordId=${historyRow!.id}`, { credentials: "include" })).json()).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["receipts"] });

  const editMut = useMutation({
    mutationFn: async (r: Receipt) => {
      const res = await fetch(`/api/donations/receipts/${r.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ receiptDate: r.receiptDate, donationDate: r.donationDate, donorId: r.donorId || null, instrumentNo: r.instrumentNo, remarks: r.remarks, restrictUseInFund: r.restrictUseInFund }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
    },
    onSuccess: () => { invalidate(); setEditing(null); toast.push({ title: "Receipt updated", desc: "Changes logged in audit." }); },
    onError: (e: Error) => toast.push({ title: "Update failed", desc: e.message, tone: "error" }),
  });

  const cancelMut = useMutation({
    mutationFn: async (r: Receipt) => {
      const res = await fetch(`/api/donations/receipts/${r.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setCancelling(null); toast.push({ title: "Receipt cancelled", tone: "info" }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (r: Receipt) => {
      const res = await fetch(`/api/donations/receipts/${r.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.push({ title: "Receipt deleted", tone: "info" }); },
  });

  async function quickPrintA4(r: Receipt) {
    setPrintBusy(r.id);
    try {
      const res = await fetch(`/api/donations/receipts/${r.id}`, { credentials: "include" });
      const d = (await res.json()).data;
      printA4({
        title: `Donation Receipt — ${d.receiptNo}`,
        subtitle: `Receipt date ${d.receiptDate} • Donation date ${d.donationDate}`,
        kv: [
          { label: "Donor", value: d.donorName ?? "Anonymous" },
          { label: "Instrument", value: d.instrumentNo ?? "—" },
          { label: "Voucher Ref", value: d.voucherNo ?? "—" },
          { label: "Restrict use in fund", value: d.restrictUseInFund ? "YES" : "No" },
        ],
        columns: [
          { key: "serialNo", label: "S#" }, { key: "doneeName", label: "Donee" }, { key: "categoryName", label: "Fund" },
          { key: "amount", label: "Amount (PKR)" }, { key: "fromDate", label: "From" }, { key: "toDate", label: "To" },
        ],
        rows: (d.lines ?? []).map((l: Record<string, unknown>) => ({ ...l, amount: Number(l.amount) })),
        totalColumn: "amount",
        signatures: ["Received By", "Donor Signature", "Authorized Signatory"],
        orientation: printOrientation,
      });
    } finally {
      setPrintBusy(null);
    }
  }

  const downloadTemplate = () =>
    downloadCSV("donation-receipt-import-template", [
      "receiptNo", "receiptDate", "donationDate", "donorId", "totalAmount", "restrictUseInFund", "instrumentNo", "instrumentDate", "voucherType", "remarks",
    ].map((k) => ({ key: k, label: k })), []);

  const exportCols = [
    { key: "receiptNo", label: "Receipt #" }, { key: "receiptDate", label: "Receipt Date" }, { key: "donationDate", label: "Donation Date" },
    { key: "donorName", label: "Donor" }, { key: "instrumentNo", label: "Instrument #" }, { key: "totalAmount", label: "Amount (PKR)" },
    { key: "voucherNo", label: "Voucher #" }, { key: "status", label: "Status" },
  ];

  return (
    <div>
      <PageHeader
        title="Donation Receipts"
        subtitle="Master + detail receipts — email to donor with PDF, A4 print, full audit"
        actions={
          <div className="flex gap-2 flex-wrap justify-end">
            <button className="btn btn-ghost" onClick={downloadTemplate}><FileDown className="w-4 h-4" /> CSV Format</button>
            <button className="btn btn-ghost" onClick={() => setImporting(true)}><UploadCloud className="w-4 h-4" /> Import CSV</button>
            {allowCreate && <Link href="/donations/receipts/new" className="btn btn-primary"><Plus className="w-4 h-4" /> New Receipt</Link>}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search receipt #, instrument #, remarks..." />
        {allowPrint && data && data.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden" title="Print / PDF page orientation">
              <button className={`px-2.5 py-1.5 text-xs font-semibold transition ${printOrientation === "portrait" ? "bg-[#0e3b2e] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`} onClick={() => setPrintOrientation("portrait")}>▯ Portrait</button>
              <button className={`px-2.5 py-1.5 text-xs font-semibold transition ${printOrientation === "landscape" ? "bg-[#0e3b2e] text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`} onClick={() => setPrintOrientation("landscape")}>▭ Landscape</button>
            </div>
            <ExportButtons filename="donation-receipts" title="Donation Receipts" columns={exportCols} rows={data as unknown as Record<string, unknown>[]} totalColumn="totalAmount" signatures={["Prepared By", "Checked By", "Approved By"]} orientation={printOrientation} />
          </div>
        )}
      </div>

      {isLoading && <LoadingTable rows={8} cols={7} />}

      {data && (
        <ListScroll>
          <DataTable
            bare
            columns={[
              { key: "receiptNo", label: "Receipt #", render: (r) => <Link href={`/donations/receipts/${(r as Receipt).id}`} className="text-emerald-700 font-mono hover:underline">{(r as Receipt).receiptNo}</Link> },
              { key: "receiptDate", label: "Receipt Date" },
              { key: "donationDate", label: "Donation Date" },
              { key: "donorName", label: "Donor", render: (r) => <span className="font-medium">{(r as Receipt).donorName ?? "—"}</span> },
              { key: "totalAmount", label: "Amount", render: (r) => <span className="font-semibold">{fmtPKR((r as Receipt).totalAmount)}</span> },
              { key: "voucherNo", label: "Voucher", render: (r) => (r as Receipt).voucherNo ? <Badge tone="violet">{(r as Receipt).voucherNo}</Badge> : <span className="text-gray-400 text-xs">—</span> },
              {
                key: "status", label: "Status", render: (r) => {
                  const st = (r as Receipt).status ?? "active";
                  return <Badge tone={st === "cancelled" ? "rose" : "emerald"}>{st}</Badge>;
                },
              },
              {
                key: "_act", label: "Actions", className: "w-44 text-right", render: (row) => {
                  const r = row as Receipt;
                  return (
                    <div className="flex gap-0.5 justify-end">
                      <Link href={`/donations/receipts/${r.id}`} className="p-1.5 rounded hover:bg-sky-50 text-gray-400 hover:text-sky-600" title="View + email + print"><Eye className="w-3.5 h-3.5" /></Link>
                      <Link href={`/donations/receipts/${r.id}`} className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600" title="Email to donor"><Mail className="w-3.5 h-3.5" /></Link>
                      {allowPrint && <button className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 disabled:opacity-40" disabled={printBusy === r.id} onClick={() => quickPrintA4(r)} title="Print A4"><Printer className="w-3.5 h-3.5" /></button>}
                      {allowEdit && <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-900" onClick={() => setEditing({ ...r })} title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>}
                      <button className="p-1.5 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600" onClick={() => setHistoryRow(r)} title="Change history"><HistoryIcon className="w-3.5 h-3.5" /></button>
                      {allowCancel && r.status !== "cancelled" && <button className="p-1.5 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600" onClick={() => setCancelling(r)} title="Cancel receipt"><Ban className="w-3.5 h-3.5" /></button>}
                      {allowDelete && <button className="p-1.5 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600" onClick={() => setDeleting(r)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  );
                },
              },
            ]}
            rows={data as unknown as Record<string, unknown>[]}
            onRowClick={(r) => { /* row click opens view via link */ void r; }}
            empty={<EmptyState title="No receipts yet" description="Create a receipt with detail lines — monthly distribution generates automatically." action={allowCreate ? <Link href="/donations/receipts/new" className="btn btn-primary"><Plus className="w-4 h-4" /> New Receipt</Link> : undefined} />}
          />
        </ListScroll>
      )}

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit receipt ${editing?.receiptNo ?? ""}`} size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={editMut.isPending || !editing} onClick={() => editing && editMut.mutate(editing)}>{editMut.isPending ? "Saving..." : "Save changes"}</button>
          </>
        }>
        {editing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Receipt Date"><input type="date" className="input" value={editing.receiptDate} onChange={(e) => setEditing({ ...editing, receiptDate: e.target.value })} /></Field>
            <Field label="Donation Date"><input type="date" className="input" value={editing.donationDate} onChange={(e) => setEditing({ ...editing, donationDate: e.target.value })} /></Field>
            <Field label="Donor">
              <select className="input" value={String(editing.donorId ?? "")} onChange={(e) => setEditing({ ...editing, donorId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {(donors as { id: number; name: string }[] | undefined)?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Instrument No"><input className="input" value={editing.instrumentNo ?? ""} onChange={(e) => setEditing({ ...editing, instrumentNo: e.target.value || null })} /></Field>
            <div className="sm:col-span-2"><Field label="Remarks"><textarea className="input" rows={2} value={editing.remarks ?? ""} onChange={(e) => setEditing({ ...editing, remarks: e.target.value || null })} /></Field></div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-emerald-600" checked={!!editing.restrictUseInFund} onChange={(e) => setEditing({ ...editing, restrictUseInFund: e.target.checked })} />
              <span className="text-sm flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-amber-500" /> Restrict use in fund</span>
            </label>
          </div>
        )}
      </Modal>

      {/* History modal */}
      <Modal open={!!historyRow} onClose={() => setHistoryRow(null)} title={`Change history — ${historyRow?.receiptNo ?? ""}`} size="lg"
        footer={<button className="btn btn-ghost" onClick={() => setHistoryRow(null)}>Close</button>}>
        {!auditEntries && <div className="skeleton h-20 w-full" />}
        {auditEntries && auditEntries.length === 0 && <div className="text-center text-sm text-gray-500 py-6">No change history for this receipt.</div>}
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
        title="Cancel receipt?" message={`${cancelling?.receiptNo} will be marked cancelled and excluded from donor totals. This is recorded in the audit log.`} confirmText="Cancel receipt" danger loading={cancelMut.isPending} />
      <ConfirmDialog open={!!deleting} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting)}
        title="Delete receipt?" message="This permanently removes the receipt and its detail lines." confirmText="Delete" danger loading={deleteMut.isPending} />
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="donations.receipts">
      <ReceiptsInner />
    </RequireAccess>
  );
}
