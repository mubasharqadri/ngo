"use client";
import Link from "next/link";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
import { Wand2 } from "lucide-react";

export default function Page() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <div className="text-xs text-emerald-900">
          <b>Payroll generation:</b> create the current or next month's payroll in one click — with custom deductions (with descriptions) per employee.
        </div>
        <Link href="/hrm/salaries/generate" className="btn btn-primary"><Wand2 className="w-4 h-4" /> Generate Monthly Payroll</Link>
      </div>
      <CrudPage
        title="Salaries"
        subtitle="Monthly salary records — basic, allowances, deductions (incl. other deductions with description), net"
        apiBase="/api/hrm/salaries"
        module="hrm.salaries"
        singular="Salary"
        stickyScroll
        totalColumn="net"
        fields={[
          { key: "id", label: "ID", hideInForm: true },
          { key: "employeeId", label: "Employee", type: "select", required: true, optionsFrom: { api: "/api/hrm/employees", valueKey: "id", labelKey: "fullName" } },
          { key: "month", label: "Month (YYYY-MM)", required: true },
          { key: "basic", label: "Basic", type: "number" },
          { key: "allowances", label: "Allowances", type: "number" },
          { key: "deductions", label: "Deductions", type: "number" },
          { key: "net", label: "Net Pay", type: "number" },
          { key: "status", label: "Status", type: "select", options: [
            { value: "draft", label: "Draft" }, { value: "paid", label: "Paid" },
          ], render: (v) => <Badge tone={v === "paid" ? "emerald" : "slate"}>{String(v ?? "draft")}</Badge> },
        ]}
      />
    </div>
  );
}
