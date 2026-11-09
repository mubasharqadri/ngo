"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Cost Centers"
      subtitle="Track spending by program"
      apiBase="/api/setup/cost-centers"
      module="setup.costcenters"
      singular="Cost Center"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true },
        { key: "code", label: "Code" },
        { key: "description", label: "Description", type: "textarea", hideInTable: true },
        { key: "isActive", label: "Active", type: "boolean", render: (v) => <Badge tone={v ? "emerald" : "slate"}>{v ? "Active" : "Inactive"}</Badge> }]}
    />
  );
}
