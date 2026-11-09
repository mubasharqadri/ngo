"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
import {
  DONEE_TYPES, DONEE_CATEGORIES, DONEE_STATUS, PROBLEM_TYPES, WORK_ABILITY, HOME_STATUS,
  GENDERS, RELIGIONS, NATIONALITIES, QUALIFICATIONS, OCCUPATIONS, FATHER_GUARDIAN_LABEL,
} from "@/lib/options";
import { printPersonForm } from "@/lib/exports";

const dupCheck = (key: string) => (value: unknown, row: Record<string, unknown>, existing: Record<string, unknown>[]) => {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  const hit = existing.find((r) => String(r[key] ?? "").trim().toLowerCase() === v && r.id !== row.id);
  return hit ? `Duplicate — this number already exists (record #${hit.id})` : null;
};

function printDoneeForm(r: Record<string, unknown>) {
  const s = (k: string) => String(r[k] ?? "");
  printPersonForm({
    formTitle: "Donee (Beneficiary) Registration Form",
    regNo: s("registeredNo") || `B-${r.id}`,
    personName: s("name") || "—",
    photoUrl: s("photoUrl") || undefined,
    remarks: s("remarks"),
    sections: [
      {
        title: "Identity",
        rows: [
          { label: "Donee Type", value: s("doneeType") },
          { label: "Category", value: s("category") },
          { label: "Problem Type", value: s("problemType") },
          { label: "Status", value: s("status") },
          { label: "CNIC", value: s("cnic") },
          { label: FATHER_GUARDIAN_LABEL, value: s("fatherName") },
          { label: "Gender", value: s("gender") },
          { label: "Date of Birth", value: s("dateOfBirth") },
          { label: "Religion", value: s("religion") },
          { label: "Nationality", value: s("nationality") },
          { label: "Qualification", value: s("qualification") },
          { label: "Occupation", value: s("occupation") },
        ],
      },
      {
        title: "Contact & Location",
        rows: [
          { label: "Contact Person", value: s("contactPerson") },
          { label: "Phone No", value: s("phone") },
          { label: "Email ID", value: s("email") },
          { label: "Address", value: s("address") },
          { label: "Area", value: s("area") || s("areaId") },
          { label: "City", value: s("city") || `#${r.cityId ?? ""}` },
          { label: "STN No", value: s("stnNo") },
          { label: "NTN No", value: s("ntnNo") },
        ],
      },
      {
        title: "Family Survey",
        rows: [
          { label: "Home Status", value: s("homeStatus") },
          { label: "Family Members", value: s("familySize") },
          { label: "Men Members", value: s("menMembers") },
          { label: "Women Members", value: s("womenMembers") },
          { label: "Boy Members", value: s("boyMembers") },
          { label: "Girl Members", value: s("girlMembers") },
          { label: "Family Income (Monthly)", value: s("monthlyIncome") },
          { label: "Personal Income", value: s("personalIncome") },
          { label: "Work Ability", value: s("workAbility") },
        ],
      },
      {
        title: "Case & Bank",
        rows: [
          { label: "Case History", value: s("caseHistory") },
          { label: "Introducer Name", value: s("introducerName") },
          { label: "Introducer Phone", value: s("introducerPhone") },
          { label: "Case Coordinator", value: s("caseCoordinator") },
          { label: "Bank Account Title", value: s("bankAccountTitle") },
          { label: "Bank Account No", value: s("bankAccountNo") },
          { label: "Bank Name", value: s("bankName") },
        ],
      },
    ],
  });
}

