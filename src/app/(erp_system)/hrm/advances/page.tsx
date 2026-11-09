"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Check, FileText, ShieldAlert, ReceiptText } from "lucide-react";
import { PageHeader, Badge, Modal, Field, LoadingTable, ListScroll, ConfirmDialog } from "@/components/ui/Breadcrumbs";
import { ImportModal } from "@/components/ImportModal";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { downloadCSV } from "@/lib/exports";
import { VoucherViewDialog } from "@/components/VoucherViewDialog";
import { ADVANCE_TYPES } from "@/lib/options";

type Adv = {
  id: number; employeeId: number; employeeName: string | null; employeeSalary: string | null;
  amount: string; purpose: string | null; date: string; status: string; advanceType: string;
  approvedByName: string | null; approvedAt: string | null; voucherNo: string | null;
};

function AdvancesInner() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const allowCreate = can("hrm.advances", "create");
  const allowApprove = can("hrm.advances", "edit"); // HR / administrative authority (per rights)
  const [adding, setAdding] = useState(false);
  const [approving, setApproving] = useState<Adv | null>(null);
  const [viewVoucher, setViewVoucher] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({ employeeId: "", amount: "", advanceType: "for-month", date: new Date().toISOString().slice(0, 10), purpose: "" });

  const { data, isLoading } = useQuery<{ rows: Adv[]; policies: { advanceMidMonthPct: number } }>({
    queryKey: ["advances"],
    queryFn: async () => {
      const j = await (await fetch("/api/hrm/advances?limit=500", { credentials: "include" })).json();
      return { rows: j.data, policies: j.meta?.policies ?? { advanceMidMonthPct: 50 } };
    },
  });
  const { data: employees } = useQuery({
    queryKey: ["employees-opts-adv"],
    queryFn: async () => (await (await fetch("/api/hrm/employees?limit=500", { credentials: "include" })).json()).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["advances"] });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/hrm/advances", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ ...form, employeeId: Number(form.employeeId), amount: Number(form.amount) }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
    },
    onSuccess: () => { invalidate(); setAdding(false); setForm({ employeeId: "", amount: "", advanceType: "for-month", date: new Date().toISOString().slice(0, 10), purpose: "" }); toast.push({ title: "Advance requested", desc: "Pending approval by HR / administrative authority." }); },
    onError: (e: Error) => toast.push({ title: "Request rejected by policy", desc: e.message, tone: "error" }),
  });

  const approveMut = useMutation({
    mutationFn: async (a: Adv) => {
      const res = await fetch(`/api/hrm/advances?id=${a.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "approved" }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      return j.data;
    },
    onSuccess: (d) => { invalidate(); setApproving(null); toast.push({ title: "Advance approved", desc: d.voucherNo ? `Payment voucher ${d.voucherNo} posted (double entry).` : undefined }); },
    onError: (e: Error) => toast.push({ title: "Approval failed", desc: e.message, tone: "error" }),
  });

  const downloadTemplate = () =>
    downloadCSV("advances-import-template", ["employeeId", "advanceType", "amount", "date", "purpose"].map((k) => ({ key: k, label: k })), []);

  return (
    <div>
      <PageHeader
        title="Advances"
        subtitle="Salary advances — policy-enforced limits, approval by HR / administrative authority, auto payment voucher"
        actions={
          <div className="flex gap-2 flex-wrap justify-end">
            <button className="btn btn-ghost" onClick={downloadTemplate}>CSV Format</button>
            <button className="btn btn-ghost" onClick={() => setImporting(true)}>Import CSV</button>
            {allowCreate && <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Request advance</button>}
          </div>
        }
      />

      <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <b>Advance policy (auto-enforced):</b> an advance cannot exceed the monthly salary; after the 15th of the month only {data?.policies.advanceMidMonthPct ?? 50}% of salary is allowed.
          During probation, advances are limited to pro-rata attended days. <b>Approval</b> is restricted to HR / administrative authority (per the rights given on this module) — approving posts a double-entry payment voucher (Dr Staff Advances, Cr Cash).
        </div>
      </div>

      {isLoading && <LoadingTable rows={6} cols={8} />}

      {data && (
        <ListScroll>
          <table className="table">
            <thead>
              <tr><th>Employee</th><th>Type</th><th className="text-right">Amount</th><th>Date</th><th>Purpose</th><th>Status</th><th>Approved By</th><th>Voucher</th><th className="w-28 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {data.rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="font-medium">{a.employeeName ?? `#${a.employeeId}`}</div>
                    <div className="text-xs text-gray-400">salary {Number(a.employeeSalary ?? 0).toLocaleString()}</div>
                  </td>
                  <td><Badge tone={a.advanceType === "against-salary" ? "sky" : "slate"}>{a.advanceType === "against-salary" ? "Against salary" : "For the month"}</Badge></td>
                  <td className="text-right font-semibold">{Number(a.amount).toLocaleString()}</td>
                  <td className="text-xs">{a.date}</td>
                  <td className="text-xs text-gray-500 max-w-40 truncate" title={a.purpose ?? ""}>{a.purpose ?? "—"}</td>
                  <td><Badge tone={a.status === "approved" ? "emerald" : a.status === "settled" ? "sky" : "amber"}>{a.status}</Badge></td>
                  <td className="text-xs">{a.approvedByName ? <span>{a.approvedByName}<div className="text-gray-400">{String(a.approvedAt ?? "").slice(0, 10)}</div></span> : <span className="text-gray-300">—</span>}</td>
                  <td>
                    {a.voucherNo ? (
                      <button className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline" onClick={() => setViewVoucher(a.voucherNo)}>
                        <ReceiptText className="w-3.5 h-3.5" /> {a.voucherNo}
                      </button>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      {a.status === "pending" && allowApprove && (
                        <button className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Approve (posts voucher)" onClick={() => setApproving(a)}><Check className="w-4 h-4" /></button>
                      )}
                      {a.voucherNo && (
                        <button className="p-1.5 rounded hover:bg-violet-50 text-violet-600" title="View voucher" onClick={() => setViewVoucher(a.voucherNo)}><FileText className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && <tr><td colSpan={9} className="text-center text-sm text-gray-400 py-8">No advances yet.</td></tr>}
            </tbody>
          </table>
        </ListScroll>
      )}

      {/* Request advance modal */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Request salary advance" size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={createMut.isPending || !form.employeeId || !form.amount} onClick={() => createMut.mutate()}>{createMut.isPending ? "Submitting…" : "Submit request"}</button>
          </>
        }>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Employee" required>
              <select className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">— select —</option>
                {(employees as { id: number; fullName: string; salary: string }[] | undefined)?.map((e2) => <option key={e2.id} value={e2.id}>{e2.fullName} (salary {Number(e2.salary ?? 0).toLocaleString()})</option>)}
              </select>
            </Field>
          </div>
          <Field label="Advance type" required>
            <select className="input" value={form.advanceType} onChange={(e) => setForm({ ...form, advanceType: e.target.value })}>
              {ADVANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Amount (PKR)" required><input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Purpose"><textarea className="input" rows={2} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></Field></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!approving} onCancel={() => setApproving(null)} onConfirm={() => approving && approveMut.mutate(approving)}
        title="Approve advance?" message={`Approve PKR ${Number(approving?.amount ?? 0).toLocaleString()} for ${approving?.employeeName}? This posts a double-entry payment voucher (Dr Staff Advances, Cr Cash). Only HR / administrative authority may approve.`}
        confirmText="Approve & post voucher" loading={approveMut.isPending} />

      <VoucherViewDialog voucherNo={viewVoucher} onClose={() => setViewVoucher(null)} />

      <ImportModal open={importing} onClose={() => setImporting(false)} api="/api/hrm/advances"
        fields={[
          { key: "employeeId", label: "Employee ID", type: "number" }, { key: "advanceType", label: "Type (for-month/against-salary)" },
          { key: "amount", label: "Amount", type: "number" }, { key: "date", label: "Date" }, { key: "purpose", label: "Purpose" },
        ]}
        title="Advances" onDone={invalidate} />
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="hrm.advances">
      <AdvancesInner />
    </RequireAccess>
  );
}
