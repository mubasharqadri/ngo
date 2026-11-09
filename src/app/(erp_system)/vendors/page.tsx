"use client";
import { CrudPage } from "@/components/CrudPage";

export default function Page() {
  return (
    <CrudPage
      title="Vendors"
      subtitle="Supplier & service partners — maintained as a subledger (not individual GL accounts)"
      apiBase="/api/vendors"
      module="vendors"
      singular="Vendor"
      searchPlaceholder="Search name, NTN, phone, email..."
      totalColumn="openingBalance"
      fields={[
        { key: "id", label: "ID", hideInForm: true },
        { key: "name", label: "Name", required: true, section: "Identity" },
        { key: "vendorType", label: "Type", type: "select", options: [
          { value: "supplier", label: "Supplier" }, { value: "contractor", label: "Contractor" }, { value: "service", label: "Service Provider" },
        ], section: "Identity" },
        { key: "cnic", label: "CNIC", section: "Identity" },
        { key: "ntnNo", label: "NTN No", section: "Identity" },
        { key: "phone", label: "Phone", section: "Contact" },
        { key: "email", label: "Email", type: "email", section: "Contact" },
        { key: "address", label: "Address", type: "textarea", section: "Contact", hideInTable: true },
        { key: "city", label: "City", section: "Contact" },
        { key: "openingBalance", label: "Opening Balance", type: "number", section: "Ledger" },
      ]}
    />
  );
}
