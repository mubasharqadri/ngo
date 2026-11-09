"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Cities"
      subtitle="Cities within districts"
      apiBase="/api/setup/cities"
      module="setup.cities"
      singular="City"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true },
        { key: "districtId", label: "District", type: "select", optionsFrom: { api: "/api/setup/districts", valueKey: "id", labelKey: "name" } }]}
    />
  );
}
