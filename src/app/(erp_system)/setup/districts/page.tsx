"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Districts"
      subtitle="Districts within provinces"
      apiBase="/api/setup/districts"
      module="setup.districts"
      singular="District"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true },
        { key: "provinceId", label: "Province", type: "select", optionsFrom: { api: "/api/setup/provinces", valueKey: "id", labelKey: "name" } }]}
    />
  );
}
