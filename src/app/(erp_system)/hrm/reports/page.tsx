"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, StatCard, LoadingTable, Badge } from "@/components/ui/Breadcrumbs";
import { Users, Wallet, CalendarCheck, Briefcase } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";
import { RequireAccess } from "@/components/RequireAccess";

function HrmReportsInner() {
  const { data, isLoading } = useQuery({
    queryKey: ["hrm-reports"],
    queryFn: async () => {
      const [emp, sal, att] = await Promise.all([
        fetch("/api/hrm/employees?limit=500", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/hrm/salaries?limit=500", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/hrm/attendance?limit=500", { credentials: "include" }).then((r) => r.json()),
      ]);
      return { employees: emp.data ?? [], salaries: sal.data ?? [], attendance: att.data ?? [] };
    },
  });
  if (isLoading) return <LoadingTable rows={6} cols={4} />;
  if (!data) return null;

  const employees = data.employees as any[];
  const salaries = data.salaries as any[];
  const attendance = data.attendance as any[];
  const active = employees.filter((e) => e.status === "active");
  const paidSalaries = salaries.filter((s) => s.status === "paid");
  const totalPaid = paidSalaries.reduce((s, x) => s + Number(x.net || 0), 0);
  const presentRate = attendance.length
    ? Math.round((attendance.filter((a) => a.status === "present").length / attendance.length) * 100)
    : 0;

  const byDept: Record<string, { count: number; salary: number }> = {};
  for (const e of active) {
    const d = e.department ?? "Other";
    if (!byDept[d]) byDept[d] = { count: 0, salary: 0 };
    byDept[d].count++;
    byDept[d].salary += Number(e.salary || 0);
  }
  const deptRows = Object.entries(byDept).map(([dept, v]) => ({ department: dept, employees: v.count, monthlyPayroll: v.salary }));
  const fmtPKR = (n: number) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <PageHeader
        title="HRM Reports"
        subtitle="Staff, payroll and attendance analytics — export or print A4"
        actions={
          <ExportButtons
            filename="hrm-report"
            title="HRM Report — Payroll by Department"
            columns={[
              { key: "department", label: "Department" },
              { key: "employees", label: "Employees" },
              { key: "monthlyPayroll", label: "Monthly Payroll (PKR)" },
            ]}
            rows={deptRows as unknown as Record<string, unknown>[]}
            totalColumn="monthlyPayroll"
            signatures={["HR Officer", "Executive Director"]}
          />
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Staff" value={active.length} icon={<Briefcase className="w-5 h-5" />} tone="emerald" />
        <StatCard label="Monthly Payroll" value={fmtPKR(deptRows.reduce((s, d) => s + d.monthlyPayroll, 0))} icon={<Wallet className="w-5 h-5" />} tone="sky" />
        <StatCard label="Salaries Paid" value={paidSalaries.length} icon={<Users className="w-5 h-5" />} tone="violet" />
        <StatCard label="Attendance Rate" value={`${presentRate}%`} icon={<CalendarCheck className="w-5 h-5" />} tone="amber" />
      </div>
      <Card>
        <h3 className="font-semibold mb-3">Payroll by Department</h3>
        <table className="table">
          <thead><tr><th>Department</th><th>Active Employees</th><th className="text-right">Monthly Payroll</th></tr></thead>
          <tbody>
            {deptRows.map((d) => (
              <tr key={d.department}>
                <td><Badge tone="slate">{d.department}</Badge></td>
                <td>{d.employees}</td>
                <td className="text-right font-semibold">{fmtPKR(d.monthlyPayroll)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td className="font-bold" colSpan={2}>Total</td>
              <td className="text-right font-bold">{fmtPKR(deptRows.reduce((s, d) => s + d.monthlyPayroll, 0))}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="hrm.reports">
      <HrmReportsInner />
    </RequireAccess>
  );
}
