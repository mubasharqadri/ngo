"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Provinces"
      subtitle="Provinces or states"
      apiBase="/api/setup/provinces"
      module="setup.provinces"
      singular="Province"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true },
        { key: "countryId", label: "Country", type: "select", optionsFrom: { api: "/api/setup/countries", valueKey: "id", labelKey: "name" } }]}
    />
  );
}
