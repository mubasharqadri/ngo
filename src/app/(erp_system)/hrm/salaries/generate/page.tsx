"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Wand2, Plus, Trash2, Scale, Save } from "lucide-react";
import { PageHeader, Card, Badge, LoadingTable, ListScroll } from "@/components/ui/Breadcrumbs";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";

const fmt = (n: number) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);
const monthKey = (offset: number) => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1 + offset).padStart(2, "0")}`;
};

type Slab = { id?: number; minAmount: number; maxAmount: number | null; fixedTax: number; ratePercent: number };
type Row = {
  employeeId: number; employeeName: string; designation: string | null; department: string | null;
  basic: number; allowances: number; deductions: number; alreadyGenerated: boolean;
  otherDeductions: { description: string; amount: string }[];
  selected: boolean;
};

/** Pakistan salary income tax on annualized income using the (editable) slabs. */
function computeAnnualTax(annual: number, slabs: Slab[]): number {
  const sorted = [...slabs].sort((a, b) => a.minAmount - b.minAmount);
  for (const s of sorted) {
    const inSlab = annual > s.minAmount && (s.maxAmount === null || annual <= s.maxAmount);
    if (inSlab) return s.fixedTax + (s.ratePercent / 100) * (annual - s.minAmount);
  }
  return 0;
}

function GenerateInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const [month, setMonth] = useState(monthKey(0));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [slabs, setSlabs] = useState<Slab[] | null>(null);
  const [showSlabs, setShowSlabs] = useState(false);

  const preview = useQuery({
    queryKey: ["salary-preview", month],
    queryFn: async () => (await (await fetch(`/api/hrm/salaries/generate?month=${month}`, { credentials: "include" })).json()).data,
  });
  const slabsQ = useQuery({
    queryKey: ["tax-slabs"],
    queryFn: async () => (await (await fetch(`/api/hrm/tax-slabs`, { credentials: "include" })).json()).data as Slab[],
  });

  if (preview.data && rows === null) setRows(preview.data.map((r: Row) => ({ ...r, otherDeductions: [], selected: !r.alreadyGenerated })));
  if (slabsQ.data && slabs === null) setSlabs(slabsQ.data);

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => (rs ? rs.map((r, ri) => (ri === i ? { ...r, ...patch } : r)) : rs));

  const monthlyTax = (r: Row): number => {
    if (!slabs) return 0;
    const grossAnnual = (r.basic + r.allowances) * 12;
    return Math.round(computeAnnualTax(grossAnnual, slabs) / 12);
  };
  const otherTotal = (r: Row) => (r.otherDeductions ?? []).reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const netOf = (r: Row) => Math.round((r.basic + r.allowances - r.deductions - otherTotal(r) - monthlyTax(r)) * 100) / 100;

  const saveSlabsMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/hrm/tax-slabs", { method: "PUT", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ slabs }) });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-slabs"] }); toast.push({ title: "Tax slabs saved" }); },
  });

  const genMut = useMutation({
    mutationFn: async () => {
      const payload = {
        month,
        rows: (rows ?? [])
          .filter((r) => r.selected && !r.alreadyGenerated)
          .map((r) => ({
            employeeId: r.employeeId, basic: r.basic, allowances: r.allowances, deductions: r.deductions,
            otherDeductions: r.otherDeductions.filter((o) => o.description && Number(o.amount) > 0),
            net: netOf(r),
          })),
      };
      const res = await fetch("/api/hrm/salaries/generate", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      return j.data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["salaries"] });
      toast.push({ title: `Payroll generated for ${d.month}`, desc: `${d.created} rows created, ${d.skipped} skipped.` });
      router.push("/hrm/salaries");
    },
    onError: (e: Error) => toast.push({ title: "Generate failed", desc: e.message, tone: "error" }),
  });

  const totals = (rows ?? []).filter((r) => r.selected && !r.alreadyGenerated).reduce(
    (acc, r) => ({ basic: acc.basic + r.basic, allowances: acc.allowances + r.allowances, deductions: acc.deductions + r.deductions + otherTotal(r), tax: acc.tax + monthlyTax(r), net: acc.net + netOf(r) }),
    { basic: 0, allowances: 0, deductions: 0, tax: 0, net: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Generate Monthly Payroll"
        subtitle="Correct net salary with Pakistan income-tax (editable slabs) and custom deductions"
        actions={<Link href="/hrm/salaries" className="btn btn-ghost"><ArrowLeft className="w-4 h-4" /> Back to salaries</Link>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600 mb-1 block">Payroll month</span>
            <select className="input w-56" value={month} onChange={(e) => { setMonth(e.target.value); setRows(null); }}>
              <option value={monthKey(0)}>Current month — {monthKey(0)}</option>
              <option value={monthKey(1)}>Next month — {monthKey(1)}</option>
            </select>
          </label>
          <button className="btn btn-ghost" onClick={() => setShowSlabs((s) => !s)}>
            <Scale className="w-4 h-4" /> {showSlabs ? "Hide" : "Edit"} income-tax slabs
          </button>
          {can("hrm.salaries", "create") && (
            <button className="btn btn-primary" disabled={genMut.isPending || !(rows ?? []).some((r) => r.selected && !r.alreadyGenerated)} onClick={() => genMut.mutate()}>
              <Wand2 className="w-4 h-4" /> {genMut.isPending ? "Generating…" : "Generate payroll"}
            </button>
          )}
          <div className="text-xs text-gray-500 pb-2">Selected: net <b className="text-emerald-700">PKR {fmt(totals.net)}</b> · tax <b className="text-rose-600">PKR {fmt(totals.tax)}</b></div>
        </div>
      </Card>

      {showSlabs && slabs && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-600" /> Pakistan salary income-tax slabs (annual PKR)</div>
              <div className="text-xs text-gray-500 mt-0.5">Seeded with Finance Act 2024-25 — edit to match your organization's needs. Tax = fixed + rate% × (income − slab start), applied on annualized gross then ÷12.</div>
            </div>
            <button className="btn btn-primary" disabled={saveSlabsMut.isPending} onClick={() => saveSlabsMut.mutate()}>
              <Save className="w-4 h-4" /> {saveSlabsMut.isPending ? "Saving…" : "Save slabs"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Slab</th><th className="text-right">Min (PKR)</th><th className="text-right">Max (PKR)</th><th className="text-right">Fixed Tax</th><th className="text-right">Rate %</th><th className="w-8"></th></tr></thead>
              <tbody>
                {slabs.map((s, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{i + 1}</td>
                    <td><input type="number" className="input text-right" value={s.minAmount} onChange={(e) => setSlabs(slabs.map((x, xi) => (xi === i ? { ...x, minAmount: Number(e.target.value) } : x)))} /></td>
                    <td><input type="number" className="input text-right" value={s.maxAmount ?? ""} placeholder="no limit" onChange={(e) => setSlabs(slabs.map((x, xi) => (xi === i ? { ...x, maxAmount: e.target.value === "" ? null : Number(e.target.value) } : x)))} /></td>
                    <td><input type="number" className="input text-right" value={s.fixedTax} onChange={(e) => setSlabs(slabs.map((x, xi) => (xi === i ? { ...x, fixedTax: Number(e.target.value) } : x)))} /></td>
                    <td><input type="number" step="0.1" className="input text-right" value={s.ratePercent} onChange={(e) => setSlabs(slabs.map((x, xi) => (xi === i ? { ...x, ratePercent: Number(e.target.value) } : x)))} /></td>
                    <td><button className="text-gray-400 hover:text-rose-600" onClick={() => setSlabs(slabs.filter((_, xi) => xi !== i))}><Trash2 className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-2 text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1" onClick={() => setSlabs([...slabs, { minAmount: slabs.length ? slabs[slabs.length - 1].maxAmount ?? 0 : 0, maxAmount: null, fixedTax: 0, ratePercent: 0 }])}>
            <Plus className="w-3 h-3" /> Add slab
          </button>
        </Card>
      )}

      {preview.isLoading && <LoadingTable rows={8} cols={8} />}

      {rows && slabs && (
        <ListScroll height="calc(100vh - 320px)">
          <table className="table">
            <thead>
              <tr><th className="w-8"></th><th>Employee</th><th className="text-right">Basic</th><th className="text-right">Allowances</th><th className="text-right">Deductions</th><th>Other Deductions (with description)</th><th className="text-right">Income Tax</th><th className="text-right">Net Pay</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.employeeId} className={r.alreadyGenerated ? "opacity-50" : ""}>
                  <td><input type="checkbox" className="accent-emerald-600" checked={r.selected && !r.alreadyGenerated} disabled={r.alreadyGenerated} onChange={(e) => setRow(i, { selected: e.target.checked })} /></td>
                  <td>
                    <div className="font-medium">{r.employeeName}</div>
                    <div className="text-xs text-gray-500">{r.designation} · {r.department}</div>
                  </td>
                  <td><input type="number" className="input text-right w-28" value={r.basic} disabled={r.alreadyGenerated} onChange={(e) => setRow(i, { basic: Number(e.target.value) || 0 })} /></td>
                  <td><input type="number" className="input text-right w-28" value={r.allowances} disabled={r.alreadyGenerated} onChange={(e) => setRow(i, { allowances: Number(e.target.value) || 0 })} /></td>
                  <td><input type="number" className="input text-right w-28" value={r.deductions} disabled={r.alreadyGenerated} onChange={(e) => setRow(i, { deductions: Number(e.target.value) || 0 })} /></td>
                  <td className="min-w-64">
                    {r.otherDeductions.map((o, oi) => (
                      <div key={oi} className="flex gap-1.5 mb-1.5">
                        <input className="input text-xs" placeholder="Description (e.g. loan installment)" value={o.description} disabled={r.alreadyGenerated}
                          onChange={(e) => setRow(i, { otherDeductions: r.otherDeductions.map((x, xi) => (xi === oi ? { ...x, description: e.target.value } : x)) })} />
                        <input type="number" className="input text-xs w-24 text-right" placeholder="Amount" value={o.amount} disabled={r.alreadyGenerated}
                          onChange={(e) => setRow(i, { otherDeductions: r.otherDeductions.map((x, xi) => (xi === oi ? { ...x, amount: e.target.value } : x)) })} />
                        <button className="text-gray-400 hover:text-rose-600 px-1" disabled={r.alreadyGenerated} onClick={() => setRow(i, { otherDeductions: r.otherDeductions.filter((_, xi) => xi !== oi) })}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    {!r.alreadyGenerated && (
                      <button className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1" onClick={() => setRow(i, { otherDeductions: [...r.otherDeductions, { description: "", amount: "" }] })}>
                        <Plus className="w-3 h-3" /> Add deduction
                      </button>
                    )}
                  </td>
                  <td className="text-right font-medium text-rose-600 whitespace-nowrap">−{fmt(monthlyTax(r))}</td>
                  <td className="text-right font-bold text-emerald-700 whitespace-nowrap">{fmt(netOf(r))}</td>
                  <td>{r.alreadyGenerated ? <Badge tone="slate">already exists</Badge> : <Badge tone="emerald">will generate</Badge>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50/60">
                <td colSpan={2} className="font-bold text-right">Totals (selected)</td>
                <td className="text-right font-bold">{fmt(totals.basic)}</td>
                <td className="text-right font-bold">{fmt(totals.allowances)}</td>
                <td className="text-right font-bold">{fmt(totals.deductions)}</td>
                <td />
                <td className="text-right font-bold text-rose-600">−{fmt(totals.tax)}</td>
                <td className="text-right font-bold text-emerald-700">{fmt(totals.net)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </ListScroll>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="hrm.salaries">
      <GenerateInner />
    </RequireAccess>
  );
}
