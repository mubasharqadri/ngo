import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  date,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// ---------- SETUP ----------
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  tagline: varchar("tagline", { length: 255 }),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 60 }),
  address: text("address"),
  city: varchar("city", { length: 120 }),
  country: varchar("country", { length: 120 }),
  regNumber: varchar("reg_number", { length: 120 }),
  ntn: varchar("ntn", { length: 80 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  phoneCode: varchar("phone_code", { length: 10 }),
});

export const provinces = pgTable("provinces", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  countryId: integer("country_id").references(() => countries.id, { onDelete: "cascade" }),
});

export const districts = pgTable("districts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  provinceId: integer("province_id").references(() => provinces.id, { onDelete: "cascade" }),
});

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  districtId: integer("district_id").references(() => districts.id, { onDelete: "cascade" }),
});

// Areas / localities within a city (can be extended by users with confirmation)
export const areas = pgTable("areas", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  cityId: integer("city_id").references(() => cities.id, { onDelete: "cascade" }),
});

// Simulated NADRA identity records (for CNIC verification demo)
export const nadraRecords = pgTable("nadra_records", {
  id: serial("id").primaryKey(),
  cnic: varchar("cnic", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  fatherName: varchar("father_name", { length: 200 }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
});

// Pakistan salary income-tax slabs (editable in the payroll page) — annual amounts
export const taxSlabs = pgTable("tax_slabs", {
  id: serial("id").primaryKey(),
  slabOrder: integer("slab_order").notNull(),
  minAmount: numeric("min_amount", { precision: 16, scale: 2 }).notNull(),
  maxAmount: numeric("max_amount", { precision: 16, scale: 2 }), // null = no upper limit
  fixedTax: numeric("fixed_tax", { precision: 16, scale: 2 }).default("0"),
  ratePercent: numeric("rate_percent", { precision: 6, scale: 2 }).notNull(),
});

export const costCenters = pgTable("cost_centers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 40 }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
});

// ---------- ADMINISTRATION ----------
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  roleId: integer("role_id").references(() => roles.id),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- DONATIONS ----------
export const donors = pgTable("donors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  donorType: varchar("donor_type", { length: 30 }).default("individual"), // individual | corporate | zakat
  isAnonymous: boolean("is_anonymous").default(false),
  // membership / registration
  membershipNo: varchar("membership_no", { length: 60 }),
  membershipDate: date("membership_date"),
  registeredNo: varchar("registered_no", { length: 60 }),
  stnNo: varchar("stn_no", { length: 60 }),
  ntnNo: varchar("ntn_no", { length: 60 }),
  // identity
  cnic: varchar("cnic", { length: 30 }),
  fatherName: varchar("father_name", { length: 200 }),
  gender: varchar("gender", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  occupation: varchar("occupation", { length: 120 }),
  religion: varchar("religion", { length: 60 }),
  bloodGroup: varchar("blood_group", { length: 10 }),
  // contact
  contactPerson: varchar("contact_person", { length: 200 }),
  phone: varchar("phone", { length: 40 }),
  mobileNo: varchar("mobile_no", { length: 40 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  permanentAddress: text("permanent_address"),
  city: varchar("city", { length: 120 }),
  country: varchar("country", { length: 120 }),
  // support
  introducerName: varchar("introducer_name", { length: 200 }),
  supportType: varchar("support_type", { length: 40 }),
  supportThrough: varchar("support_through", { length: 40 }),
  // destitute reference
  nameOfDestitute: varchar("name_of_destitute", { length: 200 }),
  destituteAddress: text("destitute_address"),
  destituteContact: varchar("destitute_contact", { length: 60 }),
  // ---- cascading location + photo ----
  countryId: integer("country_id").references(() => countries.id),
  provinceId: integer("province_id").references(() => provinces.id),
  districtId: integer("district_id").references(() => districts.id),
  cityId: integer("city_id").references(() => cities.id),
  areaId: integer("area_id").references(() => areas.id),
  area: varchar("area", { length: 150 }),
  photoUrl: varchar("photo_url", { length: 600 }),
  status: varchar("status", { length: 20 }).default("active"), // active | cancelled
  remarks: text("remarks"),
  // ---- Donor portal login ----
  portalEmail: varchar("portal_email", { length: 200 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  portalActive: boolean("portal_active").default(false),
  lastPortalLogin: timestamp("last_portal_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const donees = pgTable("donees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  doneeType: varchar("donee_type", { length: 40 }), // individual | family | institution | orphan-child
  category: varchar("category", { length: 60 }), // widow, orphan, disabled, student, medical
  status: varchar("status", { length: 30 }).default("active"), // active | inactive | graduated
  // identity
  cnic: varchar("cnic", { length: 30 }),
  fatherName: varchar("father_name", { length: 200 }),
  gender: varchar("gender", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  religion: varchar("religion", { length: 60 }),
  nationality: varchar("nationality", { length: 80 }),
  qualification: varchar("qualification", { length: 120 }),
  occupation: varchar("occupation", { length: 120 }),
  // contact
  contactPerson: varchar("contact_person", { length: 200 }),
  stnNo: varchar("stn_no", { length: 60 }),
  ntnNo: varchar("ntn_no", { length: 60 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  city: varchar("city", { length: 120 }),
  // family
  homeStatus: varchar("home_status", { length: 40 }), // owned | rented | temporary | none
  familySize: integer("family_size"),
  menMembers: integer("men_members"),
  womenMembers: integer("women_members"),
  boyMembers: integer("boy_members"),
  girlMembers: integer("girl_members"),
  // economics
  monthlyIncome: numeric("monthly_income", { precision: 14, scale: 2 }), // family income
  personalIncome: numeric("personal_income", { precision: 14, scale: 2 }),
  workAbility: varchar("work_ability", { length: 40 }), // able | partially | unable
  // case
  problemType: varchar("problem_type", { length: 80 }),
  caseHistory: text("case_history"),
  introducerName: varchar("introducer_name", { length: 200 }),
  introducerPhone: varchar("introducer_phone", { length: 40 }),
  registeredNo: varchar("registered_no", { length: 60 }),
  caseCoordinator: varchar("case_coordinator", { length: 200 }),
  // bank
  bankAccountTitle: varchar("bank_account_title", { length: 200 }),
  bankAccountNo: varchar("bank_account_no", { length: 60 }),
  bankName: varchar("bank_name", { length: 120 }),
  // ---- cascading location + photo ----
  countryId: integer("country_id").references(() => countries.id),
  provinceId: integer("province_id").references(() => provinces.id),
  districtId: integer("district_id").references(() => districts.id),
  cityId: integer("city_id").references(() => cities.id),
  areaId: integer("area_id").references(() => areas.id),
  area: varchar("area", { length: 150 }),
  photoUrl: varchar("photo_url", { length: 600 }),
  remarks: text("remarks"),
  verifiedBy: integer("verified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- DONATION RECEIPT (master / detail / monthly distribution) ----------
export const donationReceipts = pgTable("donation_receipts", {
  id: serial("id").primaryKey(),
  receiptNo: varchar("receipt_no", { length: 60 }).notNull().unique(),
  receiptDate: date("receipt_date").notNull(), // when the receipt is entered
  donationDate: date("donation_date").notNull(), // actual / approval date of donation
  donorId: integer("donor_id").references(() => donors.id, { onDelete: "set null" }),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  restrictUseInFund: boolean("restrict_use_in_fund").default(false), // donor restricts use to given fund/program
  instrumentNo: varchar("instrument_no", { length: 120 }), // cheque no, online payment no, etc.
  instrumentDate: date("instrument_date"),
  voucherNo: varchar("voucher_no", { length: 60 }), // voucher created by this receipt
  voucherType: varchar("voucher_type", { length: 30 }), // CRV | BRV | JV ...
  remarks: text("remarks"),
  status: varchar("status", { length: 20 }).default("active"), // active | cancelled
  issuedBy: integer("issued_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Receipt DETAIL — donor can pay for different donees / funds / periods
export const receiptLines = pgTable("receipt_lines", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id")
    .references(() => donationReceipts.id, { onDelete: "cascade" })
    .notNull(),
  serialNo: integer("serial_no").notNull(),
  doneeId: integer("donee_id").references(() => donees.id, { onDelete: "set null" }),
  categoryId: integer("category_id").references(() => costCenters.id), // fund type
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  remarks: text("remarks"),
  fromDate: date("from_date"), // donation period start
  toDate: date("to_date"), // donation period end
});

// Receipt DISTRIBUTION — detail split month-wise (generated from detail)
export const receiptDistributions = pgTable("receipt_distributions", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id")
    .references(() => donationReceipts.id, { onDelete: "cascade" })
    .notNull(),
  serialNo: integer("serial_no").notNull(), // matches detail serial
  month: varchar("month", { length: 7 }), // YYYY-MM
  doneeId: integer("donee_id").references(() => donees.id, { onDelete: "set null" }),
  categoryId: integer("category_id").references(() => costCenters.id), // fund type
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  remarks: text("remarks"),
  fromDate: date("from_date"),
  toDate: date("to_date"),
});

export const disbursementBatches = pgTable("disbursement_batches", {
  id: serial("id").primaryKey(),
  batchNo: varchar("batch_no", { length: 60 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  date: date("date").notNull(),
  fund: varchar("fund", { length: 100 }).notNull(),
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  status: varchar("status", { length: 30 }).default("draft"), // draft | approved | paid | cancelled
  voucherNo: varchar("voucher_no", { length: 60 }), // voucher created by this batch
  voucherType: varchar("voucher_type", { length: 30 }), // CPV | BPV | JV ...
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const disbursements = pgTable("disbursements", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id")
    .references(() => disbursementBatches.id, { onDelete: "cascade" })
    .notNull(),
  // donor reference (where this money came from)
  donorReceiptNo: varchar("donor_receipt_no", { length: 60 }),
  donorSerialNo: integer("donor_serial_no"),
  donorReceiptDate: date("donor_receipt_date"),
  donorId: integer("donor_id").references(() => donors.id, { onDelete: "set null" }),
  // donee (can be changed at disbursement time)
  doneeId: integer("donee_id").references(() => donees.id, { onDelete: "set null" }),
  doneeName: varchar("donee_name", { length: 200 }),
  doneeCategoryId: integer("donee_category_id").references(() => costCenters.id),
  program: varchar("program", { length: 120 }), // fund / welfare program (changeable)
  // payment instrument
  instrumentNo: varchar("instrument_no", { length: 120 }),
  instrumentDate: date("instrument_date"),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).notNull(),
  remarks: text("remarks"),
  // workflow
  generatedBy: integer("generated_by").references(() => users.id),
  generateDate: timestamp("generate_date").defaultNow(),
  approvedBy: integer("approved_by").references(() => users.id),
  approveDate: timestamp("approve_date"),
  proceededBy: integer("proceeded_by").references(() => users.id),
  proceedDate: timestamp("proceed_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- HRM ----------
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 40 }).unique(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  cnic: varchar("cnic", { length: 30 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 200 }),
  designation: varchar("designation", { length: 120 }),
  department: varchar("department", { length: 120 }),
  dateOfJoining: date("date_of_joining"),
  salary: numeric("salary", { precision: 14, scale: 2 }),
  status: varchar("status", { length: 30 }).default("active"), // active | resigned | terminated
  // ---- expanded HR master ----
  surname: varchar("surname", { length: 120 }),
  fatherName: varchar("father_name", { length: 200 }),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  currentAddress: text("current_address"),
  permanentAddress: text("permanent_address"),
  resignDate: date("resign_date"),
  resignReason: text("resign_reason"),
  rejoinDate: date("rejoin_date"),
  rejoinReason: text("rejoin_reason"),
  commissionHonor: numeric("commission_honor", { precision: 14, scale: 2 }),
  transferredFromDept: varchar("transferred_from_dept", { length: 120 }),
  previousDesignation: varchar("previous_designation", { length: 120 }),
  probationMonths: integer("probation_months").default(3),
  timeIn: varchar("time_in", { length: 10 }), // per-employee office start time
  timeOut: varchar("time_out", { length: 10 }), // per-employee office end time
  cnicVerified: boolean("cnic_verified").default(false),
  // resign / rejoin history: [{date, type: resign|rejoin, reason, probation: yes|no}]
  employmentHistory: jsonb("employment_history").$type<{ date: string; type: string; reason: string; probation: string }[]>().default([]),
  // structured histories (arrays of objects)
  qualifications: jsonb("qualifications").$type<{ title: string; year: string; gpa: string; position: string }[]>().default([]),
  experiences: jsonb("experiences").$type<{ company: string; period: string; responsibilities: string; achievements: string; commission: string; transport: string; petrol: string; housing: string }[]>().default([]),
  childrenInfo: jsonb("children_info").$type<{ name: string; dob: string; school: string }[]>().default([]),
  siblingsInfo: jsonb("siblings_info").$type<{ name: string; relation: string; occupation: string }[]>().default([]),
  parentsInfo: jsonb("parents_info").$type<{ name: string; relation: string; occupation: string }[]>().default([]),
  salaryHistory: jsonb("salary_history").$type<{ date: string; type: string; amount: string; note: string }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // present | absent | half | leave
  checkIn: varchar("check_in", { length: 10 }),
  checkOut: varchar("check_out", { length: 10 }),
  notes: text("notes"),
  mode: varchar("mode", { length: 20 }).default("office"), // office | remote
  remoteApprovalId: integer("remote_approval_id"),
});

// Remote-work approval → auto attendance for field/remote duties
export const remoteApprovals = pgTable("remote_approvals", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  location: varchar("location", { length: 200 }),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).default("pending"), // pending | approved | rejected
  approvedBy: integer("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull(),
  leaveType: varchar("leave_type", { length: 40 }).notNull(), // casual, sick, annual, maternity
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  days: numeric("days", { precision: 5, scale: 1 }),
  reason: text("reason"),
  status: varchar("status", { length: 30 }).default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salaries = pgTable("salaries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull(),
  month: varchar("month", { length: 10 }).notNull(), // YYYY-MM
  basic: numeric("basic", { precision: 14, scale: 2 }),
  allowances: numeric("allowances", { precision: 14, scale: 2 }).default("0"),
  deductions: numeric("deductions", { precision: 14, scale: 2 }).default("0"),
  net: numeric("net", { precision: 14, scale: 2 }),
  status: varchar("status", { length: 20 }).default("draft"), // draft | paid
  paidAt: timestamp("paid_at"),
  otherDeductions: jsonb("other_deductions").$type<{ description: string; amount: string }[]>().default([]),
});

export const advances = pgTable("advances", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  purpose: text("purpose"),
  date: date("date").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending | approved | settled
  advanceType: varchar("advance_type", { length: 30 }).default("for-month"), // for-month | against-salary
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  voucherId: integer("voucher_id"),
  voucherNo: varchar("voucher_no", { length: 60 }),
});

// HR policy limits (management-approved rules)
export const hrPolicies = pgTable("hr_policies", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 60 }).notNull().unique(),
  value: varchar("value", { length: 60 }).notNull(),
});

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  installments: integer("installments"),
  monthlyDeduction: numeric("monthly_deduction", { precision: 14, scale: 2 }),
  startDate: date("start_date").notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active | settled
});

// ---------- ACCOUNTING ----------
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 40 }).notNull(), // asset | liability | income | expense | equity
  parentId: integer("parent_id"),
  openingBalance: numeric("opening_balance", { precision: 14, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  // ---- Control / reconciliation account (partner subledger, Odoo/SAP style) ----
  isControl: boolean("is_control").default(false),
  controlFor: varchar("control_for", { length: 20 }), // donor | donee | vendor
});

export const vouchers = pgTable("vouchers", {
  id: serial("id").primaryKey(),
  voucherNo: varchar("voucher_no", { length: 60 }).notNull().unique(),
  date: date("date").notNull(),
  type: varchar("type", { length: 30 }).notNull(), // receipt | payment | journal | contra
  narration: text("narration"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("posted"), // posted | cancelled
  postedBy: integer("posted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voucherLines = pgTable("voucher_lines", {
  id: serial("id").primaryKey(),
  voucherId: integer("voucher_id")
    .references(() => vouchers.id, { onDelete: "cascade" })
    .notNull(),
  accountId: integer("account_id")
    .references(() => accounts.id)
    .notNull(),
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  debit: numeric("debit", { precision: 14, scale: 2 }).default("0"),
  credit: numeric("credit", { precision: 14, scale: 2 }).default("0"),
  narration: text("narration"),
  // ---- partner subledger link (control account detail) ----
  partnerType: varchar("partner_type", { length: 20 }), // donor | donee | vendor
  partnerId: integer("partner_id"),
});

// ---------- ANALYTICAL DISTRIBUTION (Odoo-style: split a line across cost centers) ----------
export const analyticalDistributions = pgTable("analytical_distributions", {
  id: serial("id").primaryKey(),
  voucherLineId: integer("voucher_line_id")
    .references(() => voucherLines.id, { onDelete: "cascade" })
    .notNull(),
  costCenterId: integer("cost_center_id").references(() => costCenters.id).notNull(),
  percent: numeric("percent", { precision: 5, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
});

// ---------- CRM ----------
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 40 }), // sms | email | whatsapp | event | social
  startDate: date("start_date"),
  endDate: date("end_date"),
  target: numeric("target", { precision: 14, scale: 2 }),
  raised: numeric("raised", { precision: 14, scale: 2 }).default("0"),
  status: varchar("status", { length: 30 }).default("planned"), // planned | active | completed
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 200 }),
  source: varchar("source", { length: 60 }), // website | referral | event | walk-in
  campaignId: integer("campaign_id").references(() => campaigns.id),
  stage: varchar("stage", { length: 40 }).default("new"), // new | contacted | qualified | converted | lost
  notes: text("notes"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- PUBLIC WEBSITE ----------
export const publicCampaigns = pgTable("public_campaigns", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  summary: text("summary"),
  description: text("description"),
  goal: numeric("goal", { precision: 14, scale: 2 }),
  raised: numeric("raised", { precision: 14, scale: 2 }).default("0"),
  imageUrl: varchar("image_url", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aboutContent = pgTable("about_content", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 60 }).notNull().unique(),
  value: text("value").notNull(),
});

// ---------- AUDIT LOG (tracks every column change) ----------
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 200 }),
  module: varchar("module", { length: 80 }).notNull(),
  recordId: integer("record_id"),
  action: varchar("action", { length: 30 }).notNull(), // create | update | delete | import | login
  changes: jsonb("changes").$type<{ field: string; oldValue: unknown; newValue: unknown }[]>().default([]),
  ipAddress: varchar("ip_address", { length: 60 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- VENDORS (partner subledger) ----------
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  vendorType: varchar("vendor_type", { length: 40 }), // supplier | contractor | service
  cnic: varchar("cnic", { length: 30 }),
  ntnNo: varchar("ntn_no", { length: 60 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 200 }),
  address: text("address"),
  city: varchar("city", { length: 120 }),
  openingBalance: numeric("opening_balance", { precision: 14, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- MEDIA (photos & videos, linked polymorphically) ----------
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }),
  caption: text("caption"),
  mediaType: varchar("media_type", { length: 10 }).notNull(), // image | video
  url: varchar("url", { length: 600 }).notNull(), // served path or external URL
  linkType: varchar("link_type", { length: 20 }), // donee | campaign | post | mission | donor | general
  linkId: integer("link_id"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- POSTS (daily columns / stories / updates) ----------
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 250 }).notNull(),
  slug: varchar("slug", { length: 250 }).notNull().unique(),
  excerpt: text("excerpt"),
  body: text("body"),
  coverImage: varchar("cover_image", { length: 600 }),
  category: varchar("category", { length: 30 }).default("update"), // column | story | update
  author: varchar("author", { length: 120 }),
  isPublished: boolean("is_published").default(true),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- VOLUNTEERS (free workers) with portal login ----------
export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  cnic: varchar("cnic", { length: 30 }),
  city: varchar("city", { length: 120 }),
  volunteerType: varchar("volunteer_type", { length: 30 }).default("citizen"), // student | citizen | professional
  skills: text("skills"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- MISSIONS (rescue tasks, e.g. lost child) ----------
export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 250 }).notNull(),
  missionType: varchar("mission_type", { length: 30 }).default("child-rescue"), // child-rescue | family-trace | relief | other
  description: text("description"),
  location: varchar("location", { length: 200 }),
  urgency: varchar("urgency", { length: 10 }).default("medium"), // high | medium | low
  status: varchar("status", { length: 20 }).default("open"), // open | assigned | in-progress | completed | closed
  shareOnWebsite: boolean("share_on_website").default(false),
  thumbnail: varchar("thumbnail", { length: 600 }),
  assignedBy: integer("assigned_by").references(() => users.id),
  dueDate: date("due_date"),
  // ---- location cascade + capacity + custom type ----
  countryId: integer("country_id").references(() => countries.id),
  provinceId: integer("province_id").references(() => provinces.id),
  districtId: integer("district_id").references(() => districts.id),
  cityId: integer("city_id").references(() => cities.id),
  area: varchar("area", { length: 200 }),
  maxHelpers: integer("max_helpers"),
  otherTypeLabel: varchar("other_type_label", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Community-submitted mission types (need admin confirmation)
export const customMissionTypes = pgTable("custom_mission_types", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  proposedBy: varchar("proposed_by", { length: 120 }),
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Simulated email outbox (receipt emails with PDF attachment)
export const emailOutbox = pgTable("email_outbox", {
  id: serial("id").primaryKey(),
  toEmail: varchar("to_email", { length: 200 }).notNull(),
  toName: varchar("to_name", { length: 200 }),
  subject: varchar("subject", { length: 300 }).notNull(),
  body: text("body"),
  attachmentName: varchar("attachment_name", { length: 300 }),
  recordType: varchar("record_type", { length: 40 }),
  recordId: integer("record_id"),
  status: varchar("status", { length: 20 }).default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const missionAssignments = pgTable("mission_assignments", {
  id: serial("id").primaryKey(),
  missionId: integer("mission_id").references(() => missions.id, { onDelete: "cascade" }).notNull(),
  volunteerId: integer("volunteer_id").references(() => volunteers.id, { onDelete: "cascade" }).notNull(),
  note: text("note"),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const missionResults = pgTable("mission_results", {
  id: serial("id").primaryKey(),
  missionId: integer("mission_id").references(() => missions.id, { onDelete: "cascade" }).notNull(),
  volunteerId: integer("volunteer_id").references(() => volunteers.id, { onDelete: "set null" }),
  feedback: text("feedback"),
  outcome: varchar("outcome", { length: 20 }).default("pending"), // success | partial | failed | pending
  location: varchar("location", { length: 200 }),
  sharePublicly: boolean("share_publicly").default(false),
  submittedAt: timestamp("submitted_at").defaultNow(),
});
