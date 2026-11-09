"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, StatCard, LoadingTable, Badge } from "@/components/ui/Breadcrumbs";
import { Megaphone, UserCircle2, TrendingUp, Target } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";
import { RequireAccess } from "@/components/RequireAccess";

function CrmReportsInner() {
  const { data, isLoading } = useQuery({
    queryKey: ["crm-reports"],
    queryFn: async () => {
      const [leads, camps] = await Promise.all([
        fetch("/api/crm/leads?limit=500", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/crm/campaigns?limit=500", { credentials: "include" }).then((r) => r.json()),
      ]);
      return { leads: leads.data ?? [], campaigns: camps.data ?? [] };
    },
  });
  if (isLoading) return <LoadingTable rows={6} cols={4} />;
  if (!data) return null;

  const leads = data.leads as any[];
  const campaigns = data.campaigns as any[];
  const stages = ["new", "contacted", "qualified", "converted", "lost"];
  const byStage = stages.map((s) => ({ stage: s, leads: leads.filter((l) => l.stage === s).length }));
  const converted = leads.filter((l) => l.stage === "converted").length;
  const convRate = leads.length ? Math.round((converted / leads.length) * 100) : 0;
  const targetTotal = campaigns.reduce((s, c) => s + Number(c.target || 0), 0);
  const raisedTotal = campaigns.reduce((s, c) => s + Number(c.raised || 0), 0);
  const fmtPKR = (n: number) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <PageHeader
        title="CRM Reports"
        subtitle="Lead pipeline and campaign performance — export or print A4"
        actions={
          <ExportButtons
            filename="crm-report"
            title="CRM Report — Lead Pipeline"
            columns={[
              { key: "stage", label: "Stage" },
              { key: "leads", label: "Leads" },
            ]}
            rows={byStage as unknown as Record<string, unknown>[]}
            totalColumn="leads"
          />
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Leads" value={leads.length} icon={<UserCircle2 className="w-5 h-5" />} tone="violet" />
        <StatCard label="Conversion Rate" value={`${convRate}%`} icon={<TrendingUp className="w-5 h-5" />} tone="emerald" />
        <StatCard label="Campaigns" value={campaigns.length} icon={<Megaphone className="w-5 h-5" />} tone="sky" />
        <StatCard label="Raised vs Target" value={`${targetTotal ? Math.round((raisedTotal / targetTotal) * 100) : 0}%`} hint={fmtPKR(raisedTotal)} icon={<Target className="w-5 h-5" />} tone="amber" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold mb-3">Lead Pipeline</h3>
          <div className="space-y-2.5">
            {byStage.map((s) => {
              const pct = leads.length ? (s.leads / leads.length) * 100 : 0;
              return (
                <div key={s.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium">{s.stage}</span>
                    <span className="text-gray-500">{s.leads} leads</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Campaign Performance</h3>
          <table className="table">
            <thead><tr><th>Campaign</th><th>Status</th><th className="text-right">Raised / Target</th></tr></thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td><Badge tone={c.status === "active" ? "emerald" : c.status === "completed" ? "sky" : "slate"}>{c.status}</Badge></td>
                  <td className="text-right text-xs">{fmtPKR(Number(c.raised || 0))} / {fmtPKR(Number(c.target || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="crm.reports">
      <CrmReportsInner />
    </RequireAccess>
  );
}
