"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2, Scale } from "lucide-react";
import { PageHeader, Card, Field, Badge } from "@/components/ui/Breadcrumbs";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { VOUCHER_TYPES, type VoucherType } from "@/lib/options";
import { clsx } from "clsx";

type Dist = { costCenterId: string; percent: string };
type Line = { accountId: string; debit: string; credit: string; narration: string; partnerType: string; partnerId: string; distributions: Dist[] };
const blank = (): Line => ({ accountId: "", debit: "", credit: "", narration: "", partnerType: "", partnerId: "", distributions: [] });

function NewVoucherForm() {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();
  const [step, setStep] = useState<"type" | "form">("type");
  const [type, setType] = useState<VoucherType | null>(null);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), narration: "" });
  const [lines, setLines] = useState<Line[]>([blank(), blank()]);

  const { data: accounts } = useQuery({
    queryKey: ["accounts-opts"],
    queryFn: async () => (await (await fetch("/api/accounting/accounts?limit=500", { credentials: "include" })).json()).data,
  });
  const { data: costCenters } = useQuery({
    queryKey: ["cc-opts"],
    queryFn: async () => (await (await fetch("/api/setup/cost-centers?limit=100", { credentials: "include" })).json()).data,
  });
  const { data: donors } = useQuery({
    queryKey: ["donors-opts-v"],
    queryFn: async () => (await (await fetch("/api/donations/donors?limit=500", { credentials: "include" })).json()).data,
  });
  const { data: donees } = useQuery({
    queryKey: ["donees-opts-v"],
    queryFn: async () => (await (await fetch("/api/donations/donees?limit=500", { credentials: "include" })).json()).data,
  });
  const { data: vendors } = useQuery({
    queryKey: ["vendors-opts-v"],
    queryFn: async () => (await (await fetch("/api/vendors?limit=500", { credentials: "include" })).json()).data,
  });

  const partnerOptions = (ptype: string): { value: string; label: string }[] => {
    const src = ptype === "donor" ? donors : ptype === "donee" ? donees : ptype === "vendor" ? vendors : [];
    return (src ?? []).map((p: { id: number; name: string }) => ({ value: String(p.id), label: p.name }));
  };

  const totalDr = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCr = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDr - totalCr) < 0.01 && totalDr > 0;

  const m = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/accounting/vouchers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type,
          date: form.date,
          narration: form.narration,
          lines: lines
            .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
            .map((l) => ({ accountId: Number(l.accountId), debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, narration: l.narration })),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      return j.data;
    },
    onSuccess: (d) => {
      toast.push({ title: `Voucher ${d.voucherNo} posted`, desc: "Double-entry balanced and saved.", tone: "success" });
      router.push("/accounting/vouchers");
    },
    onError: (e: Error) => toast.push({ title: "Post failed", desc: e.message, tone: "error" }),
  });

  if (!can("accounting.vouchers", "create")) {
    return <div className="card p-12 text-center text-gray-500">Your role cannot create vouchers.</div>;
  }

  const grouped = ["asset", "liability", "equity", "income", "expense"].map((t) => ({
    type: t,
    items: ((accounts as any[]) ?? []).filter((a) => a.type === t),
  }));

  // ---------- STEP 1: select voucher type ----------
  if (step === "type" || !type) {
    return (
      <div>
        <PageHeader
          title="New Voucher — Step 1 of 2"
          subtitle="Double entry system: first select the voucher type, then enter the entry"
          actions={<Link href="/accounting/vouchers" className="btn btn-ghost"><ArrowLeft className="w-4 h-4" /> Back</Link>}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.entries(VOUCHER_TYPES) as [VoucherType, typeof VOUCHER_TYPES[VoucherType]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => { setType(key); setStep("form"); }}
              className="card p-5 text-left hover:border-emerald-400 hover:shadow-lg hover:-translate-y-0.5 transition group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">{key}</span>
                <Badge tone={meta.nature === "receipt" ? "emerald" : meta.nature === "payment" ? "rose" : meta.nature === "contra" ? "sky" : "slate"}>{meta.nature}</Badge>
              </div>
              <div className="font-semibold mb-1">{meta.label}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{meta.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- STEP 2: enter the voucher ----------
  const meta = VOUCHER_TYPES[type];
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div>
      <PageHeader
        title="New Voucher — Step 2 of 2"
        subtitle={`${type} — ${meta.label}`}
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => { setStep("type"); setType(null); }}><ArrowLeft className="w-4 h-4" /> Change type</button>
            <Link href="/accounting/vouchers" className="btn btn-ghost">Cancel</Link>
          </>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Voucher Type">
            <div className="input bg-gray-50 font-mono font-semibold flex items-center gap-2">{type} <Badge tone="emerald">{meta.label}</Badge></div>
          </Field>
          <Field label="Date" required><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Voucher #"><div className="input bg-gray-50 text-gray-500">Auto — {type}-{form.date.slice(0, 4)}-####</div></Field>
          <div className="sm:col-span-3">
            <Field label="Narration"><textarea className="input" rows={2} value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} placeholder="e.g. Rent paid for head office March" /></Field>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-600" /> Entry Lines (debit = credit)</div>
          <button className="btn btn-ghost" onClick={() => setLines((ls) => [...ls, blank()])}><Plus className="w-4 h-4" /> Add line</button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th className="min-w-52">Account</th><th className="min-w-44">Partner (subledger)</th><th className="w-32 text-right">Debit</th><th className="w-32 text-right">Credit</th><th>Narration</th><th className="w-10"></th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const distPct = l.distributions.reduce((s, d) => s + (Number(d.percent) || 0), 0);
                return (
                  <Fragment key={i}>
                    <tr>
                      <td>
                        <select className="input" value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })}>
                          <option value="">— select account —</option>
                          {grouped.map((g) => g.items.length > 0 && (
                            <optgroup key={g.type} label={g.type.toUpperCase()}>
                              {g.items.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}{a.isControl ? " ⚓" : ""}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          <select className="input w-24" value={l.partnerType} onChange={(e) => setLine(i, { partnerType: e.target.value, partnerId: "" })} title="Link this line to a partner subledger (posts to the control account)">
                            <option value="">—</option>
                            <option value="donor">Donor</option>
                            <option value="donee">Donee</option>
                            <option value="vendor">Vendor</option>
                          </select>
                          {l.partnerType && (
                            <select className="input" value={l.partnerId} onChange={(e) => setLine(i, { partnerId: e.target.value })}>
                              <option value="">— select —</option>
                              {partnerOptions(l.partnerType).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                      <td><input type="number" className="input text-right" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })} /></td>
                      <td><input type="number" className="input text-right" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })} /></td>
                      <td><input className="input" value={l.narration} onChange={(e) => setLine(i, { narration: e.target.value })} /></td>
                      <td>
                        <button className="p-1.5 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length <= 2}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    {/* Analytical distribution for this line */}
                    <tr className="bg-gray-50/60">
                      <td colSpan={6} className="py-2 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Analytical split</span>
                          {l.distributions.map((d, di) => (
                            <span key={di} className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg pl-1 pr-1 py-0.5 text-xs">
                              <select className="text-xs border-0 bg-transparent font-medium max-w-36" value={d.costCenterId}
                                onChange={(e) => setLine(i, { distributions: l.distributions.map((x, xi) => (xi === di ? { ...x, costCenterId: e.target.value } : x)) })}>
                                <option value="">center?</option>
                                {(costCenters ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <input type="number" className="w-14 text-xs border border-gray-200 rounded px-1 py-0.5 text-right" value={d.percent}
                                onChange={(e) => setLine(i, { distributions: l.distributions.map((x, xi) => (xi === di ? { ...x, percent: e.target.value } : x)) })} />
                              <span className="text-gray-400">%</span>
                              <button className="text-gray-400 hover:text-rose-600 px-0.5" onClick={() => setLine(i, { distributions: l.distributions.filter((_, xi) => xi !== di) })}>✕</button>
                            </span>
                          ))}
                          <button className="text-xs font-semibold text-emerald-700 hover:underline"
                            onClick={() => setLine(i, { distributions: [...l.distributions, { costCenterId: "", percent: "" }] })}>+ split across programs</button>
                          {l.distributions.length > 0 && (
                            <span className={clsx("text-xs font-semibold", Math.abs(distPct - 100) < 0.01 ? "text-emerald-700" : "text-amber-600")}>
                              = {distPct}%{Math.abs(distPct - 100) >= 0.01 && " (should be 100%)"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={clsx(isBalanced ? "bg-emerald-50" : "bg-amber-50")}>
                <td className="font-bold text-right" colSpan={2}>Totals</td>
                <td className={clsx("font-bold text-right", isBalanced ? "text-emerald-700" : "text-amber-700")}>{totalDr.toLocaleString()}</td>
                <td className={clsx("font-bold text-right", isBalanced ? "text-emerald-700" : "text-amber-700")}>{totalCr.toLocaleString()}</td>
                <td colSpan={2}>
                  {isBalanced
                    ? <span className="flex items-center gap-1.5 text-emerald-700 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> Balanced — ready to post</span>
                    : <span className="text-amber-700 text-sm font-medium">Difference: {Math.abs(totalDr - totalCr).toLocaleString()} — voucher must balance</span>}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3 px-1">⚓ = control account. Linking a partner keeps the GL lean: the control account holds the balance while partner detail is tracked in the subledger.</p>
      </Card>

      <div className="flex justify-end gap-2">
        <Link href="/accounting/vouchers" className="btn btn-ghost">Cancel</Link>
        <button className="btn btn-primary" disabled={m.isPending || !isBalanced} onClick={() => m.mutate()}>
          <Save className="w-4 h-4" /> {m.isPending ? "Posting..." : "Post Voucher"}
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="accounting.vouchers">
      <NewVoucherForm />
    </RequireAccess>
  );
}
