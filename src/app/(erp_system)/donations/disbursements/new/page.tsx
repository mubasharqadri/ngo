"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader, Card, Field } from "@/components/ui/Breadcrumbs";
import { RequireAccess } from "@/components/RequireAccess";
import { useToast } from "@/components/ui/toast";
import { VOUCHER_TYPE_OPTIONS } from "@/lib/options";

function NewBatchForm() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    batchNo: `BAT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    title: "",
    date: new Date().toISOString().slice(0, 10),
    fund: "general",
    voucherType: "CPV",
    notes: "",
  });
  const m = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/donations/disbursements/batches", {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      return j.data;
    },
    onSuccess: (d: any) => {
      toast.push({ title: "Batch created", desc: "Add donee lines, then approve and pay.", tone: "success" });
      router.push(`/donations/disbursements/batches/${d.id}`);
    },
    onError: (e: Error) => toast.push({ title: "Create failed", desc: e.message, tone: "error" }),
  });
  return (
    <div>
      <PageHeader title="New Disbursement Batch" actions={<Link href="/donations/disbursements" className="btn btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</Link>} />
      <Card className="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Batch #" required><input className="input font-mono" value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} /></Field>
          <Field label="Batch Date" required><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Title" required><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Monthly support — March" /></Field></div>
          <Field label="Fund / Program">
            <select className="input" value={form.fund} onChange={(e) => setForm({ ...form, fund: e.target.value })}>
              <option value="general">General</option><option value="zakat">Zakat</option><option value="sadaqah">Sadaqah</option>
              <option value="orphan">Orphan Care</option><option value="ration">Ration</option>
            </select>
          </Field>
          <Field label="Voucher Type (payment voucher created on Mark Paid)" hint="CPV = cash payment, BPV = bank payment">
            <select className="input" value={form.voucherType} onChange={(e) => setForm({ ...form, voucherType: e.target.value })}>
              <option value="">— no voucher —</option>
              {VOUCHER_TYPE_OPTIONS.filter((v) => ["CPV", "BPV", "JV"].includes(v.value)).map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2"><Field label="Notes"><textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Link href="/donations/disbursements" className="btn btn-ghost">Cancel</Link>
          <button className="btn btn-primary" disabled={m.isPending || !form.title} onClick={() => m.mutate()}><Save className="w-4 h-4" /> {m.isPending ? "Saving..." : "Create Batch"}</button>
        </div>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="donations.disbursements">
      <NewBatchForm />
    </RequireAccess>
  );
}
