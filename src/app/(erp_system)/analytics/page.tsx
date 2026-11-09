"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, StatCard, LoadingTable } from "@/components/ui/Breadcrumbs";
import { TrendingUp, DollarSign, Users, Receipt } from "lucide-react";

function PageInner() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard", { credentials: "include" });
      const j = await res.json();
      return j.data;
    },
  });
  const fmtPKR = (n: number) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);
  if (isLoading) return <LoadingTable rows={4} cols={4} />;
  if (!data) return null;
  return (
    <div>
      <PageHeader title="Analytics" subtitle="Deep insights into your organization's performance" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Collected" value={fmtPKR(data.stats.totalCollected)} icon={<DollarSign className="w-5 h-5" />} tone="emerald" />
        <StatCard label="Last 30 days" value={fmtPKR(data.stats.last30dCollected)} icon={<TrendingUp className="w-5 h-5" />} tone="sky" />
        <StatCard label="Donors" value={data.stats.totalDonors} icon={<Users className="w-5 h-5" />} tone="rose" />
        <StatCard label="Receipts" value={data.stats.totalReceipts} icon={<Receipt className="w-5 h-5" />} tone="violet" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-4">Monthly Collections (6 months)</h3>
          <div className="h-56 flex items-end gap-3">
            {data.monthly.map((m: {month: string; total: string}) => {
              const max = Math.max(...data.monthly.map((x: {total:string}) => Number(x.total)), 1);
              const h = (Number(m.total) / max) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-xs text-gray-500">{fmtPKR(Number(m.total)).replace('PKR ','')}</div>
                  <div className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400" style={{ height: `${Math.max(h, 4)}%` }} />
                  <div className="text-xs text-gray-500">{m.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-4">Fund Distribution</h3>
          <div className="space-y-3">
            {data.fundBreakdown.map((f: {fund: string; total: string}) => {
              const total = data.fundBreakdown.reduce((s: number, x: {total:string}) => s + Number(x.total), 0) || 1;
              const pct = (Number(f.total) / total) * 100;
              return (
                <div key={f.fund}>
                  <div className="flex justify-between text-sm mb-1"><span className="capitalize font-medium">{f.fund}</span><span>{pct.toFixed(0)}%</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width: `${pct}%`}} /></div>
                  <div className="text-xs text-gray-500 mt-0.5">{fmtPKR(Number(f.total))}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <h3 className="font-semibold mb-3">Top Donors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.topDonors.map((d: {name: string; total: string}, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-semibold">{d.name.charAt(0)}</div>
              <div className="flex-1">
                <div className="font-medium text-sm">{d.name}</div>
                <div className="text-xs text-gray-500">{fmtPKR(Number(d.total))}</div>
              </div>
              <div className="text-xs text-gray-400">#{i + 1}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

import { RequireAccess } from "@/components/RequireAccess";
export default function Page() {
  return (
    <RequireAccess module="analytics">
      <PageInner />
    </RequireAccess>
  );
}
