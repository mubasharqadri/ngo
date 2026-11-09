"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
import { DONOR_TYPES, SUPPORT_TYPES, SUPPORT_THROUGH, GENDERS, RELIGIONS, BLOOD_GROUPS, OCCUPATIONS, FATHER_GUARDIAN_LABEL } from "@/lib/options";
import { printPersonForm } from "@/lib/exports";

const dupCheck = (key: string) => (value: unknown, row: Record<string, unknown>, existing: Record<string, unknown>[]) => {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  const hit = existing.find((r) => String(r[key] ?? "").trim().toLowerCase() === v && r.id !== row.id);
  return hit ? `Duplicate — this ${key === "membershipNo" ? "membership no" : "number"} already exists (record #${hit.id})` : null;
};

function printDonorForm(r: Record<string, unknown>, orientation: "portrait" | "landscape" = "portrait") {
  const s = (k: string) => String(r[k] ?? "");
  printPersonForm({
    formTitle: "Donor Registration Form",
    regNo: s("membershipNo") || s("registeredNo") || `D-${r.id}`,
    personName: s("name") || "—",
    photoUrl: s("photoUrl") || undefined,
    remarks: s("remarks"),
    orientation,
    sections: [
      {
        title: "Identity",
        rows: [
          { label: "Donor Type", value: s("donorType") },
          { label: "CNIC", value: s("cnic") },
          { label: FATHER_GUARDIAN_LABEL, value: s("fatherName") },
          { label: "Gender", value: s("gender") },
          { label: "Date of Birth", value: s("dateOfBirth") },
          { label: "Occupation", value: s("occupation") },
          { label: "Religion", value: s("religion") },
          { label: "Blood Group", value: s("bloodGroup") },
        ],
      },
      {
        title: "Membership & Registration",
        rows: [
          { label: "Membership No", value: s("membershipNo") },
          { label: "Membership Date", value: s("membershipDate") },
          { label: "Registered No", value: s("registeredNo") },
          { label: "NTN No", value: s("ntnNo") },
          { label: "STN No", value: s("stnNo") },
        ],
      },
      {
        title: "Contact & Location",
        rows: [
          { label: "Contact Person", value: s("contactPerson") },
          { label: "Phone No", value: s("phone") },
          { label: "Mobile No", value: s("mobileNo") },
          { label: "Email ID", value: s("email") },
          { label: "Address", value: s("address") },
          { label: "Permanent Address", value: s("permanentAddress") },
          { label: "Area", value: s("area") || s("areaId") },
          { label: "City", value: s("city") || `#${r.cityId ?? ""}` },
          { label: "Country", value: s("country") || `#${r.countryId ?? ""}` },
        ],
      },
      {
        title: "Support",
        rows: [
          { label: "Support Type", value: s("supportType") },
          { label: "Support Through", value: s("supportThrough") },
          { label: "Introducer Name", value: s("introducerName") },
          { label: "Anonymous", value: r.isAnonymous ? "Yes" : "No" },
        ],
      },
      {
        title: "Destitute Reference",
        rows: [
          { label: "Name of Destitute", value: s("nameOfDestitute") },
          { label: "Destitute Address", value: s("destituteAddress") },
          { label: "Destitute Contact", value: s("destituteContact") },
        ],
      },
    ],
  });
}

export default function Page() {
  return (
    <CrudPage
      title="Donors"
      subtitle="Complete donor master — membership, tax, contact, support and destitute reference"
      apiBase="/api/donations/donors"
      module="donations.donors"
      singular="Donor"
      rowPrint={(r) => printDonorForm(r)}
      searchPlaceholder="Search by name, membership #, NTN, phone, CNIC..."
      fields={[
        { key: "id", label: "ID", hideInForm: true },
        // Identity
        { key: "name", label: "Name", required: true, section: "Identity" },
        { key: "donorType", label: "Donor Type", type: "select", options: DONOR_TYPES, section: "Identity", render: (v) => <Badge tone={v === "zakat" ? "amber" : v === "corporate" ? "sky" : "slate"}>{String(v ?? "individual")}</Badge> },
        { key: "photoUrl", label: "Picture", type: "photo", section: "Identity", hideInTable: true },
        { key: "cnic", label: "CNIC", section: "Identity" },
        { key: "fatherName", label: FATHER_GUARDIAN_LABEL, section: "Identity" },
        { key: "gender", label: "Gender", type: "select", options: GENDERS, section: "Identity" },
        { key: "dateOfBirth", label: "Date of Birth", type: "date", section: "Identity" },
        { key: "occupation", label: "Occupation", type: "select", options: OCCUPATIONS, section: "Identity" },
        { key: "religion", label: "Religion", type: "select", options: RELIGIONS, section: "Identity" },
        { key: "bloodGroup", label: "Blood Group", type: "select", options: BLOOD_GROUPS, section: "Identity" },
        // Membership
        {
          key: "membershipNo", label: "Membership No", section: "Membership & Registration",
          suggestNext: true, validate: dupCheck("membershipNo"),
        },
        { key: "membershipDate", label: "Membership Date", type: "date", section: "Membership & Registration" },
        { key: "registeredNo", label: "Registered No", section: "Membership & Registration" },
        { key: "ntnNo", label: "NTN No", section: "Membership & Registration" },
        { key: "stnNo", label: "STN No", section: "Membership & Registration" },
        // Location (cascading: country → province → district → city → area)
        { key: "countryId", label: "Country", type: "select", optionsFrom: { api: "/api/setup/countries", valueKey: "id", labelKey: "name" }, section: "Location" },
        { key: "provinceId", label: "Province", type: "select", cascade: { parentField: "countryId", api: "/api/setup/provinces" }, section: "Location" },
        { key: "districtId", label: "District", type: "select", cascade: { parentField: "provinceId", api: "/api/setup/districts" }, section: "Location" },
        { key: "cityId", label: "City (district's city)", type: "select", cascade: { parentField: "provinceId", altParentField: "districtId", api: "/api/setup/cities" }, section: "Location" },
        { key: "areaId", label: "Area", areaOf: "cityId", storeNameAs: "area", type: "select", section: "Location" },
        // Contact
        { key: "contactPerson", label: "Contact Person", section: "Contact" },
        { key: "phone", label: "Phone No", section: "Contact" },
        { key: "mobileNo", label: "Mobile No", section: "Contact" },
        { key: "email", label: "Email ID", type: "email", section: "Contact" },
        { key: "address", label: "Address", type: "textarea", section: "Contact", hideInTable: true },
        { key: "permanentAddress", label: "Permanent Address", type: "textarea", section: "Contact", hideInTable: true },
        { key: "city", label: "City (legacy)", hideInForm: true, hideInTable: true },
        { key: "country", label: "Country (legacy)", hideInForm: true, hideInTable: true },
        // Support
        { key: "supportType", label: "Support Type", type: "select", options: SUPPORT_TYPES, section: "Support" },
        { key: "supportThrough", label: "Support Through", type: "select", options: SUPPORT_THROUGH, section: "Support" },
        { key: "introducerName", label: "Introducer Name", section: "Support" },
        { key: "isAnonymous", label: "Anonymous", type: "boolean", section: "Support" },
        // Destitute
        { key: "nameOfDestitute", label: "Name of Destitute", section: "Destitute Reference" },
        { key: "destituteAddress", label: "Destitute Address", type: "textarea", section: "Destitute Reference", hideInTable: true },
        { key: "destituteContact", label: "Destitute Contact", section: "Destitute Reference" },
        { key: "remarks", label: "Remarks", type: "textarea", section: "Other", hideInTable: true },
      ]}
    />
  );
}