export default function Page() {
  return (
    <CrudPage
      title="Donees"
      subtitle="Complete beneficiary master — family survey, case history and bank details"
      apiBase="/api/donations/donees"
      module="donations.donees"
      singular="Donee"
      rowPrint={(r) => printDoneeForm(r)}
      searchPlaceholder="Search by name, CNIC, registered #, city..."
      fields={[
        { key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true, section: "Identity" },
        { key: "doneeType", label: "Donee Type", type: "select", options: DONEE_TYPES, required: true, section: "Identity", render: (v) => <Badge tone="sky">{String(v ?? "—")}</Badge> },
        { key: "category", label: "Category", type: "select", options: DONEE_CATEGORIES, section: "Identity", render: (v) => <Badge tone={v === "orphan" ? "amber" : v === "medical" ? "rose" : "slate"}>{String(v ?? "—")}</Badge> },
        { key: "problemType", label: "Problem Type", type: "select", options: PROBLEM_TYPES, required: true, section: "Identity", render: (v) => <Badge tone={v === "medical" ? "rose" : v === "education" ? "violet" : "amber"}>{String(v ?? "—")}</Badge> },
        { key: "status", label: "Status", type: "select", options: DONEE_STATUS, section: "Identity", render: (v) => <Badge tone={v === "active" ? "emerald" : v === "graduated" ? "sky" : "slate"}>{String(v ?? "active")}</Badge> },
        { key: "photoUrl", label: "Picture", type: "photo", section: "Identity", hideInTable: true },
        { key: "cnic", label: "CNIC", section: "Identity" },
        { key: "fatherName", label: FATHER_GUARDIAN_LABEL, section: "Identity" },
        { key: "gender", label: "Gender", type: "select", options: GENDERS, section: "Identity" },
        { key: "dateOfBirth", label: "Date of Birth", type: "date", section: "Identity" },
        { key: "religion", label: "Religion", type: "select", options: RELIGIONS, section: "Identity" },
        { key: "nationality", label: "Nationality", type: "select", options: NATIONALITIES, section: "Identity" },
        { key: "qualification", label: "Qualification", type: "select", options: QUALIFICATIONS, section: "Identity" },
        { key: "occupation", label: "Occupation", type: "select", options: OCCUPATIONS, section: "Identity" },
        // Contact & Location (cascading: country → province → district → city → area)
        { key: "contactPerson", label: "Contact Person", section: "Contact & Location" },
        { key: "phone", label: "Phone No", section: "Contact & Location" },
        { key: "email", label: "Email ID", type: "email", section: "Contact & Location" },
        { key: "address", label: "Address", type: "textarea", section: "Contact & Location", hideInTable: true },
        { key: "countryId", label: "Country", type: "select", optionsFrom: { api: "/api/setup/countries", valueKey: "id", labelKey: "name" }, section: "Contact & Location" },
        { key: "provinceId", label: "Province", type: "select", cascade: { parentField: "countryId", api: "/api/setup/provinces" }, section: "Contact & Location" },
        { key: "districtId", label: "District", type: "select", cascade: { parentField: "provinceId", api: "/api/setup/districts" }, section: "Contact & Location" },
        { key: "cityId", label: "City (district's city)", type: "select", cascade: { parentField: "provinceId", altParentField: "districtId", api: "/api/setup/cities" }, section: "Contact & Location" },
        { key: "areaId", label: "Area", areaOf: "cityId", storeNameAs: "area", type: "select", section: "Contact & Location" },
        { key: "stnNo", label: "STN No", section: "Contact & Location" },
        { key: "ntnNo", label: "NTN No", section: "Contact & Location" },
        // Membership / Registered No
        { key: "registeredNo", label: "Membership / Registered No", section: "Registration", suggestNext: true, validate: dupCheck("registeredNo") },
        // Family
        { key: "homeStatus", label: "Home Status", type: "select", options: HOME_STATUS, section: "Family Survey" },
        { key: "familySize", label: "Family Members", type: "number", section: "Family Survey" },
        { key: "menMembers", label: "Men Members", type: "number", section: "Family Survey" },
        { key: "womenMembers", label: "Women Members", type: "number", section: "Family Survey" },
        { key: "boyMembers", label: "Boy Members", type: "number", section: "Family Survey" },
        { key: "girlMembers", label: "Girl Members", type: "number", section: "Family Survey" },
        { key: "monthlyIncome", label: "Family Income (Monthly)", type: "number", section: "Family Survey" },
        { key: "personalIncome", label: "Personal Income", type: "number", section: "Family Survey" },
        { key: "workAbility", label: "Work Ability", type: "select", options: WORK_ABILITY, section: "Family Survey" },
        // Case & Bank
        { key: "caseHistory", label: "Case History", type: "textarea", section: "Case & Bank", hideInTable: true },
        { key: "introducerName", label: "Introducer Name", section: "Case & Bank" },
        { key: "introducerPhone", label: "Introducer Phone", section: "Case & Bank" },
        { key: "caseCoordinator", label: "Case Coordinator", section: "Case & Bank" },
        { key: "bankAccountTitle", label: "Bank Account Title", section: "Case & Bank" },
        { key: "bankAccountNo", label: "Bank Account No", section: "Case & Bank" },
        { key: "bankName", label: "Bank Name", section: "Case & Bank" },
        { key: "remarks", label: "Remarks", type: "textarea", section: "Case & Bank", hideInTable: true },
      ]}
    />
  );
}
