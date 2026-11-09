"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus, Check, X, Package, Printer } from "lucide-react";
import { PageHeader, Card, Badge, LoadingTable, Modal, Field } from "@/components/ui/Breadcrumbs";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions, useMe } from "@/hooks/usePermissions";
import { printA4 } from "@/lib/exports";
import { ExportButtons } from "@/components/ExportButtons";
import { useToast } from "@/components/ui/toast";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";

const fmtPKR = (n: number | string) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number(n));
const dt = (v: string | null) => (v ? String(v).slice(0, 16).replace("T", " ") : "—");

function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const { data: me } = useMe();
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<any>({
    donorReceiptNo: "", donorSerialNo: "", donorReceiptDate: "", donorId: "",
    doneeId: "", doneeCategoryId: "", program: "", instrumentNo: "", instrumentDate: "", paidAmount: "", remarks: "",
  });

  const allowEdit = can("donations.disbursements", "edit");
  const allowCancel = can("donations.disbursements", "cancel");
  const allowPrint = can("donations.disbursements", "print");

  const { data, isLoading } = useQuery({
    queryKey: ["batch", id],
    queryFn: async () => (await (await fetch(`/api/donations/disbursements/batches/${id}`, { credentials: "include" })).json()).data,
  });
  const { data: receipts } = useQuery({
    queryKey: ["receipts-opts"],
    queryFn: async () => (await (await fetch("/api/donations/receipts?limit=300", { credentials: "include" })).json()).data,
  });
  const { data: donees } = useQuery({
    queryKey: ["donees-opts"],
    queryFn: async () => (await (await fetch("/api/donations/donees?limit=500", { credentials: "include" })).json()).data,
  });
  const { data: funds } = useQuery({
    queryKey: ["funds-opts"],
    queryFn: async () => (await (await fetch("/api/setup/cost-centers?limit=100", { credentials: "include" })).json()).data,
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const donee = (donees as any[])?.find((d) => String(d.id) === newItem.doneeId);
      const res = await fetch(`/api/donations/disbursements/batches/${id}`, {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          ...newItem,
          donorId: newItem.donorId || null,
          doneeId: newItem.doneeId || null,
          doneeName: donee?.name ?? null,
          doneeCategoryId: newItem.doneeCategoryId || null,
          donorSerialNo: newItem.donorSerialNo || null,
          donorReceiptDate: newItem.donorReceiptDate || null,
          instrumentDate: newItem.instrumentDate || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batch", id] });
      setAdding(false);
      setNewItem({ donorReceiptNo: "", donorSerialNo: "", donorReceiptDate: "", donorId: "", doneeId: "", doneeCategoryId: "", program: "", instrumentNo: "", instrumentDate: "", paidAmount: "", remarks: "" });
      toast.push({ title: "Line added", desc: "Generated-by recorded.", tone: "success" });
    },
    onError: (e: Error) => toast.push({ title: "Add failed", desc: e.message, tone: "error" }),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/donations/disbursements/batches/${id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      return res.json();
    },
    onSuccess: (j, status) => {
      qc.invalidateQueries({ queryKey: ["batch", id] });
      toast.push({
        title: `Batch ${status}`,
        desc: status === "paid" && j.data?.voucherNo ? `Payment voucher ${j.data.voucherNo} posted (double entry).` : "Status change recorded in audit log.",
        tone: status === "cancelled" ? "info" : "success",
      });
    },
    onError: (e: Error) => toast.push({ title: "Action failed", desc: e.message, tone: "error" }),
  });

  if (isLoading || !data) return <LoadingTable rows={6} cols={6} />;

  const doPrintA4 = () =>
    printA4({
      title: `Disbursement Voucher — ${data.batchNo}`,
      subtitle: `${data.title} • Batch date ${data.date}`,
      generatedBy: me?.user.name,
      kv: [
        { label: "Fund / Program", value: data.fund },
        { label: "Status", value: String(data.status).toUpperCase() },
        { label: "Payment Voucher", value: data.voucherNo ? `${data.voucherType} ${data.voucherNo}` : data.voucherType ? `${data.voucherType} (created on payment)` : "—" },
        { label: "Approved By", value: data.approvedByName ? `${data.approvedByName} — ${dt(data.approvedAt)}` : "—" },
      ],
      columns: [
        { key: "donorReceiptNo", label: "Donor Receipt" },
        { key: "donorName", label: "Donor" },
        { key: "doneeName", label: "Donee" },
        { key: "categoryName", label: "Category" },
        { key: "program", label: "Program" },
        { key: "instrumentNo", label: "Instrument" },
        { key: "paidAmount", label: "Paid (PKR)" },
      ],
      rows: (data.items ?? []).map((it: any) => ({
        donorReceiptNo: it.donorReceiptNo ?? "—",
        donorName: it.donorName ?? "—",
        doneeName: it.doneeLiveName ?? it.doneeName ?? "—",
        categoryName: it.categoryName ?? "—",
        program: it.program ?? "—",
        instrumentNo: it.instrumentNo ?? "—",
        paidAmount: Number(it.paidAmount),
      })),
      totalColumn: "paidAmount",
      signatures: ["Generated By", "Approved By", "Proceeded By"],
    });

  return (
    <div>
      <PageHeader
        title={`Batch ${data.batchNo}`}
        subtitle={`${data.title} • ${data.date}`}
        actions={
          <>
            <Link href="/donations/disbursements" className="btn btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</Link>
            {allowPrint && <button className="btn btn-ghost" onClick={doPrintA4}><Printer className="w-4 h-4" /> Print A4</button>}
            {data.status === "draft" && allowEdit && <button className="btn btn-ghost" onClick={() => updateStatus.mutate("approved")}><Check className="w-4 h-4" /> Approve</button>}
            {data.status === "approved" && allowEdit && <button className="btn btn-primary" onClick={() => updateStatus.mutate("paid")}><Check className="w-4 h-4" /> Mark Paid</button>}
            {data.status === "draft" && allowCancel && <button className="btn btn-ghost text-rose-600" onClick={() => updateStatus.mutate("cancelled")}><X className="w-4 h-4" /> Cancel</button>}
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Status</div>
          <div className="mt-1"><Badge tone={data.status === "paid" ? "emerald" : data.status === "approved" ? "sky" : data.status === "cancelled" ? "rose" : "slate"}>{data.status}</Badge></div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Total Paid</div>
          <div className="mt-1 font-semibold">{fmtPKR(data.totalAmount)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Lines</div>
          <div className="mt-1 font-semibold">{data.count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Fund</div>
          <div className="mt-1"><Badge tone="sky">{data.fund}</Badge></div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Voucher</div>
          <div className="mt-1">{data.voucherNo ? <Badge tone="violet">{data.voucherNo}</Badge> : <span className="text-xs text-gray-400">{data.voucherType ? `${data.voucherType} on payment` : "—"}</span>}</div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div className="font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Disbursement Lines</div>
          <div className="flex items-center gap-2 flex-wrap">
            {allowPrint && (
              <ExportButtons
                filename={`batch-${data.batchNo}`}
                title={`Disbursement Batch ${data.batchNo}`}
                columns={[
                  { key: "donorReceiptNo", label: "Donor Receipt #" },
                  { key: "donorSerialNo", label: "Donor S#" },
                  { key: "donorReceiptDate", label: "Receipt Date" },
                  { key: "donorName", label: "Donor" },
                  { key: "doneeName", label: "Donee" },
                  { key: "categoryName", label: "Category" },
                  { key: "program", label: "Program" },
                  { key: "instrumentNo", label: "Instrument #" },
                  { key: "instrumentDate", label: "Instrument Date" },
                  { key: "paidAmount", label: "Paid Amount (PKR)" },
                  { key: "remarks", label: "Remarks" },
                ]}
                rows={(data.items ?? []).map((it: any) => ({ ...it, paidAmount: Number(it.paidAmount), doneeName: it.doneeLiveName ?? it.doneeName }))}
                totalColumn="paidAmount"
              />
            )}
            {data.status === "draft" && allowEdit && <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Add Line</button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Donor Receipt Ref</th><th>Donor</th><th>Donee</th><th>Category</th><th>Program</th>
                <th>Instrument</th><th className="text-right">Paid</th><th>Generated</th><th>Approved</th><th>Proceeded</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && <tr><td colSpan={10} className="text-center text-sm text-gray-500 py-6">No lines yet — add donee payments to this batch.</td></tr>}
              {data.items.map((it: any) => (
                <tr key={it.id}>
                  <td>
                    <span className="font-mono text-xs">{it.donorReceiptNo ?? "—"}</span>
                    {it.donorSerialNo && <span className="text-[10px] text-gray-400 block">S# {it.donorSerialNo} • {it.donorReceiptDate ?? ""}</span>}
                  </td>
                  <td className="text-sm">{it.donorName ?? "—"}</td>
                  <td className="font-medium">{it.doneeLiveName ?? it.doneeName ?? "—"}</td>
                  <td>{it.categoryName ? <Badge tone="sky">{it.categoryName}</Badge> : "—"}</td>
                  <td className="text-sm">{it.program ?? "—"}</td>
                  <td className="font-mono text-xs">{it.instrumentNo ?? "—"}{it.instrumentDate ? <span className="block text-gray-400">{it.instrumentDate}</span> : null}</td>
                  <td className="text-right font-semibold">{fmtPKR(it.paidAmount)}</td>
                  <td className="text-[11px] text-gray-500">{it.generatedByName ?? "—"}<span className="block text-gray-400">{dt(it.generateDate)}</span></td>
                  <td className="text-[11px] text-gray-500">{it.approveDate ? dt(it.approveDate) : "—"}</td>
                  <td className="text-[11px] text-gray-500">{it.proceedDate ? dt(it.proceedDate) : "—"}</td>
                </tr>
              ))}
              {data.items.length > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={6} className="font-semibold text-right">Total</td>
                  <td className="text-right font-bold text-emerald-700">{fmtPKR(data.totalAmount)}</td>
                  <td colSpan={3}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add Disbursement Line"
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={addMut.isPending || !newItem.doneeId || !newItem.paidAmount} onClick={() => addMut.mutate()}>
              {addMut.isPending ? "Adding..." : "Add Line"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Donor Receipt # (reference)">
            <select className="input" value={newItem.donorReceiptNo} onChange={(e) => {
              const r = (receipts as any[])?.find((x) => x.receiptNo === e.target.value);
              setNewItem({ ...newItem, donorReceiptNo: e.target.value, donorId: r?.donorId ?? "", donorReceiptDate: r?.receiptDate ?? "" });
            }}>
              <option value="">— none —</option>
              {(receipts as any[])?.map((r: any) => <option key={r.id} value={r.receiptNo}>{r.receiptNo} — {r.donorName ?? "?"} ({fmtPKR(r.totalAmount)})</option>)}
            </select>
          </Field>
          <Field label="Donor Serial #"><input type="number" className="input" value={newItem.donorSerialNo} onChange={(e) => setNewItem({ ...newItem, donorSerialNo: e.target.value })} /></Field>
          <Field label="Donee (changeable)" required>
            <select className="input" value={newItem.doneeId} onChange={(e) => setNewItem({ ...newItem, doneeId: e.target.value })}>
              <option value="">— select donee —</option>
              {(donees as any[])?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Donee Category (fund type)">
            <select className="input" value={newItem.doneeCategoryId} onChange={(e) => setNewItem({ ...newItem, doneeCategoryId: e.target.value })}>
              <option value="">—</option>
              {(funds as any[])?.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="Program (changeable at disbursement)">
            <select className="input" value={newItem.program} onChange={(e) => setNewItem({ ...newItem, program: e.target.value })}>
              <option value="">—</option>
              {(funds as any[])?.map((f: any) => <option key={f.id} value={f.name}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="Paid Amount (PKR)" required><input type="number" className="input" value={newItem.paidAmount} onChange={(e) => setNewItem({ ...newItem, paidAmount: e.target.value })} /></Field>
          <Field label="Instrument No (cheque / online)"><input className="input" value={newItem.instrumentNo} onChange={(e) => setNewItem({ ...newItem, instrumentNo: e.target.value })} /></Field>
          <Field label="Instrument Date"><input type="date" className="input" value={newItem.instrumentDate} onChange={(e) => setNewItem({ ...newItem, instrumentDate: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Remarks"><textarea className="input" rows={2} value={newItem.remarks} onChange={(e) => setNewItem({ ...newItem, remarks: e.target.value })} /></Field></div>
        </div>
      </Modal>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="donations.disbursements">
      <BatchDetail />
    </RequireAccess>
  );
}
