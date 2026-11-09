// Shared dropdown options used by forms, seeds and tables

export type Opt = { value: string; label: string };

export const GENDERS: Opt[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const RELIGIONS: Opt[] = [
  { value: "islam", label: "Islam" },
  { value: "christianity", label: "Christianity" },
  { value: "hinduism", label: "Hinduism" },
  { value: "other", label: "Other" },
];

export const BLOOD_GROUPS: Opt[] = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((v) => ({ value: v, label: v }));

export const DONOR_TYPES: Opt[] = [
  { value: "individual", label: "Individual" },
  { value: "corporate", label: "Corporate" },
  { value: "zakat", label: "Zakat Donor" },
];

export const SUPPORT_TYPES: Opt[] = [
  { value: "one-time", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

export const SUPPORT_THROUGH: Opt[] = [
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
];

export const DONEE_TYPES: Opt[] = [
  { value: "individual", label: "Individual" },
  { value: "family", label: "Family" },
  { value: "orphan-child", label: "Orphan Child" },
  { value: "institution", label: "Institution" },
];

export const DONEE_CATEGORIES: Opt[] = [
  { value: "widow", label: "Widow" },
  { value: "orphan", label: "Orphan" },
  { value: "disabled", label: "Disabled" },
  { value: "student", label: "Student" },
  { value: "medical", label: "Medical" },
  { value: "other", label: "Other" },
];

export const PROBLEM_TYPES: Opt[] = [
  { value: "poverty", label: "Poverty" },
  { value: "medical", label: "Medical" },
  { value: "disability", label: "Disability" },
  { value: "education", label: "Education" },
  { value: "widow-support", label: "Widow Support" },
  { value: "orphan-care", label: "Orphan Care" },
  { value: "unemployment", label: "Unemployment" },
  { value: "debt", label: "Debt" },
];

export const WORK_ABILITY: Opt[] = [
  { value: "able", label: "Able to work" },
  { value: "partially-able", label: "Partially able" },
  { value: "unable", label: "Unable to work" },
];

export const HOME_STATUS: Opt[] = [
  { value: "owned", label: "Owned" },
  { value: "rented", label: "Rented" },
  { value: "temporary", label: "Temporary shelter" },
  { value: "none", label: "No shelter" },
];

export const DONEE_STATUS: Opt[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "graduated", label: "Graduated" },
];

export const LEAVE_TYPES: Opt[] = [
  { value: "casual", label: "Casual" },
  { value: "sick", label: "Sick" },
  { value: "annual", label: "Annual" },
  { value: "maternity", label: "Maternity" },
  { value: "hajj", label: "Hajj" },
  { value: "umrah", label: "Umrah" },
  { value: "special", label: "Special" },
];

export const ADVANCE_TYPES: Opt[] = [
  { value: "for-month", label: "Advance for the month" },
  { value: "against-salary", label: "Advance against salary of the month" },
];

export const MISSION_TYPES: Opt[] = [
  { value: "child-rescue", label: "Child Rescue" },
  { value: "family-trace", label: "Family Trace" },
  { value: "relief", label: "Relief Delivery" },
  { value: "flood-relief", label: "Flood Relief" },
  { value: "hospital-emergency", label: "Hospital Emergency" },
  { value: "earthquake-relief", label: "Earthquake Relief" },
  { value: "blood-donation", label: "Blood Donation Drive" },
  { value: "food-drive", label: "Food Drive" },
  { value: "winter-clothing", label: "Winter Clothing" },
  { value: "shelter-repair", label: "Shelter Repair" },
  { value: "elderly-care", label: "Elderly Care Visit" },
  { value: "skills-training", label: "Skills Training" },
  { value: "other", label: "Other (describe below)" },
];

export const VOLUNTEER_TYPES: Opt[] = [
  { value: "student", label: "Student" },
  { value: "citizen", label: "Citizen" },
  { value: "professional", label: "Professional" },
  { value: "philanthropist", label: "Philanthropist" },
  { value: "social-worker", label: "Social Worker" },
];

// ---- Pre-populated lookups ----
export const OCCUPATIONS: Opt[] = [
  "Businessman", "Shopkeeper", "Trader", "Doctor", "Engineer", "Teacher", "Professor", "Lawyer",
  "Nurse", "Banker", "Accountant", "Government Employee", "Private Employee", "Banker",
  "Driver", "Electrician", "Plumber", "Carpenter", "Mason", "Mechanic", "Tailor", "Barber",
  "Farmer", "Labourer", "Housewife", "Student", "Retired", "Unemployed", "Journalist",
  "Software Engineer", "Pharmacist", "Pilot", "Army Officer", "Police Officer", "Cook",
  "Security Guard", "Sweeper", "Domestic Help", "Freelancer", "Other",
].map((v) => ({ value: v.toLowerCase().replace(/\s+/g, "-"), label: v }));

export const NATIONALITIES: Opt[] = [
  "Pakistani", "Afghan", "Bangladeshi", "Indian", "Iranian", "Iraqi", "Saudi", "Emirati",
  "Qatari", "Kuwaiti", "Omani", "Bahraini", "Jordanian", "Syrian", "Turkish", "Egyptian",
  "British", "American", "Canadian", "Australian", "German", "French", "Italian", "Spanish",
  "Chinese", "Japanese", "Korean", "Malaysian", "Indonesian", "Filipino", "Sri Lankan",
  "Nepali", "South African", "Nigerian", "Kenyan", "Somali", "Ethiopian", "Stateless", "Other",
].map((v) => ({ value: v.toLowerCase().replace(/\s+/g, "-"), label: v }));

export const QUALIFICATIONS: Opt[] = [
  { value: "illiterate", label: "Illiterate" },
  { value: "primary", label: "Primary (Class 5)" },
  { value: "middle", label: "Middle (Class 8)" },
  { value: "matriculation", label: "Matriculation (Class 10)" },
  { value: "intermediate", label: "Intermediate (Class 12)" },
  { value: "diploma", label: "Diploma / Certificate" },
  { value: "bachelor", label: "Bachelor's (BA/BSc/BCom)" },
  { value: "master", label: "Master's (MA/MSc/MBA)" },
  { value: "professional", label: "Professional (MBBS/LLB/BEng)" },
  { value: "phd", label: "MPhil / PhD" },
  { value: "religious", label: "Religious Education (Shahadah/Aalim)" },
  { value: "vocational", label: "Vocational / Technical" },
  { value: "other", label: "Other" },
];

export const EMPLOYEE_STATUS: Opt[] = [
  { value: "probation", label: "Probation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "resigned", label: "Resigned" },
  { value: "terminated", label: "Terminated" },
];

export const FATHER_GUARDIAN_LABEL = "Father / Husband / Guardian Name";

// ---- Voucher types (double entry) ----
export type VoucherType = "CRV" | "CPV" | "BRV" | "BPV" | "JV" | "CV";

export const VOUCHER_TYPES: Record<VoucherType, { label: string; prefix: string; desc: string; cashAccount: string; nature: "receipt" | "payment" | "journal" | "contra" }> = {
  CRV: { label: "Cash Receipt Voucher", prefix: "CRV", desc: "Cash received — debit Cash, credit income/donor", cashAccount: "1000", nature: "receipt" },
  CPV: { label: "Cash Payment Voucher", prefix: "CPV", desc: "Cash paid out — debit expense, credit Cash", cashAccount: "1000", nature: "payment" },
  BRV: { label: "Bank Receipt Voucher", prefix: "BRV", desc: "Money received in bank — debit Bank, credit income/donor", cashAccount: "1010", nature: "receipt" },
  BPV: { label: "Bank Payment Voucher", prefix: "BPV", desc: "Paid from bank — debit expense, credit Bank", cashAccount: "1010", nature: "payment" },
  JV: { label: "Journal Voucher", prefix: "JV", desc: "Adjustment entry — any debit/credit combination", cashAccount: "", nature: "journal" },
  CV: { label: "Contra Voucher", prefix: "CV", desc: "Cash ↔ Bank transfer", cashAccount: "", nature: "contra" },
};

export const VOUCHER_TYPE_OPTIONS: Opt[] = Object.entries(VOUCHER_TYPES).map(([value, v]) => ({ value, label: `${value} — ${v.label}` }));

export const labelOf = (opts: Opt[], v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  return opts.find((o) => o.value === v)?.label ?? String(v);
};
