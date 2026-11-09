"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PieChart } from "lucide-react";
import { PageHeader, Card, LoadingTable } from "@/components/ui/Breadcrumbs";
import { ExportButtons } from "@/components/ExportButtons";
import { RequireAccess } from "@/components/RequireAccess";

const fmt = (n: number) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);
const COLORS = ["#0e3b2e", "#16a34a", "#f59e0b", "#0284c7", "#e11d48", "#7c3aed", "#0d9488", "#65a30d"];

function AnalyticalInner() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["analytical", from, to],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      return (await (await fetch(`/api/accounting/analytical?${p}`, { credentials: "include" })).json()).data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Analytical Distribution"
        subtitle="Where money actually went — every voucher line split across programs/cost centers (Odoo-style analytical accounting)"
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block"><span className="text-xs font-medium text-gray-500 mb-1 block">From</span><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="block"><span className="text-xs font-medium text-gray-500 mb-1 block">To</span><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {data && (
            <div className="ml-auto">
              <ExportButtons
                filename="analytical-distribution"
                title={`Analytical Distribution (${data.period.from} → ${data.period.to})`}
                columns={[{ key: "code", label: "Code" }, { key: "costCenter", label: "Cost Center" }, { key: "lines", label: "Lines" }, { key: "total", label: "Amount (PKR)" }, { key: "pct", label: "Share %" }]}
                rows={(data.byCenter ?? []).map((r: any) => ({ ...r, pct: data.grandTotal ? ((r.total / data.grandTotal) * 100).toFixed(1) : "0" }))}
                totalColumn="total"
                signatures={["Accountant", "Finance Manager"]}
              />
            </div>
          )}
        </div>
      </Card>

      {isLoading && <LoadingTable rows={6} cols={4} />}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Donut + bars */}
          <Card className="lg:col-span-2">
            <div className="font-semibold flex items-center gap-2 mb-4"><PieChart className="w-4 h-4 text-emerald-600" /> Program Share</div>
            <div className="flex items-center justify-center mb-5">
              <DonutChart data={data.byCenter} total={data.grandTotal} />
            </div>
            <div className="space-y-2.5">
              {data.byCenter.map((r: any, i: number) => {
                const pct = data.grandTotal ? (r.total / data.grandTotal) * 100 : 0;
                return (
                  <div key={r.costCenterId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{r.costCenter}</span>
                      <span className="text-gray-500">{fmt(r.total)} · {pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
              {data.byCenter.length === 0 && <div className="text-sm text-gray-400 text-center py-8">No analytical distributions posted yet. Add distributions while creating vouchers.</div>}
            </div>
          </Card>

          {/* Matrix */}
          <Card className="lg:col-span-3 p-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 font-semibold">Expense head × program</div>
            <div className="overflow-x-auto max-h-[30rem] overflow-y-auto">
              <table className="table">
                <thead><tr><th>Account</th><th>Program</th><th className="text-right">Amount (PKR)</th></tr></thead>
                <tbody>
                  {data.matrix.map((m: any, i: number) => (
                    <tr key={i}>
                      <td><span className="font-mono text-xs text-gray-400">{m.accountCode}</span> {m.accountName}</td>
                      <td>{m.costCenter}</td>
                      <td className="text-right font-medium">{fmt(m.total)}</td>
                    </tr>
                  ))}
                  {data.matrix.length === 0 && <tr><td colSpan={3} className="text-center text-sm text-gray-400 py-8">No data</td></tr>}
                </tbody>
                {data.matrix.length > 0 && (
                  <tfoot><tr className="bg-emerald-50/60"><td colSpan={2} className="font-bold text-right">Total distributed</td><td className="text-right font-bold text-emerald-700">{fmt(data.grandTotal)}</td></tr></tfoot>
                )}
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function DonutChart({ data, total }: { data: { costCenter: string; total: number }[]; total: number }) {
  if (!total) return <div className="w-40 h-40 rounded-full border-[14px] border-gray-100 flex items-center justify-center text-xs text-gray-400">No data</div>;
  let acc = 0;
  const segs = data.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.total;
    const end = (acc / total) * 360;
    return `${COLORS[i % COLORS.length]} ${start}deg ${end}deg`;
  });
  return (
    <div className="relative w-44 h-44 rounded-full" style={{ background: `conic-gradient(${segs.join(",")})` }}>
      <div className="absolute inset-5 bg-white rounded-full flex flex-col items-center justify-center">
        <div className="text-lg font-bold text-[#1c2b26]">{fmt(total)}</div>
        <div className="text-[10px] uppercase tracking-wide text-gray-400">PKR total</div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="accounting.analytical">
      <AnalyticalInner />
    </RequireAccess>
  );
}
