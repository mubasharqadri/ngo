"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Campaigns"
      subtitle="Marketing and fundraising campaigns"
      apiBase="/api/crm/campaigns"
      module="crm.campaigns"
      singular="Campaign"
      totalColumn="raised"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true },
        { key: "type", label: "Type", type: "select", options: [ { value: "sms", label: "SMS" }, { value: "email", label: "Email" }, { value: "whatsapp", label: "WhatsApp" }, { value: "event", label: "Event" }, { value: "social", label: "Social" } ] },
        { key: "status", label: "Status", type: "select", options: [ { value: "planned", label: "Planned" }, { value: "active", label: "Active" }, { value: "completed", label: "Completed" } ], render: (v) => <Badge tone={v === "active" ? "emerald" : v === "completed" ? "sky" : "slate"}>{String(v ?? "planned")}</Badge> },
        { key: "startDate", label: "Start Date", type: "date" },
        { key: "endDate", label: "End Date", type: "date" },
        { key: "target", label: "Target (PKR)", type: "number" },
        { key: "raised", label: "Raised (PKR)", type: "number" },
        { key: "description", label: "Description", type: "textarea", hideInTable: true }]}
    />
  );
}
