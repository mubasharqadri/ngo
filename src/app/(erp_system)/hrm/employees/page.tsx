"use client";
import { CrudPage } from "@/components/CrudPage";
import { Badge } from "@/components/ui/Breadcrumbs";
import { GENDERS, EMPLOYEE_STATUS, FATHER_GUARDIAN_LABEL } from "@/lib/options";

export default function Page() {
  return (
    <CrudPage
      title="Employees"
      subtitle="Complete staff master — NADRA-verified identity, office timings, probation and resign/rejoin history"
      apiBase="/api/hrm/employees"
      module="hrm.employees"
      singular="Employee"
      stickyScroll
      totalColumn="salary"
      searchPlaceholder="Search by name, code, CNIC, designation..."
      fields={[
        { key: "id", label: "ID", hideInForm: true },
        // Employment
        { key: "employeeCode", label: "Code", className: "font-mono", section: "Employment" },
        { key: "fullName", label: "Full Name", required: true, section: "Employment" },
        { key: "surname", label: "Surname", section: "Employment" },
        { key: "designation", label: "Designation", section: "Employment" },
        { key: "previousDesignation", label: "Previous Designation", section: "Employment" },
        { key: "department", label: "Department", section: "Employment" },
        { key: "transferredFromDept", label: "Transferred From Dept", section: "Employment" },
        { key: "dateOfJoining", label: "Date of Joining", type: "date", section: "Employment" },
        { key: "probationMonths", label: "Probation Period (months)", type: "number", section: "Employment" },
        { key: "timeIn", label: "Time In (office start)", section: "Employment" },
        { key: "timeOut", label: "Time Out (office end)", section: "Employment" },
        { key: "salary", label: "Salary", type: "number", section: "Employment" },
        { key: "commissionHonor", label: "Commission / Honor Paying", type: "number", section: "Employment" },
        {
          key: "status", label: "Status", type: "select", options: EMPLOYEE_STATUS, section: "Employment",
          render: (v) => <Badge tone={v === "active" || v === "confirmed" ? "emerald" : v === "probation" ? "amber" : "rose"}>{String(v ?? "active")}</Badge>,
        },
        // Resign / Rejoin
        { key: "resignDate", label: "Resign Date", type: "date", section: "Resign / Rejoin" },
        { key: "resignReason", label: "Resign Reason", type: "textarea", section: "Resign / Rejoin", hideInTable: true },
        { key: "rejoinDate", label: "Rejoin Date", type: "date", section: "Resign / Rejoin" },
        { key: "rejoinReason", label: "Rejoin Reason", type: "textarea", section: "Resign / Rejoin", hideInTable: true },
        {
          key: "employmentHistory", label: "Resign / Rejoin History (on rejoin: probation yes/no)", type: "jsonList", section: "Resign / Rejoin", hideInTable: true,
          columns: [
            { key: "date", label: "Date" },
            { key: "type", label: "Type (resign/rejoin)" },
            { key: "reason", label: "Reason" },
            { key: "probation", label: "Probation on rejoin (yes/no)" },
          ],
        },
        // Personal (NADRA-verified)
        {
          key: "cnic", label: "CNIC (NADRA verified)", type: "cnicNadra", section: "Personal",
          nadraFill: { name: "fullName", fatherName: "fatherName", dob: "dateOfBirth", gender: "gender", address: "permanentAddress", verifiedKey: "cnicVerified" },
          render: (v, r) => (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs">
              {String(v ?? "—")}
              {r.cnicVerified ? <Badge tone="emerald">NADRA ✓</Badge> : null}
            </span>
          ),
        },
        { key: "cnicVerified", label: "NADRA Verified", type: "boolean", section: "Personal", hideInTable: true, hideInForm: true },
        { key: "fatherName", label: FATHER_GUARDIAN_LABEL, section: "Personal" },
        { key: "dateOfBirth", label: "Date of Birth", type: "date", section: "Personal" },
        { key: "gender", label: "Gender", type: "select", options: GENDERS, section: "Personal" },
        { key: "phone", label: "Phone", section: "Personal" },
        { key: "email", label: "Email", type: "email", section: "Personal" },
        { key: "currentAddress", label: "Current Address", type: "textarea", section: "Personal", hideInTable: true },
        { key: "permanentAddress", label: "Permanent Address", type: "textarea", section: "Personal", hideInTable: true },
        // Qualifications
        {
          key: "qualifications", label: "Qualifications", type: "jsonList", section: "Qualifications", hideInTable: true,
          columns: [
            { key: "title", label: "Qualification" },
            { key: "year", label: "Year" },
            { key: "gpa", label: "GPA / Marks" },
            { key: "position", label: "Position / Medals" },
          ],
        },
        // Experience
        {
          key: "experiences", label: "Experience", type: "jsonList", section: "Experience", hideInTable: true,
          columns: [
            { key: "company", label: "Company" },
            { key: "period", label: "Working Period" },
            { key: "responsibilities", label: "Responsibilities" },
            { key: "achievements", label: "Achievements" },
            { key: "commission", label: "Commission / Honorary" },
            { key: "transport", label: "Transport Facility" },
            { key: "petrol", label: "Petrol Facility" },
            { key: "housing", label: "Home Facility" },
          ],
        },
        // Family
        {
          key: "childrenInfo", label: "Children", type: "jsonList", section: "Family Information", hideInTable: true,
          columns: [{ key: "name", label: "Name" }, { key: "dob", label: "Date of Birth" }, { key: "school", label: "School" }],
        },
        {
          key: "siblingsInfo", label: "Siblings", type: "jsonList", section: "Family Information", hideInTable: true,
          columns: [{ key: "name", label: "Name" }, { key: "relation", label: "Relation" }, { key: "occupation", label: "Occupation" }],
        },
        {
          key: "parentsInfo", label: "Parents", type: "jsonList", section: "Family Information", hideInTable: true,
          columns: [{ key: "name", label: "Name" }, { key: "relation", label: "Relation" }, { key: "occupation", label: "Occupation" }],
        },
        // Salary history
        {
          key: "salaryHistory", label: "Increment / Decrement / Appraisal History", type: "jsonList", section: "Salary History", hideInTable: true,
          columns: [
            { key: "date", label: "Date" },
            { key: "type", label: "Type (increment/decrement/appraisal/other)" },
            { key: "amount", label: "Amount" },
            { key: "note", label: "Note" },
          ],
        },
      ]}
    />
  );
}
