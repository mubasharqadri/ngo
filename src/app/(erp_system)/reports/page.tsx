"use client";
import { PageHeader } from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { FileBarChart2, DollarSign, Users, Receipt } from "lucide-react";
import { RequireAccess } from "@/components/RequireAccess";

function ReportsInner() {
  const reports = [
    { title: "Donation Summary", desc: "Overall collection trends by fund and period", href: "/accounting/reports", icon: DollarSign },
    { title: "Disbursement Report", desc: "Who received what, when and why", href: "/donations/disbursements", icon: Receipt },
    { title: "Staff & Payroll", desc: "HR and salary analytics", href: "/hrm/reports", icon: Users },
    { title: "Campaign Analytics", desc: "CRM performance and lead conversion", href: "/crm/reports", icon: FileBarChart2 },
    { title: "Audit Trail", desc: "Every change made by every user", href: "/administration/audit", icon: FileBarChart2 },
  ];
  return (
    <div>
      <PageHeader title="Reports" subtitle="Access detailed reports across modules — all exportable to Excel / PDF and printable on A4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(r => (
          <Link key={r.href + r.title} href={r.href} className="card p-5 hover:border-emerald-300 hover:shadow-md transition group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100">
                <r.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="reports">
      <ReportsInner />
    </RequireAccess>
  );
}
