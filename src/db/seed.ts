import { db } from "@/db";
import {
  users, roles, companies, countries, provinces, districts, cities,
  costCenters, donors, donees, donationReceipts, receiptLines, receiptDistributions,
  disbursementBatches, disbursements, employees, attendance, leaves, salaries,
  accounts, voucherLines, analyticalDistributions, campaigns, leads, publicCampaigns,
  aboutContent, auditLogs, vendors, volunteers, missions, missionAssignments,
  missionResults, posts, media, hrPolicies, remoteApprovals, customMissionTypes, emailOutbox,
  areas, nadraRecords, taxSlabs,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { sql, eq } from "drizzle-orm";
import { vouchers } from "@/db/schema";
import { createVoucher, splitByMonth } from "@/lib/posting";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthsAgo = (m: number, day = 10) => {
  const t = new Date();
  return iso(new Date(t.getFullYear(), t.getMonth() - m, day));
};

async function seed() {
  console.log("🌱 Seeding database...");

  await db.execute(sql`TRUNCATE
    analytical_distributions, mission_results, mission_assignments, missions,
    custom_mission_types, email_outbox, remote_approvals, hr_policies,
    media, posts, volunteers, vendors,
    receipt_distributions, receipt_lines, donation_receipts,
    disbursements, disbursement_batches,
    voucher_lines, vouchers,
    donees, donors, salaries, advances, loans, attendance, leaves, employees,
    leads, campaigns, users, roles, cost_centers, cities, districts, provinces, countries,
    companies, public_campaigns, about_content, contact_messages, audit_logs, accounts
    RESTART IDENTITY CASCADE`);

  // ---- Setup ----
  await db.insert(companies).values({
    name: "Shauoor Welfare Society", tagline: "Serving humanity with dignity",
    email: "info@shauoor.org", phone: "+92 300 1234567", address: "12-B, Block F, Johar Town",
    city: "Lahore", country: "Pakistan", regNumber: "SW-2015-00123", ntn: "0123456-7",
  });

  await db.insert(aboutContent).values([
    { key: "mission", value: "To uplift underprivileged communities through sustainable welfare programs that provide dignity, opportunity and hope." },
    { key: "vision", value: "A Pakistan where no family sleeps hungry and every child has access to education and healthcare." },
    { key: "history", value: "Founded in 2015 by a small group of volunteers, Shauoor has grown into a trusted welfare organization serving over 50,000 families across Punjab, Sindh and KPK." },
  ]);

  const pkIds = await db.insert(countries).values([
    { name: "Pakistan", code: "PK", phoneCode: "+92" },
    { name: "United Kingdom", code: "UK", phoneCode: "+44" },
    { name: "United States", code: "US", phoneCode: "+1" },
    { name: "Saudi Arabia", code: "SA", phoneCode: "+966" },
    { name: "United Arab Emirates", code: "AE", phoneCode: "+971" },
  ]).returning({ id: countries.id });
  const PK = pkIds[0].id;

  const provIds = await db.insert(provinces).values([
    { name: "Punjab", countryId: PK }, { name: "Sindh", countryId: PK },
    { name: "Khyber Pakhtunkhwa", countryId: PK }, { name: "Balochistan", countryId: PK }, { name: "Islamabad", countryId: PK },
  ]).returning({ id: provinces.id });

  const distIds = await db.insert(districts).values([
    { name: "Lahore", provinceId: provIds[0].id }, { name: "Faisalabad", provinceId: provIds[0].id },
    { name: "Rawalpindi", provinceId: provIds[0].id }, { name: "Karachi", provinceId: provIds[1].id }, { name: "Hyderabad", provinceId: provIds[1].id },
  ]).returning({ id: districts.id });

  // Real cities only (localities/areas live in the `areas` table).
  // Insertion order = IDs 1..13, matching the hard-coded city_id values in the areas seed below.
  await db.insert(cities).values([
    { name: "Lahore", districtId: distIds[0].id },          // 1
    { name: "Faisalabad", districtId: distIds[1].id },      // 2
    { name: "Jaranwala", districtId: distIds[1].id },       // 3
    { name: "Samundri", districtId: distIds[1].id },        // 4
    { name: "Chak Jhumra", districtId: distIds[1].id },     // 5
    { name: "Rawalpindi", districtId: distIds[2].id },      // 6
    { name: "Gujar Khan", districtId: distIds[2].id },      // 7
    { name: "Taxila", districtId: distIds[2].id },          // 8
    { name: "Kahuta", districtId: distIds[2].id },          // 9
    { name: "Karachi", districtId: distIds[3].id },         // 10
    { name: "Hyderabad", districtId: distIds[4].id },       // 11
    { name: "Latifabad", districtId: distIds[4].id },       // 12
    { name: "Qasimabad", districtId: distIds[4].id },       // 13
  ]);

  const ccIds = await db.insert(costCenters).values([
    { name: "General Welfare", code: "GW", description: "General welfare activities" },
    { name: "Orphan Care", code: "OC", description: "Orphan sponsorship and care" },
    { name: "Education", code: "ED", description: "Schools, scholarships and books" },
    { name: "Medical Relief", code: "MR", description: "Free clinics and medical camps" },
    { name: "Ration Program", code: "RP", description: "Monthly ration distribution" },
    { name: "Admin & Operations", code: "AO", description: "Administrative overheads" },
  ]).returning({ id: costCenters.id });

  // ---- Administration ----
  const [adminRole] = await db.insert(roles).values([
    { name: "Administrator", permissions: ["*"] },
    {
      name: "Finance Manager",
      permissions: ["dashboard.*", "analytics.*", "reports.*", "donations.*", "accounting.*", "crm.reports.*", "setup.costcenters.*", "database.backup.*", "administration.audit.view", "administration.audit.print"],
    },
    { name: "HR Officer", permissions: ["dashboard.*", "reports.*", "hrm.*", "administration.audit.view"] },
    {
      name: "Fundraiser",
      permissions: ["dashboard.*", "crm.*", "donations.donors.*", "donations.receipts.view", "donations.receipts.create", "donations.receipts.print", "reports.*"],
    },
    {
      name: "Viewer",
      permissions: [
        "dashboard.*", "analytics.*", "reports.*",
        "donations.donors.view", "donations.donors.print", "donations.donees.view", "donations.donees.print",
        "donations.receipts.view", "donations.receipts.print", "donations.disbursements.view", "donations.disbursements.print",
        "crm.campaigns.view", "crm.leads.view", "crm.reports.view",
        "hrm.employees.view", "hrm.salaries.view", "hrm.reports.view",
        "accounting.accounts.view", "accounting.vouchers.view", "accounting.reports.view",
        "setup.companies.view", "setup.costcenters.view",
      ],
    },
  ]).returning({ id: roles.id });

  const adminPw = hashPassword("admin123");
  const userPw = hashPassword("user123");
  await db.insert(users).values([
    { fullName: "Ahmad Raza", email: "admin@shauoor.org", passwordHash: adminPw, roleId: adminRole.id },
    { fullName: "Fatima Khan", email: "fatima@shauoor.org", passwordHash: userPw, roleId: adminRole.id + 1 },
    { fullName: "Bilal Ahmed", email: "bilal@shauoor.org", passwordHash: userPw, roleId: adminRole.id + 2 },
    { fullName: "Ayesha Noor", email: "ayesha@shauoor.org", passwordHash: userPw, roleId: adminRole.id + 3 },
    { fullName: "Hassan Ali", email: "hassan@shauoor.org", passwordHash: userPw, roleId: adminRole.id + 4 },
  ]);

  // ---- HR policies (management-approved rules) ----
  await db.insert(hrPolicies).values([
    { key: "advanceMidMonthPct", value: "50" }, // after the 15th: max 50% of salary
    { key: "loanMaxMonths", value: "3" }, // loan cap = 3 months' salary
    { key: "maxActiveLoans", value: "2" }, // at most 2 active loans
    { key: "maxInstallments", value: "12" }, // never more than 1 year
  ]);

  // ---- Donors (full master) ----
  const donorRows = [
    { name: "Abdul Malik Traders", donorType: "corporate", cnic: "35201-1234567-1", ntnNo: "7712345-6", stnNo: "STN-88991", contactPerson: "Abdul Malik", phone: "042-35761234", mobileNo: "03001234567", email: "abdul@traders.pk", address: "Main Boulevard, Gulberg III", permanentAddress: "Vill. Malikwal, Distt. Sialkot", city: "Lahore", country: "Pakistan", membershipNo: "MEM-0001", membershipDate: monthsAgo(30), registeredNo: "REG-D-001", supportType: "monthly", supportThrough: "bank-transfer", occupation: "trader", religion: "islam", gender: "male", bloodGroup: "B+", fatherName: "Ghulam Rasool", introducerName: "Ch. Iqbal", remarks: "Reliable corporate donor since 2023." },
    { name: "Dr. Saima Javed", donorType: "individual", cnic: "35202-9988776-2", ntnNo: "1198765-2", contactPerson: "Dr. Saima Javed", phone: "03211234567", mobileNo: "03211234568", email: "saima.j@hospital.pk", address: "H# 45, Model Town", permanentAddress: "H# 45, Model Town, Lahore", city: "Lahore", country: "Pakistan", membershipNo: "MEM-0002", membershipDate: monthsAgo(24), registeredNo: "REG-D-002", supportType: "quarterly", supportThrough: "cheque", occupation: "doctor", religion: "islam", gender: "female", bloodGroup: "A+", dateOfBirth: "1982-03-14", fatherName: "Javed Akhtar", remarks: "Prefers zakat for medical fund." },
    { name: "Kamran Sheikh", donorType: "individual", cnic: "42100-1122334-3", contactPerson: "Kamran Sheikh", phone: "+971 50 123 4567", mobileNo: "+971 50 123 4567", email: "kamran@overseas.ae", address: "Dubai Marina, UAE", permanentAddress: "Faisalabad, Pakistan", city: "Dubai", country: "UAE", membershipNo: "MEM-0003", membershipDate: monthsAgo(18), supportType: "monthly", supportThrough: "online", occupation: "engineer", religion: "islam", gender: "male", bloodGroup: "O+", nationality: "Pakistani" as never, introducerName: "Web campaign" },
    { name: "Noor Textile Mills", donorType: "corporate", cnic: "35201-5555666-4", ntnNo: "3345678-1", stnNo: "STN-55662", contactPerson: "HR Head", phone: "041-8551234", mobileNo: "03331234567", email: "donations@noor.pk", address: "Industrial Area, Faisalabad", city: "Faisalabad", country: "Pakistan", membershipNo: "MEM-0004", membershipDate: monthsAgo(20), supportType: "annual", supportThrough: "bank-transfer", remarks: "Annual CSR grant." },
    { name: "Zainab Foundation UK", donorType: "corporate", cnic: "REG-UK-8811", contactPerson: "Sara Ahmed", phone: "+44 20 7946 0958", email: "give@zainabfdn.org", address: "London, UK", city: "London", country: "UK", membershipNo: "MEM-0005", membershipDate: monthsAgo(15), supportType: "annual", supportThrough: "bank-transfer", remarks: "Grants for orphan sponsorship." },
    { name: "Anonymous", donorType: "individual", isAnonymous: true, country: "Pakistan", supportThrough: "cash", remarks: "Wishes to remain anonymous." },
    { name: "Rashid Hussain", donorType: "individual", cnic: "35201-7788991-5", fatherName: "Maqbool Hussain", gender: "male", dateOfBirth: "1975-08-22", occupation: "shopkeeper", religion: "islam", bloodGroup: "A-", phone: "03451234567", mobileNo: "03451234568", email: "rashid.h@gmail.com", address: "Johar Town, Lahore", city: "Lahore", country: "Pakistan", membershipNo: "MEM-0006", membershipDate: monthsAgo(12), supportType: "monthly", supportThrough: "cash" },
    { name: "Aisha Welfare Trust", donorType: "zakat", cnic: "AWT-2024-001", ntnNo: "9912345-3", contactPerson: "Trustee Board", phone: "021-34561234", mobileNo: "03008888888", email: "trust@awt.pk", address: "Clifton, Karachi", city: "Karachi", country: "Pakistan", membershipNo: "MEM-0007", membershipDate: monthsAgo(10), supportType: "quarterly", supportThrough: "cheque", remarks: "Zakat-only disbursement required.", nameOfDestitute: "Multiple families", destituteAddress: "Karachi East", destituteContact: "0300-7776665" },
    { name: "Mohammad Tariq", donorType: "individual", cnic: "35201-2233445-6", fatherName: "Sher Ali", gender: "male", occupation: "retired", religion: "islam", bloodGroup: "B-", phone: "03219988776", email: "tariq.m@gmail.com", address: "Rawalpindi", city: "Rawalpindi", country: "Pakistan", membershipNo: "MEM-0008", membershipDate: monthsAgo(8), supportType: "one-time", supportThrough: "cash" },
    { name: "Global Relief Fund", donorType: "corporate", cnic: "GRF-US-1200", contactPerson: "Partnerships Desk", phone: "+1 415 555 0199", email: "partners@grf.org", address: "San Francisco, USA", city: "San Francisco", country: "USA", membershipNo: "MEM-0009", membershipDate: monthsAgo(6), supportType: "annual", supportThrough: "online", remarks: "International grant partner." },
  ];
  const donorIds = await db.insert(donors).values(donorRows as never).returning({ id: donors.id });

  // ---- Donees (full master) ----
  const doneeRows = [
    { name: "Sakina Begum", doneeType: "family", category: "widow", status: "active", problemType: "widow-support", cnic: "35201-1111222-1", fatherName: "Allah Ditta", gender: "female", dateOfBirth: "1978-05-10", religion: "islam", nationality: "Pakistani", qualification: "Primary", contactPerson: "Sakina Begum", phone: "03001111111", email: "", address: "Street 4, Shahdara", city: "Lahore", homeStatus: "rented", familySize: 6, menMembers: 1, womenMembers: 2, boyMembers: 2, girlMembers: 1, monthlyIncome: "12000", personalIncome: "0", workAbility: "partially-able", caseHistory: "Husband passed away in 2021; runs a small stitching setup.", introducerName: "Waqar Hussain", introducerPhone: "03055555555", registeredNo: "REG-B-101", caseCoordinator: "Kashif Raza", bankAccountTitle: "Sakina Begum", bankAccountNo: "0012-4455-6677", bankName: "HBL", remarks: "Monthly ration + school support." },
    { name: "Rehman Ali", doneeType: "individual", category: "disabled", status: "active", problemType: "disability", cnic: "35201-2222333-2", fatherName: "Karam Din", gender: "male", dateOfBirth: "1985-11-02", religion: "islam", nationality: "Pakistani", contactPerson: "Rehman Ali", phone: "03002222222", address: "Madina Town", city: "Faisalabad", homeStatus: "owned", familySize: 8, menMembers: 3, womenMembers: 2, boyMembers: 2, girlMembers: 1, monthlyIncome: "18000", personalIncome: "6000", workAbility: "partially-able", caseHistory: "Accident in 2019; wheelchair required.", registeredNo: "REG-B-102", caseCoordinator: "Kashif Raza" },
    { name: "Nasreen Akhtar", doneeType: "orphan-child", category: "orphan", status: "active", problemType: "orphan-care", cnic: "35201-3333444-3", fatherName: "Late Akhtar Hussain", gender: "female", dateOfBirth: "2012-02-20", religion: "islam", nationality: "Pakistani", qualification: "School — Class 6", contactPerson: "Grandmother (Zainab)", phone: "03003333333", address: "Mughalpura", city: "Lahore", homeStatus: "temporary", familySize: 5, menMembers: 1, womenMembers: 2, boyMembers: 1, girlMembers: 1, monthlyIncome: "8000", workAbility: "unable", caseHistory: "Father died 2022; guardian is grandmother.", introducerName: "School teacher", registeredNo: "REG-B-103", caseCoordinator: "Ayesha Noor", remarks: "Orphan sponsorship program." },
    { name: "Muhammad Iqbal", doneeType: "family", category: "medical", status: "active", problemType: "medical", cnic: "35201-4444555-4", fatherName: "Din Muhammad", gender: "male", dateOfBirth: "1970-07-15", religion: "islam", nationality: "Pakistani", contactPerson: "Muhammad Iqbal", phone: "03004444444", address: "Orangi Town", city: "Karachi", homeStatus: "rented", familySize: 7, menMembers: 2, womenMembers: 2, boyMembers: 2, girlMembers: 1, monthlyIncome: "15000", personalIncome: "15000", workAbility: "unable", caseHistory: "Kidney treatment ongoing; dialysis twice a week.", registeredNo: "REG-B-104", caseCoordinator: "Bilal Ahmed", bankAccountTitle: "Muhammad Iqbal", bankAccountNo: "7788-1122-3344", bankName: "Meezan Bank" },
    { name: "Fatima Bibi", doneeType: "family", category: "widow", status: "active", problemType: "poverty", cnic: "35201-5555666-5", fatherName: "Baba Jan", gender: "female", dateOfBirth: "1968-01-30", religion: "islam", nationality: "Pakistani", phone: "03005555555", address: "Pirwadhai", city: "Rawalpindi", homeStatus: "none", familySize: 4, menMembers: 1, womenMembers: 1, boyMembers: 1, girlMembers: 1, monthlyIncome: "10000", workAbility: "partially-able", caseHistory: "House damaged in rains 2023.", registeredNo: "REG-B-105", caseCoordinator: "Kashif Raza" },
    { name: "Imran Shaikh", doneeType: "individual", category: "student", status: "active", problemType: "education", cnic: "42100-6666777-6", fatherName: "Abdul Ghafoor", gender: "male", dateOfBirth: "2006-09-09", religion: "islam", nationality: "Pakistani", qualification: "Matric (ongoing)", phone: "03006666666", address: "Lyari", city: "Karachi", homeStatus: "rented", familySize: 6, menMembers: 2, womenMembers: 2, boyMembers: 1, girlMembers: 1, monthlyIncome: "14000", workAbility: "able", caseHistory: "Bright student; needs fee + books support.", registeredNo: "REG-B-106", caseCoordinator: "Ayesha Noor" },
    { name: "Zahida Parveen", doneeType: "family", category: "widow", status: "active", problemType: "widow-support", cnic: "35201-7777888-7", gender: "female", dateOfBirth: "1981-12-12", religion: "islam", nationality: "Pakistani", phone: "03007777777", address: "Harbanspura", city: "Lahore", homeStatus: "rented", familySize: 5, menMembers: 1, womenMembers: 2, boyMembers: 1, girlMembers: 1, monthlyIncome: "9000", workAbility: "partially-able", registeredNo: "REG-B-107", caseCoordinator: "Kashif Raza" },
    { name: "Yasir Mehmood", doneeType: "individual", category: "disabled", status: "active", problemType: "unemployment", cnic: "35201-8888999-8", gender: "male", dateOfBirth: "1990-04-04", religion: "islam", nationality: "Pakistani", phone: "03008888999", address: "Samnabad", city: "Faisalabad", homeStatus: "owned", familySize: 9, menMembers: 4, womenMembers: 3, boyMembers: 1, girlMembers: 1, monthlyIncome: "20000", personalIncome: "0", workAbility: "unable", registeredNo: "REG-B-108", caseCoordinator: "Bilal Ahmed" },
    { name: "Shazia Kausar", doneeType: "orphan-child", category: "orphan", status: "active", problemType: "orphan-care", cnic: "35201-9999000-9", gender: "female", dateOfBirth: "2014-06-18", religion: "islam", nationality: "Pakistani", qualification: "Class 4", phone: "03009999000", address: "Baghbanpura", city: "Lahore", homeStatus: "temporary", familySize: 3, menMembers: 0, womenMembers: 2, boyMembers: 0, girlMembers: 1, monthlyIncome: "7000", workAbility: "unable", registeredNo: "REG-B-109", caseCoordinator: "Ayesha Noor" },
    { name: "Arif Nawaz", doneeType: "family", category: "medical", status: "active", problemType: "debt", cnic: "35201-1010101-0", gender: "male", dateOfBirth: "1976-10-05", religion: "islam", nationality: "Pakistani", phone: "03001010101", address: "Committee Chowk", city: "Rawalpindi", homeStatus: "rented", familySize: 6, menMembers: 2, womenMembers: 2, boyMembers: 1, girlMembers: 1, monthlyIncome: "13000", personalIncome: "13000", workAbility: "partially-able", caseHistory: "Took loan for surgery; needs debt relief.", registeredNo: "REG-B-110", caseCoordinator: "Bilal Ahmed" },
    { name: "Khurshid Begum", doneeType: "family", category: "widow", status: "graduated", problemType: "poverty", cnic: "35201-1212121-1", gender: "female", dateOfBirth: "1972-03-25", religion: "islam", nationality: "Pakistani", phone: "03001212121", address: "Ichhra", city: "Lahore", homeStatus: "owned", familySize: 4, menMembers: 1, womenMembers: 2, boyMembers: 1, girlMembers: 0, monthlyIncome: "28000", workAbility: "able", caseHistory: "Graduated from program — now self-sufficient.", registeredNo: "REG-B-111", caseCoordinator: "Kashif Raza" },
    { name: "Shakeel Ahmad", doneeType: "individual", category: "student", status: "active", problemType: "education", cnic: "35201-1313131-2", gender: "male", dateOfBirth: "2004-08-14", religion: "islam", nationality: "Pakistani", qualification: "Intermediate", phone: "03001313131", address: "Gulshan", city: "Karachi", homeStatus: "rented", familySize: 7, menMembers: 3, womenMembers: 2, boyMembers: 1, girlMembers: 1, monthlyIncome: "16000", workAbility: "able", registeredNo: "REG-B-112", caseCoordinator: "Ayesha Noor" },
  ];
  const doneeIds = await db.insert(donees).values(doneeRows as never[]).returning({ id: donees.id });

  // ---- Chart of accounts (balanced openings: assets 11M = equity 11M) ----
  await db.insert(accounts).values([
    { code: "1000", name: "Cash in Hand", type: "asset", openingBalance: "500000" },
    { code: "1010", name: "Bank - HBL Current", type: "asset", openingBalance: "2500000" },
    { code: "1020", name: "Bank - Meezan Savings", type: "asset", openingBalance: "8000000" },
    { code: "2000", name: "Accounts Payable", type: "liability", openingBalance: "0" },
    { code: "3000", name: "Donation Income", type: "income", openingBalance: "0" },
    { code: "3010", name: "Zakat Income", type: "income", openingBalance: "0" },
    { code: "3020", name: "Grant Income", type: "income", openingBalance: "0" },
    { code: "4000", name: "Welfare Expenses", type: "expense", openingBalance: "0" },
    { code: "4010", name: "Ration Expenses", type: "expense", openingBalance: "0" },
    { code: "4020", name: "Medical Expenses", type: "expense", openingBalance: "0" },
    { code: "4030", name: "Admin Salaries", type: "expense", openingBalance: "0" },
    { code: "4040", name: "Utilities & Rent", type: "expense", openingBalance: "0" },
    { code: "5000", name: "Capital / Fund Balance", type: "equity", openingBalance: "11000000" },
    // ---- CONTROL / RECONCILIATION ACCOUNTS (partner subledgers — keeps the CoA lean) ----
    { code: "1100", name: "Donors' Fund Control (held on account)", type: "liability", openingBalance: "0", isControl: true, controlFor: "donor" },
    { code: "2100", name: "Donees Control (Payable)", type: "liability", openingBalance: "0", isControl: true, controlFor: "donee" },
    { code: "2200", name: "Vendors Control (Payable)", type: "liability", openingBalance: "0", isControl: true, controlFor: "vendor" },
  ]);

  // ---- Standalone double-entry vouchers (5 months of activity) ----
  const voucherDefs: { type: "CRV" | "CPV" | "BRV" | "BPV" | "JV" | "CV"; m: number; narration: string; lines: { code: string; dr: number; cr: number }[] }[] = [
    { type: "CRV", m: 5, narration: "Cash donations — weekly collection", lines: [{ code: "1000", dr: 145000, cr: 0 }, { code: "3000", dr: 0, cr: 145000 }] },
    { type: "BRV", m: 5, narration: "Bank donation — Abdul Malik Traders", lines: [{ code: "1010", dr: 500000, cr: 0 }, { code: "3000", dr: 0, cr: 500000 }] },
    { type: "CPV", m: 5, narration: "Ration bags purchased", lines: [{ code: "4010", dr: 220000, cr: 0 }, { code: "1000", dr: 0, cr: 220000 }] },
    { type: "BPV", m: 4, narration: "Office rent Q", lines: [{ code: "4040", dr: 180000, cr: 0 }, { code: "1010", dr: 0, cr: 180000 }] },
    { type: "BRV", m: 4, narration: "Grant received — Zainab Foundation UK", lines: [{ code: "1010", dr: 1500000, cr: 0 }, { code: "3020", dr: 0, cr: 1500000 }] },
    { type: "CPV", m: 4, narration: "Medical camp medicines", lines: [{ code: "4020", dr: 95000, cr: 0 }, { code: "1000", dr: 0, cr: 95000 }] },
    { type: "CV", m: 3, narration: "Cash deposited to bank", lines: [{ code: "1010", dr: 300000, cr: 0 }, { code: "1000", dr: 0, cr: 300000 }] },
    { type: "BPV", m: 3, narration: "Staff salaries", lines: [{ code: "4030", dr: 810000, cr: 0 }, { code: "1010", dr: 0, cr: 810000 }] },
    { type: "BRV", m: 2, narration: "Zakat collection — Aisha Welfare Trust", lines: [{ code: "1010", dr: 750000, cr: 0 }, { code: "3010", dr: 0, cr: 750000 }] },
    { type: "JV", m: 2, narration: "Reclassification — orphan fund", lines: [{ code: "3000", dr: 120000, cr: 0 }, { code: "3010", dr: 0, cr: 120000 }] },
    { type: "CRV", m: 1, narration: "Eid fundraising drive", lines: [{ code: "1000", dr: 410000, cr: 0 }, { code: "3000", dr: 0, cr: 410000 }] },
    { type: "BPV", m: 1, narration: "Utility bills", lines: [{ code: "4040", dr: 64000, cr: 0 }, { code: "1010", dr: 0, cr: 64000 }] },
    { type: "BRV", m: 0, narration: "Online donations — month to date", lines: [{ code: "1010", dr: 260000, cr: 0 }, { code: "3000", dr: 0, cr: 260000 }] },
  ];
  for (const v of voucherDefs) {
    await createVoucher({
      type: v.type,
      date: monthsAgo(v.m, 8 + Math.floor(Math.random() * 15)),
      narration: v.narration,
      postedBy: 1,
      lines: v.lines.map((l) => ({ accountCode: l.code, debit: l.dr, credit: l.cr })),
    });
  }

  // ---- Donation receipts: master + detail + distribution + auto vouchers ----
  const receiptDefs = [
    { m: 4, donor: 0, vType: "BRV" as const, instrument: "TXN-88112", lines: [{ donee: 0, cat: 4, amount: 90000, from: 3, span: 3, remarks: "Monthly ration × 3 months" }, { donee: 2, cat: 1, amount: 45000, from: 3, span: 3, remarks: "Orphan sponsorship" }] },
    { m: 4, donor: 1, vType: "CRV" as const, instrument: "CHQ-200311", lines: [{ donee: 3, cat: 3, amount: 60000, from: 3, span: 1, remarks: "Dialysis support" }] },
    { m: 3, donor: 7, vType: "BRV" as const, instrument: "TXN-90341", lines: [{ donee: 1, cat: 0, amount: 40000, from: 2, span: 2 }, { donee: 4, cat: 4, amount: 36000, from: 2, span: 2 }] },
    { m: 3, donor: 2, vType: null, instrument: "", lines: [{ donee: 5, cat: 2, amount: 25000, from: 2, span: 1, remarks: "School fee" }] },
    { m: 2, donor: 4, vType: "BRV" as const, instrument: "TXN-91873", lines: [{ donee: 8, cat: 1, amount: 30000, from: 1, span: 3, remarks: "Orphan care Q" }, { donee: 6, cat: 0, amount: 30000, from: 1, span: 3 }] },
    { m: 1, donor: 0, vType: "CRV" as const, instrument: "", lines: [{ donee: 9, cat: 3, amount: 55000, from: 0, span: 1, remarks: "Debt relief" }] },
    { m: 1, donor: 8, vType: null, instrument: "", lines: [{ donee: 11, cat: 2, amount: 18000, from: 0, span: 1, remarks: "Books & uniform" }] },
    { m: 0, donor: 9, vType: "BRV" as const, instrument: "TXN-93102", lines: [{ donee: 7, cat: 0, amount: 80000, from: 0, span: 2 }, { donee: 10, cat: 4, amount: 20000, from: 0, span: 1 }] },
  ];

  const receiptMeta: { id: number; receiptNo: string; receiptDate: string; donorId: number }[] = [];
  for (let i = 0; i < receiptDefs.length; i++) {
    const def = receiptDefs[i];
    const d = new Date();
    const rDate = new Date(d.getFullYear(), d.getMonth() - def.m, 12);
    const receiptNo = `RCP-${rDate.getFullYear()}-${String(i + 1).padStart(4, "0")}`;
    const total = def.lines.reduce((s, l) => s + l.amount, 0);
    const donorId = donorIds[def.donor].id;

    let voucherNo: string | null = null;
    if (def.vType) {
      const v = await createVoucher({
        type: def.vType,
        date: iso(rDate),
        narration: `Donation receipt ${receiptNo}`,
        postedBy: 1,
        lines: [
          { accountCode: def.vType === "CRV" ? "1000" : "1010", debit: total, credit: 0 },
          { accountCode: "3000", debit: 0, credit: total },
        ],
      });
      voucherNo = v.voucherNo;
    }

    const [r] = await db.insert(donationReceipts).values({
      receiptNo,
      receiptDate: iso(rDate),
      donationDate: iso(new Date(rDate.getTime() - 86400000 * 2)),
      donorId,
      totalAmount: String(total),
      restrictUseInFund: def.donor === 7,
      instrumentNo: def.instrument || null,
      instrumentDate: def.instrument ? iso(rDate) : null,
      voucherNo: voucherNo ?? null,
      voucherType: def.vType ?? null,
      remarks: null,
      status: "active",
      issuedBy: 1,
    }).returning();
    receiptMeta.push({ id: r.id, receiptNo, receiptDate: iso(rDate), donorId });

    for (let s = 0; s < def.lines.length; s++) {
      const l = def.lines[s];
      const fromDate = monthsAgo(l.from, 1);
      const toDate = monthsAgo(Math.max(0, l.from - l.span + 1), 28);
      await db.insert(receiptLines).values({
        receiptId: r.id, serialNo: s + 1, doneeId: doneeIds[l.donee].id, categoryId: ccIds[l.cat].id,
        amount: String(l.amount), remarks: l.remarks ?? null, fromDate, toDate,
      });
      const parts = splitByMonth(fromDate, toDate, l.amount);
      if (parts.length) {
        await db.insert(receiptDistributions).values(parts.map((p) => ({
          receiptId: r.id, serialNo: s + 1, month: p.month, doneeId: doneeIds[l.donee].id,
          categoryId: ccIds[l.cat].id, amount: String(p.amount), remarks: l.remarks ?? null,
          fromDate: p.fromDate, toDate: p.toDate,
        })));
      }
    }
  }

  // ---- Disbursement batches with full workflow fields ----
  const batchDefs = [
    { m: 3, title: "Monthly Ration — batch 3", fund: "ration", status: "paid", vType: "CPV" as const, refReceipt: 0, lines: [{ donee: 0, amt: 15000 }, { donee: 4, amt: 12000 }, { donee: 6, amt: 12000 }] },
    { m: 2, title: "Orphan Sponsorship — Q", fund: "orphan", status: "paid", vType: "BPV" as const, refReceipt: 4, lines: [{ donee: 2, amt: 15000 }, { donee: 8, amt: 10000 }] },
    { m: 1, title: "Medical Support — batch 5", fund: "general", status: "approved", vType: "CPV" as const, refReceipt: 1, lines: [{ donee: 3, amt: 30000 }, { donee: 9, amt: 25000 }] },
    { m: 0, title: "Education Support — current", fund: "general", status: "draft", vType: null, refReceipt: 6, lines: [{ donee: 5, amt: 12500 }, { donee: 11, amt: 9000 }] },
    { m: 0, title: "Cancelled — duplicate entry", fund: "general", status: "cancelled", vType: null, refReceipt: null, lines: [{ donee: 10, amt: 5000 }] },
  ];

  for (let b = 0; b < batchDefs.length; b++) {
    const def = batchDefs[b];
    const bDate = new Date(new Date().getFullYear(), new Date().getMonth() - def.m, 20);
    const batchNo = `BAT-${bDate.getFullYear()}-${String(b + 1).padStart(3, "0")}`;
    const total = def.lines.reduce((s, l) => s + l.amt, 0);
    const ref = def.refReceipt !== null ? receiptMeta[def.refReceipt] : null;

    let voucherNo: string | null = null;
    if (def.status === "paid" && def.vType) {
      const v = await createVoucher({
        type: def.vType,
        date: iso(bDate),
        narration: `Disbursement batch ${batchNo} — ${def.title}`,
        postedBy: 1,
        lines: [
          { accountCode: "4000", debit: total, credit: 0 },
          { accountCode: def.vType === "CPV" ? "1000" : "1010", debit: 0, credit: total },
        ],
      });
      voucherNo = v.voucherNo;
    }

    const [batch] = await db.insert(disbursementBatches).values({
      batchNo,
      title: def.title,
      date: iso(bDate),
      fund: def.fund,
      costCenterId: ccIds[b % ccIds.length].id,
      status: def.status,
      voucherNo,
      voucherType: def.vType,
      approvedBy: def.status !== "draft" ? 1 : null,
      approvedAt: def.status !== "draft" ? bDate : null,
      notes: null,
    }).returning();

    for (const l of def.lines) {
      await db.insert(disbursements).values({
        batchId: batch.id,
        donorReceiptNo: ref?.receiptNo ?? null,
        donorSerialNo: ref ? 1 : null,
        donorReceiptDate: ref?.receiptDate ?? null,
        donorId: ref?.donorId ?? null,
        doneeId: doneeIds[l.donee].id,
        doneeName: doneeRows[l.donee].name,
        doneeCategoryId: ccIds[b % ccIds.length].id,
        program: def.fund === "ration" ? "Ration Program" : def.fund === "orphan" ? "Orphan Care" : "General Welfare",
        instrumentNo: def.vType === "BPV" ? `TXN-${55000 + b * 100 + l.donee}` : null,
        instrumentDate: def.vType === "BPV" ? iso(bDate) : null,
        paidAmount: String(l.amt),
        remarks: null,
        generatedBy: 1,
        generateDate: bDate,
        approvedBy: def.status === "approved" || def.status === "paid" ? 1 : null,
        approveDate: def.status === "approved" || def.status === "paid" ? bDate : null,
        proceededBy: def.status === "paid" ? 1 : null,
        proceedDate: def.status === "paid" ? bDate : null,
      });
    }
  }

  // ---- HRM ----
  const empRows = [
    { employeeCode: "EMP-001", fullName: "Usman Tariq", cnic: "35201-0000001-1", phone: "03011111111", email: "usman@shauoor.org", designation: "Executive Director", department: "Management", dateOfJoining: "2015-06-15", salary: "180000", status: "active" },
    { employeeCode: "EMP-002", fullName: "Sadia Malik", cnic: "35202-0000002-2", phone: "03022222222", email: "sadia@shauoor.org", designation: "Finance Manager", department: "Finance", dateOfJoining: "2016-02-01", salary: "140000", status: "active" },
    { employeeCode: "EMP-003", fullName: "Kashif Raza", cnic: "35203-0000003-3", phone: "03033333333", email: "kashif@shauoor.org", designation: "Program Coordinator", department: "Programs", dateOfJoining: "2017-08-10", salary: "95000", status: "active" },
    { employeeCode: "EMP-004", fullName: "Hina Aslam", cnic: "35204-0000004-4", phone: "03044444444", email: "hina@shauoor.org", designation: "HR Officer", department: "HR", dateOfJoining: "2018-04-20", salary: "75000", status: "active" },
    { employeeCode: "EMP-005", fullName: "Waqar Hussain", cnic: "35205-0000005-5", phone: "03055555555", email: "waqar@shauoor.org", designation: "Field Officer", department: "Programs", dateOfJoining: "2019-11-05", salary: "55000", status: "active" },
    { employeeCode: "EMP-006", fullName: "Nida Fatima", cnic: "35206-0000006-6", phone: "03066666666", email: "nida@shauoor.org", designation: "Accountant", department: "Finance", dateOfJoining: "2020-03-15", salary: "65000", status: "active" },
    { employeeCode: "EMP-007", fullName: "Imran Saeed", cnic: "35207-0000007-7", phone: "03077777777", email: "imran.s@shauoor.org", designation: "Driver", department: "Operations", dateOfJoining: "2016-09-12", salary: "40000", status: "active" },
    { employeeCode: "EMP-008", fullName: "Amina Bibi", cnic: "35208-0000008-8", phone: "03088888888", email: "amina@shauoor.org", designation: "Receptionist", department: "Admin", dateOfJoining: "2021-01-05", salary: "38000", status: "active" },
    { employeeCode: "EMP-009", fullName: "Faisal Khan", cnic: "35209-0000009-9", phone: "03099999999", email: "faisal@shauoor.org", designation: "IT Support", department: "IT", dateOfJoining: "2022-07-18", salary: "70000", status: "active" },
    { employeeCode: "EMP-010", fullName: "Rabia Nawaz", cnic: "35210-0000010-0", phone: "03000000000", email: "rabia@shauoor.org", designation: "Fundraising Officer", department: "Fundraising", dateOfJoining: "2023-02-14", salary: "60000", status: "active" },
  ];
  const empIds = await db.insert(employees).values(empRows).returning({ id: employees.id });

  const thisMonth = new Date();
  const attRows = [];
  const statuses = ["present", "present", "present", "present", "absent", "half", "leave", "present"];
  for (const emp of empIds) {
    for (let d = 1; d <= thisMonth.getDate(); d++) {
      const date = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      attRows.push({ employeeId: emp.id, date: iso(date), status: statuses[(emp.id + d) % statuses.length], checkIn: "09:0" + ((emp.id + d) % 9), checkOut: "17:3" + ((emp.id + d) % 9) });
    }
  }
  if (attRows.length) await db.insert(attendance).values(attRows);

  await db.insert(leaves).values([
    { employeeId: empIds[0].id, leaveType: "annual", fromDate: monthsAgo(1, 20), toDate: monthsAgo(1, 27), days: "6", reason: "Family vacation", status: "approved" },
    { employeeId: empIds[2].id, leaveType: "sick", fromDate: monthsAgo(2, 5), toDate: monthsAgo(2, 7), days: "2", reason: "Flu", status: "approved" },
    { employeeId: empIds[4].id, leaveType: "casual", fromDate: monthsAgo(1, 18), toDate: monthsAgo(1, 18), days: "1", reason: "Personal", status: "approved" },
    { employeeId: empIds[7].id, leaveType: "annual", fromDate: monthsAgo(0, 10), toDate: monthsAgo(0, 14), days: "4", reason: "Wedding", status: "pending" },
    { employeeId: empIds[1].id, leaveType: "hajj", fromDate: monthsAgo(-1, 5), toDate: monthsAgo(-1, 25), days: "20", reason: "Hajj pilgrimage", status: "approved" },
    { employeeId: empIds[5].id, leaveType: "umrah", fromDate: monthsAgo(1, 8), toDate: monthsAgo(1, 18), days: "10", reason: "Umrah", status: "approved" },
    { employeeId: empIds[3].id, leaveType: "special", fromDate: monthsAgo(0, 20), toDate: monthsAgo(0, 22), days: "3", reason: "Brother's wedding — special leave", status: "pending" },
  ]);

  // ---- employee expanded master (sample) ----
  await db.update(employees).set({
    surname: "Tariq", fatherName: "Mohammad Tariq", dateOfBirth: "1980-04-12", gender: "male",
    currentAddress: "House 12, Faisal Town, Lahore", permanentAddress: "Vill. Chak 44, Distt. Okara",
    probationMonths: 6,
    qualifications: [
      { title: "MBA (Finance)", year: "2008", gpa: "3.6/4.0", position: "Gold medal" },
      { title: "B.Com", year: "2004", gpa: "78%", position: "—" },
    ],
    experiences: [
      { company: "Akhuwat Foundation", period: "2009-2014", responsibilities: "Branch management, loan disbursement", achievements: "Best branch 2012", commission: "—", transport: "Yes", petrol: "5L/month", housing: "—" },
    ],
    childrenInfo: [{ name: "Hamza Tariq", dob: "2012-06-01", school: "Beaconhouse" }],
    siblingsInfo: [{ name: "Usama Tariq", relation: "Brother", occupation: "doctor" }],
    parentsInfo: [{ name: "Mohammad Tariq", relation: "Father", occupation: "retired" }, { name: "Shameem Tariq", relation: "Mother", occupation: "Homemaker" }],
    salaryHistory: [
      { date: "2016-06-15", type: "appraisal", amount: "120000", note: "Joining salary" },
      { date: "2019-07-01", type: "increment", amount: "150000", note: "Annual increment 25%" },
      { date: "2023-07-01", type: "increment", amount: "180000", note: "Appraisal + promotion" },
    ],
  }).where(eq(employees.id, empIds[0].id));
  await db.update(employees).set({ surname: "Malik", fatherName: "Malik Riaz", dateOfBirth: "1988-09-23", gender: "female", probationMonths: 3 }).where(eq(employees.id, empIds[1].id));
  await db.update(employees).set({ surname: "Raza", fatherName: "Kashif Sr.", dateOfBirth: "1990-01-15", gender: "male", probationMonths: 3 }).where(eq(employees.id, empIds[2].id));

  // ---- remote duty approvals (one approved → attendance auto-marked; one pending) ----
  const [ra1] = await db.insert(remoteApprovals).values({
    employeeId: empIds[4].id, fromDate: monthsAgo(0, 3), toDate: monthsAgo(0, 7),
    location: "Rajanpur flood camp", reason: "Field duty — relief distribution", status: "approved", approvedBy: 1,
  }).returning();
  await db.insert(remoteApprovals).values({
    employeeId: empIds[2].id, fromDate: monthsAgo(-1, 2), toDate: monthsAgo(-1, 4),
    location: "Multan medical camp", reason: "Camp coordination", status: "pending",
  });
  // attendance rows for the approved remote period (replace any office-mode rows)
  const fromStr = new Date(new Date().getFullYear(), new Date().getMonth(), 3).toISOString().slice(0, 10);
  const toStr = new Date(new Date().getFullYear(), new Date().getMonth(), 7).toISOString().slice(0, 10);
  await db.execute(sql`DELETE FROM attendance WHERE employee_id = ${empIds[4].id} AND date >= ${fromStr} AND date <= ${toStr}`);
  for (let d = 3; d <= 7; d++) {
    const date = new Date(new Date().getFullYear(), new Date().getMonth(), d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    await db.insert(attendance).values({
      employeeId: empIds[4].id, date: date.toISOString().slice(0, 10), status: "present",
      checkIn: "08:30", checkOut: "18:00", notes: "Remote/field duty — Rajanpur flood camp (auto from approval #" + ra1.id + ")",
      mode: "remote", remoteApprovalId: ra1.id,
    });
  }

  const salRows = [];
  for (let e = 0; e < empRows.length; e++) {
    for (let m = 0; m < 3; m++) {
      const d = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - m, 1);
      const basic = Number(empRows[e].salary);
      const allowances = Math.round(basic * 0.2);
      const deductions = Math.round(basic * 0.08);
      salRows.push({
        employeeId: empIds[e].id,
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        basic: String(basic), allowances: String(allowances), deductions: String(deductions),
        net: String(basic + allowances - deductions),
        status: m > 0 ? "paid" : "draft",
        paidAt: m > 0 ? d : null,
      });
    }
  }
  await db.insert(salaries).values(salRows);

  // ---- CRM ----
  const campIds = await db.insert(campaigns).values([
    { name: "Ramadan Ration Drive 2025", type: "event", startDate: monthsAgo(4, 15), endDate: monthsAgo(3, 28), target: "5000000", raised: "3250000", status: "active", description: "Monthly ration for 1000 families during Ramadan." },
    { name: "Orphan Sponsorship Drive", type: "social", startDate: monthsAgo(8, 1), target: "2000000", raised: "1450000", status: "active", description: "Sponsor an orphan for education and care." },
    { name: "Winter Clothing Appeal", type: "whatsapp", startDate: monthsAgo(6, 1), endDate: monthsAgo(5, 31), target: "800000", raised: "812000", status: "completed", description: "Warm clothes for northern regions." },
    { name: "Medical Camp — Multan", type: "event", startDate: monthsAgo(7, 20), endDate: monthsAgo(7, 22), target: "500000", raised: "500000", status: "completed", description: "Free medical camp serving 1500 patients." },
    { name: "Eid-ul-Adha Qurbani 2025", type: "email", startDate: monthsAgo(0, 1), endDate: monthsAgo(-1, 10), target: "3000000", raised: "450000", status: "planned", description: "Qurbani shares distribution." },
  ]).returning({ id: campaigns.id });

  const leadNames = ["Tariq Mehmood", "Sana Riaz", "Omar Farooq", "Aisha Siddiqui", "Junaid Akram", "Mehreen Asif", "Shahzad Ali", "Zainab Iqbal", "Danish Khan", "Rubina Tariq", "Atif Raza", "Samina Shah", "Kamran Akbar", "Nosheen Javaid", "Yasir Malik", "Farah Deen", "Irfan Haider", "Sadia Qureshi"];
  const stages = ["new", "contacted", "qualified", "converted", "lost", "new", "contacted", "qualified"];
  const sources = ["website", "referral", "event", "walk-in"];
  await db.insert(leads).values(leadNames.map((name, i) => ({
    name,
    phone: `03${String(11 + i).padStart(2, "0")}${String(1000000 + i * 7).slice(0, 7)}`,
    email: `lead${i + 1}@example.com`,
    source: sources[i % sources.length],
    campaignId: i < 10 ? campIds[i % campIds.length].id : null,
    stage: stages[i % stages.length],
    notes: "Interested in supporting ongoing programs.",
    assignedTo: (i % 3) + 1,
  })));

  // ---- Public website — our muhims (campaigns) ----
  await db.insert(publicCampaigns).values([
    { title: "Maan Ghar — Mother's Home", slug: "maan-ghar", summary: "A safe home and dignified care for abandoned and elderly mothers.", description: "Maan Ghar provides shelter, food, medical care and — above all — respect to mothers who have nowhere else to go. Your support runs the home: meals, medicines, warm beds and a family that cares.\n\nEvery mother deserves a home. Give her one.", goal: "4000000", raised: "2750000", imageUrl: "https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1200&q=80" },
    { title: "Qurbani Campaign", slug: "qurbani-campaign", summary: "Your qurbani shares, distributed as fresh meat to the poorest families.", description: "We collect qurbani shares, perform the sacrifice with full Shariah compliance, and distribute fresh meat to registered deserving families within 48 hours — with photo documentation for every donor.", goal: "3000000", raised: "1150000", imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80" },
    { title: "Eid Campaign", slug: "eid-campaign", summary: "Eid clothes, Eidi and happiness for every child on our list.", description: "No child should spend Eid without new clothes. Our Eid campaign provides complete clothing sets, shoes and Eidi to children of registered donee families — so every home celebrates.", goal: "2500000", raised: "1900000", imageUrl: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80" },
    { title: "Langar Campaign", slug: "langar-campaign", summary: "Daily free meals — no questions asked, no one turned away.", description: "Our langar serves hot, fresh meals every single day to labourers, patients' attendants, students and anyone in need. PKR 150 feeds one person for a day. PKR 4,500 sponsors a full day of langar.", goal: "1800000", raised: "1320000", imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80" },
    { title: "Feed a Family this Ramadan", slug: "ramadan-ration-2025", summary: "Provide a full month of groceries to struggling families across Pakistan.", description: "This Ramadan, your generous donation can bring smiles to thousands of families. Each ration bag contains flour, rice, oil, sugar, dates, pulses and basic spices — enough to feed a family of six for a full month.", goal: "5000000", raised: "3250000", imageUrl: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80" },
    { title: "Sponsor an Orphan's Education", slug: "orphan-education", summary: "Give an orphan child the gift of education, mentorship and care.", description: "For just PKR 5,000 a month, you can sponsor an orphan child's complete education — including school fees, books, uniforms and after-school mentoring.", goal: "2000000", raised: "1450000", imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80" },
  ]);

  // ---- Donor portal credentials (demo) ----
  await db.update(donors).set({ portalEmail: "donor@demo.org", passwordHash: hashPassword("donor123"), portalActive: true }).where(eq(donors.id, donorIds[0].id));
  await db.update(donors).set({ portalEmail: "saima@demo.org", passwordHash: hashPassword("donor123"), portalActive: true }).where(eq(donors.id, donorIds[1].id));

  // ---- areas (localities) per city ----
  await db.delete(areas);
  await db.insert(areas).values([
    // Lahore (city 1)
    ...["Model Town", "Johar Town", "DHA", "Gulberg", "Cantt", "Ichhra", "Township", "Faisal Town", "Wapda Town", "Valencia", "Bahria Town", "Garden Town", "Samanabad", "Shadman", "Mozang", "Anarkali", "Harbanspura", "Mughalpura", "Baghbanpura", "Data Darbar", "Badami Bagh", "Ferozepur Road", "Thokar Niaz Baig"].map((n) => ({ name: n, cityId: 1 })),
    // Faisalabad (city 2)
    ...["Madina Town", "Samnabad", "Ghulam Muhammad Abad", "Jinnah Colony", "Peoples Colony", "Susan Road", "D Ground"].map((n) => ({ name: n, cityId: 2 })),
    // Rawalpindi (city 6)
    ...["Saddar", "Committee Chowk", "Pirwadhai", "Chaklala", "Westridge", "Bahria Town", "Satellite Town"].map((n) => ({ name: n, cityId: 6 })),
    // Karachi (city 10)
    ...["Clifton", "Gulshan-e-Iqbal", "PECHS", "Nazimabad", "North Karachi", "Korangi", "Malir", "Saddar", "Bahadurabad", "Tariq Road", "DHA", "Gulistan-e-Jauhar", "Orangi Town", "Lyari"].map((n) => ({ name: n, cityId: 10 })),
    // Hyderabad (city 11)
    ...["Latifabad", "Qasimabad", "Auto Bhan", "Hirabad"].map((n) => ({ name: n, cityId: 11 })),
  ]);

  // ---- NADRA (simulated) identity records — matches some employee/donee CNICs ----
  await db.delete(nadraRecords);
  await db.insert(nadraRecords).values([
    { cnic: "35201-0000001-1", name: "Usman Tariq", fatherName: "Mohammad Tariq", dateOfBirth: "1980-04-12", gender: "male", address: "House 12, Faisal Town, Lahore" },
    { cnic: "35202-0000002-2", name: "Sadia Malik", fatherName: "Malik Riaz", dateOfBirth: "1988-09-23", gender: "female", address: "Gulberg, Lahore" },
    { cnic: "35201-1111222-1", name: "Sakina Begum", fatherName: "Allah Ditta", dateOfBirth: "1978-05-10", gender: "female", address: "Street 4, Shahdara, Lahore" },
    { cnic: "35201-3333444-3", name: "Nasreen Akhtar", fatherName: "Late Akhtar Hussain", dateOfBirth: "2012-02-20", gender: "female", address: "Mughalpura, Lahore" },
    { cnic: "42100-6666777-6", name: "Imran Shaikh", fatherName: "Abdul Ghafoor", dateOfBirth: "2006-09-09", gender: "male", address: "Lyari, Karachi" },
  ]);

  // ---- Pakistan salary income-tax slabs 2024-25 (annual PKR) — editable in payroll ----
  await db.delete(taxSlabs);
  await db.insert(taxSlabs).values([
    { slabOrder: 1, minAmount: "0", maxAmount: "600000", fixedTax: "0", ratePercent: "0" },
    { slabOrder: 2, minAmount: "600000", maxAmount: "1200000", fixedTax: "0", ratePercent: "2.5" },
    { slabOrder: 3, minAmount: "1200000", maxAmount: "2400000", fixedTax: "15000", ratePercent: "12.5" },
    { slabOrder: 4, minAmount: "2400000", maxAmount: "3600000", fixedTax: "165000", ratePercent: "20" },
    { slabOrder: 5, minAmount: "3600000", maxAmount: "6000000", fixedTax: "405000", ratePercent: "25" },
    { slabOrder: 6, minAmount: "6000000", maxAmount: "12000000", fixedTax: "1005000", ratePercent: "32.5" },
    { slabOrder: 7, minAmount: "12000000", maxAmount: null, fixedTax: "2955000", ratePercent: "35" },
  ]);

  // ---- staff advances control account (used when an advance is approved) ----
  const [advAcc] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, "1200"));
  if (!advAcc) {
    await db.insert(accounts).values({ code: "1200", name: "Staff Advances & Loans (Control)", type: "asset", openingBalance: "0" });
  }

  // ---- per-employee office timings (referenced by employee_code; defined later) ----
  await db.execute(sql`UPDATE employees SET time_in = '09:00', time_out = '17:00' WHERE time_in IS NULL`);
  await db.execute(sql`UPDATE employees SET time_in = '08:30', time_out = '16:30' WHERE employee_code = 'EMP-007'`); // driver — early shift
  await db.execute(sql`UPDATE employees SET time_in = '10:00', time_out = '18:00' WHERE employee_code = 'EMP-009'`); // IT — late shift

  // ---- cascading locations + photos for donors/donees ----
  await db.execute(sql`UPDATE donors SET country_id = ${pkIds[0].id}, province_id = ${provIds[0].id}, district_id = ${distIds[0].id}, city_id = 1 WHERE country_id IS NULL`);
  await db.update(donors).set({ photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80" }).where(eq(donors.id, donorIds[0].id));
  await db.update(donors).set({ photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80" }).where(eq(donors.id, donorIds[1].id));
  await db.update(donors).set({ photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" }).where(eq(donors.id, donorIds[2].id));
  await db.execute(sql`UPDATE donees SET country_id = ${pkIds[0].id}, province_id = ${provIds[0].id}, district_id = ${distIds[0].id}, city_id = 1 WHERE country_id IS NULL`);
  await db.update(donees).set({ photoUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=400&q=80" }).where(eq(donees.id, doneeIds[0].id));
  await db.update(donees).set({ photoUrl: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=400&q=80" }).where(eq(donees.id, doneeIds[2].id));
  await db.update(donees).set({ photoUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80" }).where(eq(donees.id, doneeIds[4].id));

  // ---- Vendors (partner subledger) + a vendor bill through the control account ----
  const vendorIds = await db.insert(vendors).values([
    { name: "Al-Madina Rice Traders", vendorType: "supplier", ntnNo: "4455667-1", phone: "0321-5551111", email: "sales@almadina.pk", city: "Lahore", openingBalance: "0" },
    { name: "Rehman Transport Co.", vendorType: "service", cnic: "35201-8899776-5", phone: "0300-7771122", city: "Lahore", openingBalance: "0" },
    { name: "City Pharma Distributors", vendorType: "supplier", ntnNo: "7788991-2", phone: "021-33445566", email: "orders@citypharma.pk", city: "Karachi", openingBalance: "0" },
  ]).returning({ id: vendors.id });

  // vendor bill JV: Dr Vendors Control (2200), Cr Accrued — partner-linked line posts to vendor subledger
  const [accVendorControl] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, "2200"));
  const [accWelfare] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, "4000"));
  if (accVendorControl && accWelfare) {
    const [jv] = await db.insert(vouchers).values({
      voucherNo: `JV-${new Date().getFullYear()}-0090`,
      date: monthsAgo(0, 5),
      type: "JV",
      narration: "Ration supply bill — Al-Madina Rice Traders",
      totalAmount: "185000",
      postedBy: 1,
    }).returning({ id: vouchers.id });
    const [lineA] = await db.insert(voucherLines).values({ voucherId: jv.id, accountId: accWelfare.id, debit: "185000", credit: "0", narration: "Ration purchase", partnerType: null, partnerId: null }).returning({ id: voucherLines.id });
    await db.insert(voucherLines).values({ voucherId: jv.id, accountId: accVendorControl.id, debit: "0", credit: "185000", narration: "Payable to vendor", partnerType: "vendor", partnerId: vendorIds[0].id });
    await db.insert(analyticalDistributions).values({ voucherLineId: lineA.id, costCenterId: ccIds[4].id, percent: "100", amount: "185000" });
  }

  // ---- Volunteers (demo + extras) ----
  const volPw = hashPassword("vol123");
  const volunteerIds = await db.insert(volunteers).values([
    { name: "Ali Hamza", email: "volunteer@demo.org", passwordHash: volPw, phone: "0301-2345678", city: "Lahore", volunteerType: "student", skills: "Local area knowledge, Urdu/English" },
    { name: "Maryam Siddiqui", email: "maryam.vol@gmail.com", passwordHash: volPw, phone: "0333-8877665", city: "Lahore", volunteerType: "citizen", skills: "First aid, counselling" },
    { name: "Usama Javed", email: "usama.j@outlook.com", passwordHash: volPw, phone: "0345-1122334", city: "Karachi", volunteerType: "professional", skills: "Investigation, reporting" },
    { name: "Hira Batool", email: "hira.batool@gmail.com", passwordHash: volPw, phone: "0312-9988776", city: "Faisalabad", volunteerType: "student", skills: "Photography, social media" },
  ]).returning({ id: volunteers.id });

  // ---- Missions (rescue tasks) ----
  const missionRows = await db.insert(missions).values([
    {
      title: "Lost child found at Data Darbar — trace family",
      missionType: "child-rescue",
      description: "A boy of about 6 years was found wandering near Data Darbar on the night of the 12th. He says his name is 'Hamza' and his father works at a cloth market. Police informed us; the child is safe at our center. Task: identify and locate the family, verify, and reunite.",
      location: "Data Darbar, Lahore",
      urgency: "high",
      status: "completed",
      shareOnWebsite: true,
      thumbnail: "https://images.unsplash.com/photo-1484820540004-14229fe36ca4?auto=format&fit=crop&w=1200&q=80",
      assignedBy: 1,
      dueDate: iso(new Date(Date.now() + 86400000 * 3)),
    },
    {
      title: "Elderly woman at railway station — family trace",
      missionType: "family-trace",
      description: "An elderly woman (approx. 70) was found sitting alone at Lahore railway station for two days. She remembers a son 'Imran' in Gujranwala but no address. Task: trace the family through local contacts and CNIC records.",
      location: "Lahore Railway Station",
      urgency: "medium",
      status: "in-progress",
      shareOnWebsite: false,
      assignedBy: 1,
      dueDate: iso(new Date(Date.now() + 86400000 * 7)),
    },
    {
      title: "Flood-affected family relocation — 40 families",
      missionType: "relief",
      description: "Coordinate transport and temporary shelter for 40 families moving from the flood-affected area near Rajanpur to our relief camp.",
      location: "Rajanpur → Lahore",
      urgency: "high",
      status: "assigned",
      shareOnWebsite: true,
      thumbnail: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=80",
      assignedBy: 1,
      dueDate: iso(new Date(Date.now() + 86400000 * 10)),
    },
  ]).returning();

  // location cascade + capacity on missions
  await db.update(missions).set({ countryId: pkIds[0].id, provinceId: provIds[0].id, districtId: distIds[0].id, cityId: 1, area: "Near Data Darbar, gate 3", maxHelpers: 8 }).where(eq(missions.id, missionRows[0].id));
  await db.update(missions).set({ countryId: pkIds[0].id, provinceId: provIds[0].id, districtId: distIds[0].id, cityId: 1, area: "Railway station waiting area", maxHelpers: 5 }).where(eq(missions.id, missionRows[1].id));
  await db.update(missions).set({ countryId: pkIds[0].id, provinceId: provIds[0].id, area: "Rajanpur → Lahore relief camp", maxHelpers: 20 }).where(eq(missions.id, missionRows[2].id));

  // philanthropist + social worker helpers (registered, join missions at runtime)
  await db.insert(volunteers).values([
    { name: "Settler Family Trust (rep. Adnan)", email: "adnan@settlertrust.org", passwordHash: volPw, phone: "0322-4455667", city: "Lahore", volunteerType: "philanthropist", skills: "Funding, ration procurement" },
    { name: "Nuzhat Parveen", email: "nuzhat.sw@gmail.com", passwordHash: volPw, phone: "0331-7788990", city: "Karachi", volunteerType: "social-worker", skills: "Case work, family counselling" },
  ]);

  await db.insert(missionAssignments).values([
    { missionId: missionRows[0].id, volunteerId: volunteerIds[0].id, note: "Visit cloth markets near Azam Market; coordinate with police station SHO." },
    { missionId: missionRows[0].id, volunteerId: volunteerIds[1].id, note: "Stay with the child at the center; keep him calm, record his statements." },
    { missionId: missionRows[1].id, volunteerId: volunteerIds[2].id, note: "Start with Gujranwala CNIC records via our contact." },
    { missionId: missionRows[2].id, volunteerId: volunteerIds[3].id, note: "Document the relocation with photos/video for donors." },
    { missionId: missionRows[2].id, volunteerId: volunteerIds[0].id, note: "Arrange transport from our vendor list." },
  ]);

  // community-proposed mission types (admin confirms)
  await db.insert(customMissionTypes).values([
    { label: "School Rebuilding Drive", proposedBy: "Volunteer: Hira Batool", approved: true },
    { label: "Street Kitchen (Langar Van)", proposedBy: "Philanthropist: Adnan", approved: false },
  ]);

  // simulated outbox: a receipt email already sent to the demo donor
  await db.insert(emailOutbox).values({
    toEmail: "donor@demo.org", toName: "Abdul Malik Traders",
    subject: "Donation Receipt RCP-2026-0001 — Shauoor Welfare Society",
    body: "Dear Abdul Malik Traders,\n\nJazakAllah Khair for your generous donation.\n\nReceipt No: RCP-2026-0001\nAmount: PKR 135,000\n\nYour receipt PDF is attached.\n\nWith gratitude,\nShauoor Welfare Society",
    attachmentName: "Receipt-RCP-2026-0001.pdf",
    recordType: "receipt", recordId: 1, status: "sent",
  });

  await db.insert(missionResults).values([
    {
      missionId: missionRows[0].id, volunteerId: volunteerIds[0].id,
      feedback: "Alhamdulillah — family located! Hamza's father (Rafiq, cloth merchant at Azam Market) identified him via the photos we shared in the market WhatsApp groups. Verified through CNIC and union council records. Reunited at our center at 4:30pm — very emotional scene. Father has signed the handover papers with two witnesses.",
      outcome: "success", location: "Azam Market → Shauoor Center, Lahore", sharePublicly: true,
    },
    {
      missionId: missionRows[0].id, volunteerId: volunteerIds[1].id,
      feedback: "Child was calm and cooperative throughout. He remembered his mother's name (Naseem) which helped confirm the match. Attaching photos of the reunion and the signed documents.",
      outcome: "success", location: "Shauoor Center", sharePublicly: true,
    },
    {
      missionId: missionRows[2].id, volunteerId: volunteerIds[3].id,
      feedback: "First 12 families shifted successfully. Trucks arranged via Rehman Transport. Children are receiving warm meals at the camp. Will continue tomorrow morning.",
      outcome: "partial", location: "Rajanpur Relief Camp", sharePublicly: true,
    },
  ]);

  // ---- Media: impact photos/videos for donees + campaigns + missions ----
  const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
  await db.insert(media).values([
    { title: "Sakina's stitching setup — month 3", caption: "With your monthly support, Sakina bought a second-hand sewing machine and now earns on her own.", mediaType: "image", url: img("photo-1590736969955-71cc94901144"), linkType: "donee", linkId: doneeIds[0].id, uploadedBy: 1 },
    { title: "Ration delivery — Sakina's family", caption: "Monthly ration bag delivered and verified.", mediaType: "image", url: img("photo-1593113598332-cd288d649433"), linkType: "donee", linkId: doneeIds[0].id, uploadedBy: 1 },
    { title: "Nasreen's school report card 🎉", caption: "Your orphan sponsorship put Nasreen in school — she stood 3rd in class this term!", mediaType: "image", url: img("photo-1488521787991-ed7bbaae773c"), linkType: "donee", linkId: doneeIds[2].id, uploadedBy: 1 },
    { title: "Nasreen — first day at school", caption: "Uniform, books and a big smile.", mediaType: "image", url: img("photo-1497633762265-9d179a990aa6"), linkType: "donee", linkId: doneeIds[2].id, uploadedBy: 1 },
    { title: "Iqbal's dialysis — week 12 update", caption: "Treatment continues smoothly. Iqbal bhai sends his duas to all donors.", mediaType: "image", url: img("photo-1584515933487-779824d29309"), linkType: "donee", linkId: doneeIds[3].id, uploadedBy: 1 },
    { title: "Imran's matric result day", caption: "Your education support — Imran passed matric with 78%!", mediaType: "image", url: img("photo-1523050854058-8df90110c9f1"), linkType: "donee", linkId: doneeIds[5].id, uploadedBy: 1 },
    { title: "Langar — Friday special", caption: "450 plates served at the Friday langar.", mediaType: "image", url: img("photo-1547592180-85f173990554"), linkType: "campaign", linkId: 4, uploadedBy: 1 },
    { title: "Eid clothes distribution", caption: "Children receiving their Eid outfits.", mediaType: "image", url: img("photo-1519677100203-a0e668c92439"), linkType: "campaign", linkId: 3, uploadedBy: 1 },
    { title: "Maan Ghar — evening chai", caption: "Our mothers at Maan Ghar sharing chai and stories.", mediaType: "image", url: img("photo-1516307365426-bea591f05011"), linkType: "campaign", linkId: 1, uploadedBy: 1 },
    { title: "Hamza reunited with his father", caption: "The moment our volunteers brought Hamza home.", mediaType: "image", url: img("photo-1484820540004-14229fe36ca4"), linkType: "mission", linkId: missionRows[0].id, uploadedBy: 1 },
    { title: "Signed handover documents", caption: "Verification complete — father's CNIC matched.", mediaType: "image", url: img("photo-1450101499163-c8848c66ca85"), linkType: "mission", linkId: missionRows[0].id, uploadedBy: 1 },
    { title: "Relief camp — first night", caption: "12 families settled, warm meals served.", mediaType: "image", url: img("photo-1469571486292-0ba58a3f068b"), linkType: "mission", linkId: missionRows[2].id, uploadedBy: 1 },
    { title: "Field update from the team", caption: "A day in the life of our welfare workers.", mediaType: "video", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", linkType: "donee", linkId: doneeIds[0].id, uploadedBy: 1 },
    { title: "Ration packing drive", caption: "Volunteers packing 500 ration bags.", mediaType: "video", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", linkType: "campaign", linkId: 5, uploadedBy: 1 },
  ]);

  // ---- Posts (daily columns / stories / updates) ----
  const nowTs = new Date();
  const daysAgo = (d: number) => new Date(nowTs.getTime() - d * 86400000);
  await db.insert(posts).values([
    {
      title: "Hamza is home — a rescue mission completed", slug: "hamza-is-home",
      excerpt: "Six days ago a 6-year-old was found alone at Data Darbar. Today he is back in his father's arms. This is what your support makes possible.",
      body: "When the police called us that night, all we knew was a name — Hamza — and a frightened child holding a toy car.\n\nOur volunteers Ali and Maryam took the mission from there. They visited every cloth market in the area, shared photos through shopkeepers' WhatsApp groups, and coordinated with the SHO. Meanwhile Maryam stayed with Hamza at our center, earning his trust one conversation at a time.\n\nOn day four, a shopkeeper recognized the boy's description. By day five we had a father — Rafiq — who had not slept since his son went missing. CNIC verification, union council records, two witnesses, signed papers.\n\nAt 4:30pm, Hamza ran into his father's arms. Maryam cried. Ali cried. Rafiq could not stop thanking the strangers who brought his world back.\n\nThis is the power of a community that cares. Thank you for standing with us.",
      coverImage: img("photo-1484820540004-14229fe36ca4"), category: "story", author: "Shauoor Team", isPublished: true, publishedAt: daysAgo(1),
    },
    {
      title: "Why we publish our accounts — every rupee, in the open", slug: "why-we-publish-our-accounts",
      excerpt: "Trust is earned in daylight. That's why our Income & Expenditure and Balance Sheet are live on this website, generated straight from our ledger.",
      body: "Charity in our tradition is a sacred trust (amanah). When you give us your zakat, your sadaqah, your qurbani share — you are placing a trust in our hands.\n\nWe believe that trust deserves daylight. So we did something unusual: we put our accounting system online. Not a yearly PDF. Not a summary. The actual Income & Expenditure Account and Balance Sheet, generated live from our double-entry ledger, visible to anyone.\n\nEvery voucher is balanced. Every expense is categorized by program. Every partner — donor, donee, vendor — is reconciled against its control account, the same way Odoo and SAP handle ledgers.\n\nTransparency is not a feature. It is the foundation.",
      coverImage: img("photo-1450101499163-c8848c66ca85"), category: "column", author: "Ahmad Raza", isPublished: true, publishedAt: daysAgo(2),
    },
    {
      title: "Nasreen stood 3rd in her class", slug: "nasreen-third-in-class",
      excerpt: "Two years ago Nasreen had never seen the inside of a classroom. Last week she stood on stage with a medal. This is your orphan sponsorship at work.",
      body: "In 2024, Nasreen's grandmother told our survey team: 'She is too sharp to be begging on the streets.'\n\nYour orphan sponsorship changed everything — school fees, books, uniform, and a mentor who checks in every week. Nasreen's grandmother stitched a special dress for the prize distribution.\n\nShe stood 3rd in Class 6. When we asked what she wants to become, she said: 'Doctor. So I can help people like the doctors helped my mother.'\n\nPKR 5,000 a month. That is the distance between a street corner and a stage.",
      coverImage: img("photo-1488521787991-ed7bbaae773c"), category: "story", author: "Shauoor Team", isPublished: true, publishedAt: daysAgo(3),
    },
    {
      title: "Langar log: 450 plates on Friday", slug: "langar-log-friday",
      excerpt: "Rain, traffic, a broken stove at 1pm — and still 450 hot plates went out. A quick update from the langar kitchen.",
      body: "Friday updates from the kitchen:\n\n• 450 plates served (daal, rice, salad, roti)\n• 60kg rice, 40kg daal, 320 rotis\n• Special guests: patients' attendants from the nearby hospital\n\nThe stove broke at 1pm. Our vendor Rehman Transport's driver — who was eating with us — helped fix it. That's langar: everyone gives, everyone receives.\n\nSponsor a full langar day for PKR 4,500.",
      coverImage: img("photo-1547592180-85f173990554"), category: "update", author: "Langar Team", isPublished: true, publishedAt: daysAgo(4),
    },
    {
      title: "Maan Ghar: Ammi Jan's 80th birthday", slug: "maan-ghar-birthday",
      excerpt: "She had not celebrated a birthday in 30 years. Last week the whole Maan Ghar family sang for her.",
      body: "When Khala Zainab came to Maan Ghar two years ago, she told us she had forgotten what birthdays felt like.\n\nLast week she turned 80. The mothers organized everything secretly — a cake from the bazaar, handmade cards, a new shawl. The staff brought balloons.\n\nWhen the candles lit up, she said: 'I thought my life was over. You people made it a home.'\n\nMaan Ghar runs entirely on donations. PKR 15,000 keeps one mother housed, fed and cared for — for a whole month.",
      coverImage: img("photo-1516307365426-bea591f05011"), category: "story", author: "Maan Ghar Team", isPublished: true, publishedAt: daysAgo(6),
    },
  ]);

  // ---- Analytical distributions on earlier welfare vouchers ----
  const welfareLines = (await db
    .select({ id: voucherLines.id, debit: voucherLines.debit, voucherId: voucherLines.voucherId })
    .from(voucherLines)
    .where(sql`${voucherLines.accountId} = ${accWelfare ? accWelfare.id : 0} AND ${voucherLines.debit}::numeric > 0`)) as { id: number; debit: string; voucherId: number }[];
  const distPlan = [
    [{ cc: 4, pct: 60 }, { cc: 3, pct: 40 }],
    [{ cc: 0, pct: 100 }],
    [{ cc: 1, pct: 50 }, { cc: 2, pct: 50 }],
    [{ cc: 4, pct: 100 }],
  ];
  welfareLines.slice(0, distPlan.length).forEach((wl, i) => {
    const amt = Number(wl.debit);
    void db.insert(analyticalDistributions).values(
      distPlan[i].map((d) => ({
        voucherLineId: wl.id,
        costCenterId: ccIds[d.cc].id,
        percent: String(d.pct),
        amount: String(Math.round(amt * d.pct) / 100),
      }))
    );
  });

  // ---- Partner-linked subledger postings (Odoo/SAP style: partner lines on control accounts) ----
  const [accDonorCtrl] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, "1100"));
  const [accDoneeCtrl] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, "2100"));
  const [accIncomeMain] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, "3000"));
  const [accWelfareMain] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, "4000"));

  let jvSeq = 100;
  async function postSubledgerJV(date: string, narration: string, lines: { acc: number; dr: number; cr: number; pt?: string; pid?: number }[]) {
    jvSeq += 1;
    const total = lines.reduce((s, l) => s + l.dr, 0);
    const [v] = await db.insert(vouchers).values({
      voucherNo: `JV-${new Date().getFullYear()}-${String(jvSeq).padStart(4, "0")}`,
      date, type: "JV", narration, totalAmount: String(total), postedBy: 1,
    }).returning({ id: vouchers.id });
    await db.insert(voucherLines).values(lines.map((l) => ({
      voucherId: v.id, accountId: l.acc, debit: String(l.dr), credit: String(l.cr),
      narration, partnerType: l.pt ?? null, partnerId: l.pid ?? null,
    })));
  }

  if (accDonorCtrl && accIncomeMain) {
    // Donor 0 (Abdul Malik Traders): 190,000 received on account, 135,000 allocated → 55,000 held
    await postSubledgerJV(monthsAgo(4, 14), "Funds received on account — Abdul Malik Traders (held per donor intent)", [
      { acc: accIncomeMain.id, dr: 190000, cr: 0 },
      { acc: accDonorCtrl.id, dr: 0, cr: 190000, pt: "donor", pid: donorIds[0].id },
    ]);
    await postSubledgerJV(monthsAgo(2, 15), "Allocated to Ration & Debt Relief programs — donor instruction (RCP receipts)", [
      { acc: accDonorCtrl.id, dr: 135000, cr: 0, pt: "donor", pid: donorIds[0].id },
      { acc: accIncomeMain.id, dr: 0, cr: 135000 },
    ]);
    // Donor 4 (Zainab Foundation UK): 60,000 fully allocated to Orphan Care
    await postSubledgerJV(monthsAgo(2, 12), "Grant received on account — Zainab Foundation UK", [
      { acc: accIncomeMain.id, dr: 60000, cr: 0 },
      { acc: accDonorCtrl.id, dr: 0, cr: 60000, pt: "donor", pid: donorIds[4].id },
    ]);
    await postSubledgerJV(monthsAgo(1, 16), "Fully allocated to Orphan Care & General Welfare — Zainab Foundation", [
      { acc: accDonorCtrl.id, dr: 60000, cr: 0, pt: "donor", pid: donorIds[4].id },
      { acc: accIncomeMain.id, dr: 0, cr: 60000 },
    ]);
    // Donor 7 (Aisha Welfare Trust): zakat 76,000 — restricted, still held
    await postSubledgerJV(monthsAgo(3, 13), "Zakat received — RESTRICTED, held for approved zakat recipients (Aisha Welfare Trust)", [
      { acc: accIncomeMain.id, dr: 76000, cr: 0 },
      { acc: accDonorCtrl.id, dr: 0, cr: 76000, pt: "donor", pid: donorIds[7].id },
    ]);
  }

  if (accDoneeCtrl && accWelfareMain) {
    // Donee payables: approved-not-paid batches stay payable; paid batches accrue then settle
    const allBatches = await db.select().from(disbursementBatches);
    for (const b of allBatches) {
      if (b.status !== "approved" && b.status !== "paid") continue;
      const lines = await db.select().from(disbursements).where(eq(disbursements.batchId, b.id));
      for (const l of lines) {
        if (!l.doneeId) continue;
        const amt = Number(l.paidAmount);
        await postSubledgerJV(b.date, `Payable accrued — ${l.doneeName ?? "donee"} (${b.batchNo})`, [
          { acc: accWelfareMain.id, dr: amt, cr: 0 },
          { acc: accDoneeCtrl.id, dr: 0, cr: amt, pt: "donee", pid: l.doneeId },
        ]);
        if (b.status === "paid") {
          await postSubledgerJV(b.date, `Disbursed & settled — ${l.doneeName ?? "donee"} (${b.batchNo})`, [
            { acc: accDoneeCtrl.id, dr: amt, cr: 0, pt: "donee", pid: l.doneeId },
            { acc: accWelfareMain.id, dr: 0, cr: amt },
          ]);
        }
      }
    }
  }

  // ---- Sample audit log entries ----
  const sampleUsers = ["Ahmad Raza", "Fatima Khan", "Bilal Ahmed", "Ayesha Noor"];
  const sampleModules = ["donations.donors", "donations.receipts", "donations.disbursements", "hrm.employees", "accounting.vouchers", "setup.costcenters", "crm.leads"];
  const sampleActions = ["create", "update", "update", "delete", "import", "login", "update"];
  const auditSeed = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const action = sampleActions[i % sampleActions.length];
    auditSeed.push({
      userId: (i % 4) + 1,
      userName: sampleUsers[i % sampleUsers.length],
      module: i % 7 === 5 ? "auth" : sampleModules[i % sampleModules.length],
      recordId: Math.floor(Math.random() * 20) + 1,
      action,
      changes:
        action === "update"
          ? [{ field: ["phone", "paidAmount", "status", "salary", "name"][i % 5], oldValue: "old-value", newValue: "new-value" }, { field: "remarks", oldValue: "", newValue: "Updated during review" }]
          : action === "create"
          ? [{ field: "name", oldValue: null, newValue: "New record created" }]
          : action === "delete"
          ? [{ field: "record", oldValue: "Deleted record snapshot", newValue: null }]
          : action === "login"
          ? [{ field: "session", oldValue: null, newValue: "signed in" }]
          : [{ field: "imported", oldValue: null, newValue: "5 rows" }],
      ipAddress: "192.168.1." + (10 + (i % 40)),
      createdAt: new Date(now.getTime() - Math.floor(Math.random() * 60 * 24 * 5) * 60000),
    });
  }
  await db.insert(auditLogs).values(auditSeed);

  console.log("✅ Seeded successfully");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
