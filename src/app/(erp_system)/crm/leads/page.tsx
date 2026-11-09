"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Leads"
      subtitle="Prospective donor leads"
      apiBase="/api/crm/leads"
      module="crm.leads"
      singular="Lead"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email", type: "email" },
        { key: "source", label: "Source", type: "select", options: [ { value: "website", label: "Website" }, { value: "referral", label: "Referral" }, { value: "event", label: "Event" }, { value: "walk-in", label: "Walk-in" } ] },
        { key: "stage", label: "Stage", type: "select", options: [ { value: "new", label: "New" }, { value: "contacted", label: "Contacted" }, { value: "qualified", label: "Qualified" }, { value: "converted", label: "Converted" }, { value: "lost", label: "Lost" } ], render: (v) => <Badge tone={v === "converted" ? "emerald" : v === "lost" ? "rose" : v === "qualified" ? "sky" : "amber"}>{String(v ?? "new")}</Badge> },
        { key: "campaignId", label: "Campaign", type: "select", optionsFrom: { api: "/api/crm/campaigns", valueKey: "id", labelKey: "name" } },
        { key: "assignedTo", label: "Assigned To", type: "select", optionsFrom: { api: "/api/administration/users", valueKey: "id", labelKey: "fullName" } },
        { key: "notes", label: "Notes", type: "textarea", hideInTable: true }]}
    />
  );
}
