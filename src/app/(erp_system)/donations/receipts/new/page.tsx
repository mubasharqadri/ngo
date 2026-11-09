"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Save, Plus, Trash2, Info } from "lucide-react";
import Link from "next/link";
import { PageHeader, Card, Field, Badge } from "@/components/ui/Breadcrumbs";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { VOUCHER_TYPE_OPTIONS } from "@/lib/options";
import { ShieldOff } from "lucide-react";

type Line = { doneeId: string; categoryId: string; amount: string; fromDate: string; toDate: string; remarks: string };
const blankLine = (): Line => ({ doneeId: "", categoryId: "", amount: "", fromDate: "", toDate: "", remarks: "" });

function NewReceiptForm() {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();
  const [form, setForm] = useState({
    receiptNo: `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    receiptDate: new Date().toISOString().slice(0, 10),
    donationDate: new Date().toISOString().slice(0, 10),
    donorId: "",
    restrictUseInFund: false,
    instrumentNo: "",
    instrumentDate: "",
    voucherType: "CRV",
    remarks: "",
  });
  const [lines, setLines] = useState<Line[]>([blankLine()]);

  const { data: donors } = useQuery({ queryKey: ["donors-opts"], queryFn: async () => (await (await fetch("/api/donations/donors?limit=500", { credentials: "include" })).json()).data });
  const { data: donees } = useQuery({ queryKey: ["donees-opts"], queryFn: async () => (await (await fetch("/api/donations/donees?limit=500", { credentials: "include" })).json()).data });
  const { data: funds } = useQuery({ queryKey: ["funds-opts"], queryFn: async () => (await (await fetch("/api/setup/cost-centers?limit=100", { credentials: "include" })).json()).data });

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balanced = total > 0;

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const m = useMutation({
    mutationFn: async () => {
      const donorName = (donors as any[])?.find((d) => String(d.id) === form.donorId)?.name ?? "donor";
      const res = await fetch("/api/donations/receipts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          donorId: form.donorId || null,
          donorName,
          instrumentDate: form.instrumentDate || null,
          voucherType: form.voucherType || null,
          lines: lines
            .filter((l) => Number(l.amount) > 0)
            .map((l) => ({
              doneeId: l.doneeId || null,
              categoryId: l.categoryId || null,
              amount: Number(l.amount),
              fromDate: l.fromDate || null,
              toDate: l.toDate || null,
              remarks: l.remarks || null,
            })),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      return j.data;
    },
    onSuccess: (d) => {
      toast.push({
        title: `Receipt ${d.receiptNo} saved`,
        desc: d.voucherNo ? `Double-entry voucher ${d.voucherNo} posted automatically.` : "Detail and monthly distribution generated.",
      });
      router.push(`/donations/receipts/${d.id}`);
    },
    onError: (e: Error) => toast.push({ title: "Save failed", desc: e.message, tone: "error" }),
  });

  if (!can("donations.receipts", "create")) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto mt-10">
        <ShieldOff className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold mb-1">No create permission</h2>
        <Link href="/donations/receipts" className="btn btn-primary mt-4">Back to receipts</Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New Donation Receipt"
        subtitle="Master + detail lines (donee / fund / period) — monthly distribution is generated automatically"
        actions={<Link href="/donations/receipts" className="btn btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</Link>}
      />

      <Card className="mb-4">
        <div className="text-[11px] uppercase tracking-widest text-emerald-700 font-bold mb-3">Receipt Master</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Receipt No" required><input className="input font-mono" value={form.receiptNo} onChange={(e) => setForm({ ...form, receiptNo: e.target.value })} /></Field>
          <Field label="Receipt Date (entry date)" required><input type="date" className="input" value={form.receiptDate} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} /></Field>
          <Field label="Donation Date (actual / approval)" required><input type="date" className="input" value={form.donationDate} onChange={(e) => setForm({ ...form, donationDate: e.target.value })} /></Field>
          <Field label="Donor" required>
            <select className="input" value={form.donorId} onChange={(e) => setForm({ ...form, donorId: e.target.value })}>
              <option value="">— select donor —</option>
              {(donors as any[])?.map((d: any) => <option key={d.id} value={d.id}>{d.name}{d.membershipNo ? ` (${d.membershipNo})` : ""}</option>)}
            </select>
          </Field>
          <Field label="Instrument No (cheque / online ref)"><input className="input" value={form.instrumentNo} onChange={(e) => setForm({ ...form, instrumentNo: e.target.value })} /></Field>
          <Field label="Instrument Date"><input type="date" className="input" value={form.instrumentDate} onChange={(e) => setForm({ ...form, instrumentDate: e.target.value })} /></Field>
          <Field label="Voucher Type (auto double-entry)" hint="Creates a balanced voucher: Dr Cash/Bank, Cr Donation Income">
            <select className="input" value={form.voucherType} onChange={(e) => setForm({ ...form, voucherType: e.target.value })}>
              <option value="">— no voucher —</option>
              {VOUCHER_TYPE_OPTIONS.filter((v) => ["CRV", "BRV", "JV"].includes(v.value)).map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2 flex items-end pb-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.restrictUseInFund} onChange={(e) => setForm({ ...form, restrictUseInFund: e.target.checked })} className="accent-emerald-600 w-4 h-4" />
              <span className="text-sm">Restrict use in fund <span className="text-xs text-gray-500">(donor restricts usage to the given program/fund only)</span></span>
            </label>
          </div>
          <div className="sm:col-span-3">
            <Field label="Remarks"><textarea className="input" rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-widest text-emerald-700 font-bold">Detail — donor paid for donees / funds / periods</div>
          <button className="btn btn-ghost" onClick={() => setLines((ls) => [...ls, blankLine()])}><Plus className="w-4 h-4" /> Add line</button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">S#</th>
                <th>Donee</th>
                <th>Category (Fund)</th>
                <th>Amount</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Remarks</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{i + 1}</td>
                  <td>
                    <select className="input" value={l.doneeId} onChange={(e) => setLine(i, { doneeId: e.target.value })}>
                      <option value="">—</option>
                      {(donees as any[])?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="input" value={l.categoryId} onChange={(e) => setLine(i, { categoryId: e.target.value })}>
                      <option value="">—</option>
                      {(funds as any[])?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" className="input w-28" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} /></td>
                  <td><input type="date" className="input" value={l.fromDate} onChange={(e) => setLine(i, { fromDate: e.target.value })} /></td>
                  <td><input type="date" className="input" value={l.toDate} onChange={(e) => setLine(i, { toDate: e.target.value })} /></td>
                  <td><input className="input" value={l.remarks} onChange={(e) => setLine(i, { remarks: e.target.value })} /></td>
                  <td>
                    <button className="p-1.5 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50/60">
                <td colSpan={3} className="font-bold text-right">Total</td>
                <td className="font-bold text-emerald-700">{total.toLocaleString()}</td>
                <td colSpan={4} className="text-xs text-gray-500">Amount is split month-wise over From→To period automatically</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5" /> Each detail line covering several months generates one distribution row per month (equal share).
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/donations/receipts" className="btn btn-ghost">Cancel</Link>
        <button className="btn btn-primary" disabled={m.isPending || !balanced || !form.donorId} onClick={() => m.mutate()}>
          <Save className="w-4 h-4" /> {m.isPending ? "Saving..." : "Save Receipt"}
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="donations.receipts">
      <NewReceiptForm />
    </RequireAccess>
  );
}
