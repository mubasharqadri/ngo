"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
import { LEAVE_TYPES } from "@/lib/options";

export default function Page() {
  return (
    <CrudPage
      title="Leaves"
      subtitle="Employee leave applications — Casual, Sick, Annual, Maternity, Hajj, Umrah, Special"
      apiBase="/api/hrm/leaves"
      module="hrm.leaves"
      singular="Leave"
      stickyScroll
      fields={[
        { key: "id", label: "ID", hideInForm: true },
        { key: "employeeId", label: "Employee", type: "select", required: true, optionsFrom: { api: "/api/hrm/employees", valueKey: "id", labelKey: "fullName" } },
        { key: "leaveType", label: "Type", type: "select", options: LEAVE_TYPES, render: (v) => <Badge tone={v === "hajj" ? "emerald" : v === "umrah" ? "sky" : v === "special" ? "violet" : "slate"}>{String(v ?? "—")}</Badge> },
        { key: "fromDate", label: "From", type: "date", required: true },
        { key: "toDate", label: "To", type: "date", required: true },
        { key: "days", label: "Days", type: "number" },
        { key: "status", label: "Status", type: "select", options: [
          { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" },
        ], render: (v) => <Badge tone={v === "approved" ? "emerald" : v === "rejected" ? "rose" : "amber"}>{String(v ?? "pending")}</Badge> },
        { key: "reason", label: "Reason", type: "textarea", hideInTable: true },
      ]}
    />
  );
}
