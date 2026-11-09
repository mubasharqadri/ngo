"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Users, Heart, Receipt, Briefcase, TrendingUp, HandCoins,
  Megaphone, UserCircle2, ArrowUpRight, Calendar, DollarSign,
} from "lucide-react";
import { Card, StatCard, Badge, EmptyState, LoadingTable } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/Breadcrumbs";

type DashboardData = {
  stats: {
    totalDonors: number;
    totalDonees: number;
    totalReceipts: number;
    activeEmployees: number;
    openLeads: number;
    activeCampaigns: number;
    totalCollected: number;
    last30dCollected: number;
    totalDisbursed: number;
  };
  recentReceipts: { id: number; receiptNo: string; receiptDate: string; totalAmount: string; voucherNo: string | null; donorName: string | null }[];
  recentBatches: { id: number; batchNo: string; title: string; date: string; status: string; fund: string }[];
  topDonors: { name: string; total: string }[];
  monthly: { month: string; total: string }[];
  fundBreakdown: { fund: string; total: string }[];
};

const fmtPKR = (n: number) =>
  "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
};

function DashboardInner() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      const j = await res.json();
      return j.data;
    },
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of Shauoor Welfare Society's operations"
        actions={
          <div className="flex gap-2">
            <Link href="/donations/receipts/new" className="btn btn-primary">
              <Receipt className="w-4 h-4" /> New Receipt
            </Link>
            <Link href="/donations/donors" className="btn btn-ghost">
              <Users className="w-4 h-4" /> Add Donor
            </Link>
          </div>
        }
      />

      {error && (
        <div className="card p-4 mb-4 border-rose-200 bg-rose-50 text-rose-700">
          Failed to load dashboard. Please refresh or sign in again.
        </div>
      )}

      {isLoading && !data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="skeleton h-3 w-24 mb-2" />
                <div className="skeleton h-7 w-32" />
              </div>
            ))}
          </div>
          <LoadingTable rows={5} cols={5} />
        </>
      )}

      {data && (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Collected"
              value={fmtPKR(data.stats.totalCollected)}
              hint={`Last 30d: ${fmtPKR(data.stats.last30dCollected)}`}
              icon={<DollarSign className="w-5 h-5" />}
              tone="emerald"
            />
            <StatCard
              label="Total Disbursed"
              value={fmtPKR(data.stats.totalDisbursed)}
              hint={`${data.stats.totalReceipts} receipts`}
              icon={<HandCoins className="w-5 h-5" />}
              tone="sky"
            />
            <StatCard
              label="Donors"
              value={fmtShort(data.stats.totalDonors)}
              hint={`${data.stats.totalDonees} active donees`}
              icon={<Heart className="w-5 h-5" />}
              tone="rose"
            />
            <StatCard
              label="Active Campaigns"
              value={data.stats.activeCampaigns}
              hint={`${data.stats.openLeads} open leads`}
              icon={<Megaphone className="w-5 h-5" />}
              tone="violet"
            />
          </div>

          {/* Second row of stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Employees" value={data.stats.activeEmployees} icon={<Briefcase className="w-5 h-5" />} tone="amber" />
            <StatCard label="Receipts" value={fmtShort(data.stats.totalReceipts)} icon={<Receipt className="w-5 h-5" />} tone="sky" />
            <StatCard label="Open Leads" value={data.stats.openLeads} icon={<UserCircle2 className="w-5 h-5" />} tone="violet" />
            <StatCard label="Donees Served" value={data.stats.totalDonees} icon={<Heart className="w-5 h-5" />} tone="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Monthly collection chart */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Monthly Collections</h3>
                  <p className="text-xs text-gray-500">Last 6 months</p>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="h-52 flex items-end gap-3">
                {data.monthly.length === 0 && (
                  <div className="w-full text-center text-sm text-gray-400 py-8">No data yet</div>
                )}
                {data.monthly.map((m, i) => {
                  const max = Math.max(...data.monthly.map((x) => Number(x.total)), 1);
                  const h = (Number(m.total) / max) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="text-xs text-gray-500">{fmtShort(Number(m.total))}</div>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all"
                        style={{ height: `${Math.max(h, 4)}%` }}
                      />
                      <div className="text-xs text-gray-500">{m.month.slice(5)}/{m.month.slice(2, 4)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Fund breakdown */}
            <Card>
              <h3 className="font-semibold mb-4">Fund Breakdown</h3>
              <div className="space-y-3">
                {data.fundBreakdown.map((f) => {
                  const total = data.fundBreakdown.reduce((s, x) => s + Number(x.total), 0) || 1;
                  const pct = (Number(f.total) / total) * 100;
                  return (
                    <div key={f.fund}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize font-medium">{f.fund}</span>
                        <span className="text-gray-500">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{fmtPKR(Number(f.total))}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent receipts */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Recent Receipts</h3>
                <Link href="/donations/receipts" className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {data.recentReceipts.length === 0 ? (
                <EmptyState title="No receipts yet" />
              ) : (
                <div className="space-y-2">
                  {data.recentReceipts.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.donorName || "Anonymous"}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{r.receiptNo}</span>
                          <span>•</span>
                          <Calendar className="w-3 h-3" /> {r.receiptDate}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{fmtPKR(Number(r.totalAmount))}</div>
                        <Badge tone={r.voucherNo ? "violet" : "slate"}>{r.voucherNo ?? "no voucher"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top donors */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Top Donors</h3>
                <Link href="/donations/donors" className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                  All <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2.5">
                {data.topDonors.length === 0 && <div className="text-sm text-gray-400 py-4 text-center">No data</div>}
                {data.topDonors.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xs font-semibold flex items-center justify-center">
                      {d.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name}</div>
                      <div className="text-xs text-gray-500">{fmtPKR(Number(d.total))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent batches */}
          <Card className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Disbursement Batches</h3>
              <Link href="/donations/disbursements" className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {data.recentBatches.length === 0 ? (
              <EmptyState title="No batches yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Title</th>
                      <th>Date</th>
                      <th>Fund</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBatches.map((b) => (
                      <tr key={b.id}>
                        <td className="font-mono text-xs">{b.batchNo}</td>
                        <td className="font-medium">{b.title}</td>
                        <td>{b.date}</td>
                        <td><Badge tone="sky">{b.fund}</Badge></td>
                        <td>
                          <Badge
                            tone={
                              b.status === "paid" ? "emerald" :
                              b.status === "approved" ? "sky" :
                              b.status === "cancelled" ? "rose" : "slate"
                            }
                          >
                            {b.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

import { RequireAccess } from "@/components/RequireAccess";
export default function DashboardPage() {
  return (
    <RequireAccess module="dashboard">
      <DashboardInner />
    </RequireAccess>
  );
}
