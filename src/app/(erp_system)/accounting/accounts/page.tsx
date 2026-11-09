"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Chart of Accounts"
      subtitle="Financial account structure"
      apiBase="/api/accounting/accounts"
      module="accounting.accounts"
      singular="Account"
      totalColumn="openingBalance"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "code", label: "Code", required: true, className: "font-mono" },
        { key: "name", label: "Name", required: true },
        { key: "type", label: "Type", type: "select", options: [ { value: "asset", label: "Asset" }, { value: "liability", label: "Liability" }, { value: "income", label: "Income" }, { value: "expense", label: "Expense" }, { value: "equity", label: "Equity" } ], render: (v) => <Badge tone={v === "income" ? "emerald" : v === "expense" ? "rose" : v === "asset" ? "sky" : v === "liability" ? "amber" : "slate"}>{String(v ?? "—")}</Badge> },
        { key: "openingBalance", label: "Opening Balance", type: "number" },
        { key: "isActive", label: "Active", type: "boolean", render: (v) => <Badge tone={v ? "emerald" : "slate"}>{v ? "Yes" : "No"}</Badge> }]}
    />
  );
}
