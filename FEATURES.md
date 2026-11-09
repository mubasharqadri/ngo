# Shauoor Welfare Society — Complete Feature Documentation

> **45 database tables · 71 performance indexes · 67 API routes · 60 pages · 171 source files**
>
> Built with Next.js 16 (App Router) + PostgreSQL + Drizzle ORM + Tailwind CSS

---

## Table of Contents

- [1. Public Website](#1-public-website)
- [2. Donor Portal](#2-donor-portal)
- [3. Volunteer / Helper Portal](#3-volunteer--helper-portal)
- [4. ERP Dashboard](#4-erp-dashboard)
- [5. Donations Module](#5-donations-module)
- [6. CRM Module](#6-crm-module)
- [7. HRM Module](#7-hrm-module)
- [8. Accounting Module](#8-accounting-module)
- [9. Administration & Security](#9-administration--security)
- [10. Setup & Configuration](#10-setup--configuration)
- [11. Field Operations — Missions](#11-field-operations--missions)
- [12. Content & Media](#12-content--media)
- [13. Database Management](#13-database-management)
- [14. Print & Export](#14-print--export)
- [15. Audit & Compliance](#15-audit--compliance)
- [16. Technical Architecture](#16-technical-architecture)

---

## 1. Public Website

**URL**: `/` — accessible without login

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero banner with campaign cards, live impact stats, mission call-to-action |
| About | `/about` | Mission, vision, history — loaded from database |
| Campaigns | `/campaigns` | Active campaigns with progress bars; detail page `/campaigns/[slug]` |
| Stories & Updates | `/stories` | Daily columns, ground reports, photo & video gallery — detail page `/stories/[slug]` |
| Missions | `/missions` | Publicly shared rescue missions with outcomes; detail page `/missions/[id]` with self-join for volunteers |
| Financial Transparency | `/transparency` | Live Income & Expenditure Account and Balance Sheet from double-entry ledger with year filter |
| Contacts | `/contacts` | Contact form that saves to database |

**Campaigns available**: Maan Ghar (Mother's Home), Qurbani, Eid, Langar, Ramadan Ration, Orphan Education, Medical Relief, Clean Water Wells

---

## 2. Donor Portal

**Login**: `/donor/login` — separate cookie-based authentication

| Feature | Description |
|---------|-------------|
| Login | Email + password; credentials activated per-donor record (`portalEmail`, `passwordHash`, `portalActive`) |
| Dashboard | Total given, receipt count, lives touched, supported donees with photos |
| Impact Media | Photos & videos from the field showing how donations changed donees' lives (linked to donee records) |
| Support Schedule | Month-wise distribution of donations across donees and funds |
| Receipt History | Full receipt details with instrument references and voucher numbers |
| Sign out | Clears portal cookie |

**Demo**: `donor@demo.org` / `donor123`

---

## 3. Volunteer / Helper Portal

**Login**: `/volunteer/login` — separate cookie-based authentication

| Feature | Description |
|---------|-------------|
| Registration | `/volunteer/register` — name, email, password, phone, city, type (Student/Citizen/Professional/Philanthropist/Social Worker), skills |
| Mission Dashboard | Assigned missions with due dates, location, urgency, notes from the admin |
| Result Submission | Feedback/outcome (success/partial/failed/pending), location, photos/videos from mobile, "share on website" toggle |
| Sign out | Clears portal cookie |

**Demo**: `volunteer@demo.org` / `vol123`

---

## 4. ERP Dashboard

**URL**: `/dashboard` — protected, permission-gated

- **Stat cards**: Total collected, total disbursed, donors, donees, employees, active campaigns, open leads, voucher count
- **Monthly collection chart** (6 months)
- **Fund breakdown** (pie-bar combo)
- **Recent receipts** (with donor name, date, voucher ref)
- **Recent disbursement batches** (status badges)
- **Top 5 donors** (aggregated from receipts)
- All data fetched via `/api/dashboard` with permission check

---

## 5. Donations Module

### 5.1 Donors (`/donations/donors`)

**Full CRUD with cascading location, photo upload, registration-form print**

| Section | Fields |
|---------|--------|
| Identity | Name, Donor Type (Individual/Corporate/Zakat), Picture, CNIC, Father/Husband/Guardian, Gender, DOB, Occupation (dropdown), Religion, Blood Group |
| Membership | Membership No (auto-suggest next + duplicate check), Membership Date, Registered No, NTN, STN |
| Location | Country → Province → District → City → Area (all cascading dropdowns; areas can be created inline with user confirmation) |
| Contact | Contact Person, Phone, Mobile, Email, Address, Permanent Address |
| Support | Support Type (One-time/Monthly/Quarterly/Annual), Support Through (Cash/Bank/Cheque/Online), Introducer, Anonymous |
| Destitute | Name/Address/Contact of destitute |

**List features**: Search, CSV format download, CSV import, Excel/PDF/CSV export, A4 print (portrait/landscape toggle), Sticky horizontal scrollbar visible in first view, Per-row actions: view, edit, change history, print registration form, delete

### 5.2 Donees (`/donations/donees`)

**Full CRUD with cascading location, photo upload, registration-form print**

| Section | Fields |
|---------|--------|
| Identity | Name, Donee Type (Individual/Family/Orphan/Institution), Category (Widow/Orphan/Disabled/Student/Medical), Problem Type (dropdown: Poverty/Medical/Disability/Education/Widow Support/Orphan Care/Unemployment/Debt), Status (Active/Inactive/Graduated), CNIC, Father/Husband/Guardian, Gender, DOB, Religion, Nationality (30+ countries), Qualification (Illiterate → PhD dropdown), Occupation (30+ roles dropdown) |
| Contact | Contact Person, Phone, Email, Country→Province→District→City→Area (cascading), STN, NTN |
| Registration | Membership/Registered No (auto-suggest + duplicate check) |
| Family Survey | Home Status, Family Members, Men/Women/Boy/Girl members, Family Income, Personal Income, Work Ability |
| Case | Case History, Introducer, Introducer Phone, Registered No, Case Coordinator |
| Bank | Account Title, Account No, Bank Name |

### 5.3 Donation Receipts (`/donations/receipts`)

**Master + detail lines + month-wise auto-distribution**

| Feature | Description |
|---------|-------------|
| Master fields | Receipt No, Receipt Date, Donation Date, Donor, Restrict Use in Fund (checkbox), Instrument No/Date, Voucher Type + auto-generated voucher no, Remarks, Status (active/cancelled) |
| Detail lines | Donee (with father/guardian name), Category (Fund), Amount, From/To Date, Remarks |
| Auto distribution | From/To period auto-splits into one row per month (equal share) |
| Auto voucher | CRV (Cash Receipt) or BRV (Bank Receipt) — double-entry posted automatically (Dr Cash/Bank, Cr Donation Income) |
| Actions | View (with donor info, detail lines, distribution table), Edit, Cancel, Delete, Change history (audit), Print A4, Thermal 80mm, PDF, Email to donor (with PDF attachment logged to outbox) |
| List features | CSV format, CSV import, portrait/landscape toggle, horizontal scrollbar |

### 5.4 Disbursements (`/donations/disbursements`)

**Batch → lines workflow with auto payment voucher**

| Feature | Description |
|---------|-------------|
| Batch master | Batch No, Title, Date, Fund/Program, Voucher Type (CPV/BPV — auto-posted on payment), Notes, Status (draft → approved → paid / cancelled) |
| Batch lines | Donor Receipt reference (No + Serial + Date + Donor), Donee (changeable), Donee Category, Program (changeable), Instrument No/Date, Paid Amount, Remarks |
| Workflow | Add lines → Approve → Mark Paid (auto-posts CPV/BPV voucher: Dr Welfare Expense, Cr Cash) → Cancel |
| Staff tracking | Generated By/Date, Approved By/Date, Proceeded By/Date (workflow timestamps) |
| Actions | View, Edit, Cancel, Delete, Change history, Print A4 (landscape/portrait), Export Excel/PDF/CSV, CSV import |

---

## 6. CRM Module

### 6.1 Campaigns (`/crm/campaings`)

Name, Type (SMS/Email/WhatsApp/Event/Social), Status (Planned/Active/Completed), Start/End dates, Target/Raised amounts, Description

### 6.2 Leads (`/crm/leads`)

Name, Phone, Email, Source (Website/Referral/Event/Walk-in), Stage (New→Contacted→Qualified→Converted/Lost), Campaign link, Assigned To (user), Notes

### 6.3 Reports (`/crm/reports`)

Lead pipeline bar chart, Campaign performance table, Conversion rate, Total raised vs target

---

## 7. HRM Module

### 7.1 Employees (`/hrm/employees`)

| Section | Fields |
|---------|--------|
| Employment | Code, Full Name, Surname, Designation, Previous Designation, Department, Transferred From, Date of Joining, Probation Period (months), Time In, Time Out (per-employee office schedule), Salary, Commission/Honor, Status (Probation/Confirmed/Active/Resigned/Terminated), Resign Date, Resign Reason, Rejoin Date, Rejoin Reason, Resign/Rejoin History (structured rows: date, type, reason, probation on rejoin) |
| Personal | CNIC with **NADRA verification button** (simulated DB lookup → auto-fills name/father/DOB/gender/address), Father/Husband/Guardian, DOB, Gender, Phone, Email, Current Address, Permanent Address |
| Qualifications | Structured rows: title, year, GPA/marks, position/medals |
| Experience | Structured rows: company, period, responsibilities, achievements, commission/honorary, transport/petrol/home facilities |
| Family | Children (name/DOB/school), Siblings (name/relation/occupation), Parents (name/relation/occupation) |
| Salary History | Structured rows: date, type (increment/decrement/appraisal/other), amount, note |

### 7.2 Attendance (`/hrm/attendance`)

| Feature | Description |
|---------|-------------|
| Register | Employee name, date, status, office time (from employee record), check-in, check-out, **late indicator** (minutes vs employee's own time-in), mode (office/remote) |
| Remote approvals | Request form (employee, period, location, reason) → HR approve (auto-marks attendance for entire period, weekends skipped) |
| Time entry | Online check-in/check-out by employee or HR officer; absent/leave clears times |
| CSV import | Bulk attendance from file |

### 7.3 Leaves (`/hrm/leaves`)

Employee, Leave Type (Casual/Sick/Annual/Maternity/**Hajj/Umrah/Special**), From/To dates, Days, Status (Pending/Approved/Rejected), Reason

### 7.4 Salaries (`/hrm/salaries`)

- **Generate Monthly Payroll** (`/hrm/salaries/generate`): select month, preview all active employees, adjust amounts
- **Pakistan income tax** calculated from editable tax slabs (Finance Act 2024-25 seeded; can be modified in-place)
- **Other deductions with descriptions** per employee (loan installment, advance recovery, etc.)
- **Net salary** = Basic + Allowances − Deductions − Other − Tax (monthly, on annualized gross)
- Tax formula: annual tax = fixed + rate% × (income − slab start), divided by 12

### 7.5 Advances (`/hrm/advances`)

| Feature | Description |
|---------|-------------|
| Types | Advance for the month, Advance against salary of the month |
| Policy enforcement | Cannot exceed monthly salary; after 15th max 50% of salary; during probation limited to pro-rata attended days |
| Approval | HR / administrative authority only; approves posts double-entry voucher (Dr Staff Advances 1200, Cr Cash 1000) |
| Display | Approved By, Approved At, Voucher number with clickable dialog to view the full double-entry voucher |

### 7.6 Loans (`/hrm/loans`)

| Feature | Description |
|---------|-------------|
| Policy enforcement | Max 3 months' salary cap (management-approved), max 2 active loans (combined within cap), installments ≤ 12 months, no loans during probation |
| Fields | Employee, Amount, Installments, Start Date, Monthly Deduction (auto-calculated), Status (Active/Settled) |

### 7.7 Reports (`/hrm/reports`)

Payroll by department table with Excel/PDF export, attendance summary, leave balance, outstanding loans

---

## 8. Accounting Module

### 8.1 Chart of Accounts (`/accounting/accounts`)

Code, Name, Type (Asset/Liability/Income/Expense/Equity), Opening Balance, Active, **Control account flag + partner class** (donor/donee/vendor)

### 8.2 Double-Entry Vouchers (`/accounting/vouchers`)

| Feature | Description |
|---------|-------------|
| **Type-first wizard** | Step 1: select voucher type (CRV/CPV/BRV/BPV/JV/CV) with descriptions; Step 2: enter the entry |
| Entry editor | Account (grouped by type), Debit/Credit per line (entering one auto-clears the other), Narration |
| **Partner subledger** | Each line can link to a donor/donee/vendor (posts to their control account without creating individual GL accounts) |
| **Analytical distribution** | Split a line across multiple cost centers with percentage (100% validation) |
| Balance enforcement | Cannot post unless total debits = total credits (difference shown in real-time) |
| **A4 print** | Type label, amount in English words (PKR crore/lakh), Page X/Y, cost center + analytical % per line, commas in amounts, three signature lines |
| Cancel | Cancels voucher + excludes from all financial statements |
| **CSV import** | Bulk post multiple vouchers from CSV (grouped by voucher number) |
| Actions | View, Edit (date/narration only), Cancel, Delete, Change history, Export Excel/PDF/CSV |

### 8.3 Financial Statements (`/accounting/reports`)

All five statements with period filter, excluding cancelled vouchers:

1. **Trial Balance** — Opening Dr/Cr, Period Dr/Cr, Closing Dr/Cr (verified balanced)
2. **Income & Expenditure Account** — Income heads vs Expense heads, surplus/deficit
3. **Balance Sheet** — Assets = Liabilities + Equity + Accumulated Surplus (verified matched)
4. **Cash Flow Statement** — Operating/Investing/Financing inflows & outflows, opening→closing cash
5. **Statement of Changes in Financial Position** — Every account's opening/closing/change

### 8.4 Analytical Distribution (`/accounting/analytical`)

- Cost-center donut chart + bars (where money actually went by program)
- Expense head × program matrix table
- Period filter + Excel/PDF export

### 8.5 Partner Ledger (`/accounting/partners`)

Three tabs: **Donors** (receivable control), **Donees** (payable control), **Vendors** (payable control)

- Control account balance + subledger total + **reconciliation status** (matched ✓ / difference shown)
- Expandable per-partner transaction ledger
- Pattern: one GL control account per partner class → partner detail lives in subledger (same as Odoo/SAP/Oracle)

---

## 9. Administration & Security

### 9.1 Users (`/administration/users`)

Full Name, Email, Password (hashed with SHA-256), Role (dropdown from roles table), Active status, Last Login

### 9.2 Roles & Rights (`/administration/roles`)

- **Full permission matrix**: rows = every menu/page, columns = View / Create / Edit / Delete / Print / Import / Cancel
- **Per-module granular control** (e.g. "View receipts but no delete")
- **Wildcard patterns**: `*` (everything), `module.*` (all actions on a module), `*.print` (one action across all modules)
- Sidebar auto-hides menus the user cannot access
- API returns 403 if permission is denied

### 9.3 Audit Log (`/administration/audit`)

Every create / update / delete / import / cancel / login — with **column-level old → new values**:

- Filters: module, action, user, date range, record ID
- Expandable rows showing every changed column with old and new values
- Password fields auto-masked
- Export to Excel/PDF/CSV, A4 print

---

## 10. Setup & Configuration

| Module | Fields |
|--------|--------|
| Companies | Name, Tagline, Email, Phone, Address, City, Country, Reg No, NTN, Logo |
| Countries | Name, ISO Code, Phone Code |
| Provinces | Name (linked to country) |
| Districts | Name (linked to province) |
| Cities | Name (linked to district) |
| **Areas** | Name (linked to city) — can be created inline during donor/donee entry with user confirmation |
| Cost Centers | Name, Code, Description, Active |

**Cascading dropdowns**: Country → Province → District → City → Area

---

## 11. Field Operations — Missions (`/field/missions`)

| Feature | Description |
|---------|-------------|
| Mission types | 13 built-in (Child Rescue, Family Trace, Relief, Flood Relief, Hospital Emergency, Earthquake Relief, Blood Donation, Food Drive, Winter Clothing, Shelter Repair, Elderly Care, Skills Training, Other) + community-proposed custom types (admin confirms) |
| Location | Country → Province → District → City (cascading) + Area (text, with "other" describe field) |
| Team capacity | Max helpers limit (optional) |
| Website sharing | Toggle to publish on the public site — volunteers/philanthropists/social workers can join directly |
| Team assignment | Search + multi-select volunteers with note; "Join this mission" button on public page |
| Results | Volunteer submits feedback, outcome, location, photos/videos from mobile |
| Media | Mission activity photos & videos viewable on ERP detail and public page |

---

## 12. Content & Media

### 12.1 Posts & Columns (`/posts`)

Title, Slug (auto), Category (Column/Story/Update), Excerpt, Body, Cover Image URL, Author, Published toggle

### 12.2 Media Library (`/media`)

- **Upload photos/videos** from field (file upload → stored in `/uploads/`) or paste URL
- **Link to**: Donee (impact), Campaign, Mission, Post, Donor, General
- Preview gallery with delete and link-type badges

### 12.3 Vendors (`/vendors`)

Name, Type (Supplier/Contractor/Service), CNIC, NTN, Phone, Email, Address, City, Opening Balance (linked to Vendor Control account 2200 for subledger reconciliation)

---

## 13. Database Management

### Backup (`/database/backup`)

Live table sizes (row counts per table), SQL export button

### Upload (`/database/upload`)

9 import targets: Donors, Donees, Employees, Accounts, Cost Centers, Countries, Cities, Campaigns, Leads — each with CSV template download, file parse, preview, and bulk upload with validation

---

## 14. Print & Export

Every list page offers:

| Format | Description |
|--------|-------------|
| **Excel** (.xlsx) | Proper column widths via `xlsx` library |
| **PDF** (A4) | Header bar, table with alternating rows, page numbers, signatures via `jspdf-autotable` |
| **CSV** | UTF-8 BOM for Excel compatibility |
| **Print A4** | Portrait / Landscape toggle (auto-landscape if >6 columns); opens print dialog with @page CSS |
| **Thermal 80mm** | Courier font receipt for point-of-sale printers |

Specialized prints:
- **Donor / Donee registration form**: A4 with photo, all fields in sections, four signature lines
- **Donation receipt**: A4 with donor info, detail lines, distribution table, amount in words, restrictions
- **Voucher**: A4 with type label, amount in words (PKR crore/lakh), page numbers, cost center + analytical distribution per line
- **Disbursement batch**: A4 with batch info, line items, donor receipt references, total, three signature lines

---

## 15. Audit & Compliance

- **Every API write** (create/update/delete/import/cancel) logs to `audit_logs`
- **Column-level change tracking**: old value → new value for every changed field
- **Login tracking**: every ERP, donor portal, and volunteer portal login recorded
- **Sensitive field masking**: passwords and hashes auto-masked in audit entries
- **Financial compliance**: cancelled vouchers excluded from all five financial statements
- **Advance/loan policies**: auto-enforced (probation limits, salary caps, installment limits) with clear rejection messages

---

## 16. Technical Architecture

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript |
| Data fetching | TanStack React Query (stale time, optimistic updates) |
| Backend | Next.js API routes (App Router) |
| Database | PostgreSQL via Drizzle ORM |
| Auth | JWT (jose) + httpOnly cookies |
| Print | Custom CSS @page (A4/thermal) + jsPDF |
| Export | xlsx (Excel), jspdf-autotable (PDF), native CSV |

### Key files
| File | Description |
|------|-------------|
| `src/db/schema.ts` | 45 tables with FK constraints and defaults |
| `src/db/seed.ts` | Comprehensive demo data (850+ lines) |
| `src/lib/crud.ts` | Generic CRUD factory with permission enforcement, audit logging, bulk import, column filters |
| `src/lib/permissions.ts` | `module.action` permission model with wildcards |
| `src/lib/access.ts` | Server-side `requireAccess(module, action)` enforcement |
| `src/lib/audit.ts` | `logAudit()` + `diffRows()` + `snapshotChanges()` helpers |
| `src/lib/exports.ts` | `amountInWords()`, `printVoucherA4()`, `printPersonForm()`, `exportPDF()`, `exportExcel()`, `downloadCSV()`, `printA4()`, `printThermal()` |
| `src/lib/posting.ts` | `createVoucher()` (double-entry with balance check), `splitByMonth()` |
| `src/lib/portalAuth.ts` | Donor + volunteer portal authentication (separate cookies) |
| `src/lib/financials.ts` | `computeFinancials()` — all five statements from double-entry ledger |
| `src/lib/options.ts` | All dropdown options: genders, religions, occupations, nationalities, qualifications, voucher types, mission types, etc. |
| `src/components/CrudPage.tsx` | Full-featured CRUD page: cascading dropdowns, photo upload, area selector, NADRA verify, jsonList editor, membership suggest + duplicate check, validation, CSV template, CSV import, portrait/landscape toggle, ListScroll |
| `src/components/ExportButtons.tsx` | Excel/PDF/CSV/Print A4/Thermal toolbar |
| `src/components/ImportModal.tsx` | CSV template download → file parse → preview → bulk upload |
| `src/components/VoucherViewDialog.tsx` | Modal showing full double-entry voucher (used from advance/loan pages) |
| `src/components/CnicNadraInput.tsx` | CNIC input with NADRA verify button + auto-fill |
| `src/components/AreaSelect.tsx` | Area dropdown (filtered by city) with inline "add new" flow |
| `middleware.ts` | Route protection: public pages, ERP auth redirect, portal pass-throughs |

### Database indexes
71 explicit indexes on all FK columns and frequently queried columns for optimal JOIN and filter performance.
