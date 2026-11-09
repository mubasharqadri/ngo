"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Countries"
      subtitle="List of countries with codes"
      apiBase="/api/setup/countries"
      module="setup.countries"
      singular="Country"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true },
        { key: "code", label: "Code (ISO)", required: true },
        { key: "phoneCode", label: "Phone Code" }]}
    />
  );
}
