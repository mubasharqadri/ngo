"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
export default function Page() {
  return (
    <CrudPage
      title="Users"
      subtitle="System users, roles and access rights"
      apiBase="/api/administration/users"
      module="administration.users"
      singular="User"
      fields={[{ key: "id", label: "ID", hideInForm: true },
        { key: "fullName", label: "Full Name", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "password", label: "Password", type: "password", hideInTable: true },
        { key: "roleId", label: "Role", type: "select", optionsFrom: { api: "/api/administration/roles", valueKey: "id", labelKey: "name" } },
        { key: "isActive", label: "Active", type: "boolean", render: (v) => <Badge tone={v ? "emerald" : "slate"}>{v ? "Active" : "Inactive"}</Badge> }]}
    />
  );
}
