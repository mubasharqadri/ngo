"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Companies"
      subtitle="Organizations in the system"
      apiBase="/api/setup/companies"
      module="setup.companies"
      singular="Company"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true },
        { key: "tagline", label: "Tagline" },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "address", label: "Address", type: "textarea", hideInTable: true },
        { key: "city", label: "City" },
        { key: "country", label: "Country" },
        { key: "regNumber", label: "Reg #" },
        { key: "ntn", label: "NTN" }]}
    />
  );
}
