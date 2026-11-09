"use client";
import { useState } from "react";
import { PageHeader, Card } from "@/components/ui/Breadcrumbs";
import { Database, Upload } from "lucide-react";
import { ImportModal } from "@/components/ImportModal";
import { RequireAccess } from "@/components/RequireAccess";
import { useToast } from "@/components/ui/toast";

const TARGETS = [
  { label: "Donors", api: "/api/donations/donors", desc: "Donor master data", fields: ["name", "donorType", "cnic", "phone", "email", "address", "city", "country"] },
  { label: "Donees", api: "/api/donations/donees", desc: "Beneficiary families", fields: ["name", "category", "status", "cnic", "phone", "city", "familySize", "monthlyIncome"] },
  { label: "Employees", api: "/api/hrm/employees", desc: "Staff records", fields: ["employeeCode", "fullName", "designation", "department", "phone", "email", "cnic", "dateOfJoining", "salary", "status"] },
  { label: "Chart of Accounts", api: "/api/accounting/accounts", desc: "Accounting heads", fields: ["code", "name", "type", "openingBalance"] },
  { label: "Cost Centers", api: "/api/setup/cost-centers", desc: "Program cost centers", fields: ["name", "code", "description"] },
  { label: "Countries", api: "/api/setup/countries", desc: "Country list", fields: ["name", "code", "phoneCode"] },
  { label: "Cities", api: "/api/setup/cities", desc: "City list", fields: ["name", "districtId"] },
  { label: "Campaigns", api: "/api/crm/campaigns", desc: "CRM campaigns", fields: ["name", "type", "status", "startDate", "endDate", "target", "raised", "description"] },
  { label: "Leads", api: "/api/crm/leads", desc: "Prospective donors", fields: ["name", "phone", "email", "source", "stage", "notes"] },
];

function UploadInner() {
  const [target, setTarget] = useState<typeof TARGETS[number] | null>(null);
  const toast = useToast();
  return (
    <div>
      <PageHeader title="Database Upload" subtitle="Bulk import data into any module from CSV files — each row is validated and logged" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TARGETS.map((t) => (
          <button
            key={t.api}
            onClick={() => setTarget(t)}
            className="card p-5 text-left hover:border-emerald-300 hover:shadow-md transition group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-100 transition">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">{t.label} <Upload className="w-3.5 h-3.5 text-gray-400" /></div>
                <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                <div className="text-[10px] text-gray-400 mt-1.5 font-mono truncate">{t.fields.join(", ")}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {target && (
        <ImportModal
          open={!!target}
          onClose={() => setTarget(null)}
          api={target.api}
          fields={target.fields.map((f) => ({ key: f, label: f, type: ["familySize", "monthlyIncome", "salary", "openingBalance", "target", "raised", "districtId"].includes(f) ? "number" : "text" }))}
          title={target.label}
          onDone={() => toast.push({ title: "Data imported", desc: `${target.label} updated successfully.`, tone: "success" })}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="database.upload">
      <UploadInner />
    </RequireAccess>
  );
}
