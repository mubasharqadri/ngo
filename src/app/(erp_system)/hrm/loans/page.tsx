"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
import { ShieldAlert } from "lucide-react";

export default function Page() {
  return (
    <div>
      <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <b>Loan policy (auto-enforced, management-approved):</b> maximum loan = 3 months' salary cap · at most 2 active loans per employee (combined within the cap) ·
          installments never exceed 12 months (1 year) · no loan during probation.
        </div>
      </div>
      <CrudPage
        title="Loans"
        subtitle="Employee loans with installment plans"
        apiBase="/api/hrm/loans"
        module="hrm.loans"
        singular="Loan"
        stickyScroll
        totalColumn="amount"
        fields={[
          { key: "id", label: "ID", hideInForm: true },
          { key: "employeeId", label: "Employee", type: "select", required: true, optionsFrom: { api: "/api/hrm/employees", valueKey: "id", labelKey: "fullName" } },
          { key: "amount", label: "Amount", type: "number", required: true },
          { key: "installments", label: "Installments (max 12)", type: "number", required: true },
          { key: "startDate", label: "Start Date", type: "date", required: true },
          { key: "monthlyDeduction", label: "Monthly Deduction (auto)", type: "number", hideInForm: true },
          { key: "status", label: "Status", type: "select", options: [
            { value: "active", label: "Active" }, { value: "settled", label: "Settled" },
          ], render: (v) => <Badge tone={v === "settled" ? "emerald" : "amber"}>{String(v ?? "active")}</Badge> },
        ]}
      />
    </div>
  );
}
