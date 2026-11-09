# Shauoor Welfare Society — NGO Management System

> Full-stack NGO management platform: donor/donee management, double-entry accounting, HRM, CRM, field operations, and a public website — with financial transparency published live.

**Stack**: Next.js 16 (App Router) · React 19 · PostgreSQL · Drizzle ORM · Tailwind CSS · TypeScript

**Scale**: 45 database tables · 71 indexes · 67 API routes · 60 pages · 171 source files

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14 running locally (or any accessible instance)

### 1. Clone and install

```bash
git clone <repository-url> shauoor-welfare
cd shauoor-welfare
npm install
```

### 2. Create the database

```bash
createdb app_db   # or create via pgAdmin / psql
```

### 3. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
SESSION_SECRET=change-this-to-any-random-string
```

> Replace `postgres:postgres` with your actual PostgreSQL credentials, and `5432` with your port.

### 4. Create database tables and indexes

```bash
npx drizzle-kit push
```

Then apply the indexes (they are in a SQL script or will be applied on first seed):

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d app_db -f src/db/indexes.sql
```

### 5. Seed demo data

```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" \
SESSION_SECRET="your-secret" \
npx tsx src/db/seed.ts
```

This populates:
- 10 donors, 12 donees, 40+ donation receipts with detail lines and monthly distributions
- 5 disbursement batches with full workflow data
- 10 employees with qualifications, experience, salary history
- 100+ attendance records, leaves, salaries, advances, loans
- 15 double-entry vouchers with partner links and analytical distributions
- 5 campaigns, 18 leads, 3 rescue missions with volunteer assignments and results
- 5 daily posts/stories, 14 media items, 55 area localities
- 7 Pakistan income-tax slabs, 5 NADRA identity records, 4 HR policies
- 30 audit log entries, role-based permissions (5 roles)
- Public campaigns (Maan Ghar, Qurbani, Eid, Langar, etc.)

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Production build

```bash
npm run build
npm run start
```

---

## Login Credentials (Demo)

### ERP Staff Portal

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@shauoor.org | admin123 | Administrator | Full access to all modules and settings |
| fatima@shauoor.org | user123 | Finance Manager | Accounting, donations, setup, reports |
| bilal@shauoor.org | user123 | HR Officer | HRM module, attendance, salaries, leaves |
| ayesha@shauoor.org | user123 | Fundraiser | CRM, donors, receipts (view/create/print) |
| hassan@shauoor.org | user123 | Viewer | View-only + print across all modules |

### Donor Portal

| Email | Password |
|-------|----------|
| donor@demo.org | donor123 |
| saima@demo.org | donor123 |

### Volunteer / Helper Portal

| Email | Password |
|-------|----------|
| volunteer@demo.org | vol123 |

---

## URL Map

### Public Website (no login)

| URL | Page |
|-----|------|
| `/` | Home — campaigns, stats, mission CTA |
| `/about` | About — mission, vision, history |
| `/campaigns` | Active campaigns with progress bars |
| `/campaigns/[slug]` | Campaign detail with media |
| `/stories` | Daily columns, updates, photo & video gallery |
| `/stories/[slug]` | Story detail |
| `/missions` | Public rescue missions + outcomes |
| `/missions/[id]` | Mission detail + self-join for helpers |
| `/transparency` | Live financial statements (I&E, Balance Sheet) |
| `/contacts` | Contact form |

### Donor Portal

| URL | Page |
|-----|------|
| `/donor/login` | Donor login |
| `/donor` | Dashboard — giving history, donees supported, impact media, support schedule |

### Volunteer Portal

| URL | Page |
|-----|------|
| `/volunteer/login` | Volunteer login |
| `/volunteer/register` | Self-registration (student, citizen, professional, philanthropist, social worker) |
| `/volunteer` | Assigned missions, submit results with photos/videos |

### ERP Portal (staff login required)

| URL | Module |
|-----|--------|
| `/dashboard` | Executive dashboard — stats, charts, recent activity |
| `/analytics` | Deep insights — charts, top donors, fund distribution |
| `/donations/donors` | Donor master — cascading location, photo, NADRA, print registration form |
| `/donations/donees` | Donee master — cascading location, family survey, case history, bank |
| `/donations/receipts` | Receipt master + detail lines + month-wise distribution |
| `/donations/receipts/new` | Create receipt (donee + fund + period + auto voucher) |
| `/donations/receipts/[id]` | Receipt detail — email to donor, A4/thermal/PDF print |
| `/donations/disbursements` | Batch list — CSV import, landscape/portrait print |
| `/donations/disbursements/new` | Create batch with voucher type |
| `/donations/disbursements/batches/[id]` | Batch detail — add lines, approve, pay (auto voucher) |
| `/crm/campaings` | CRM campaigns |
| `/crm/leads` | Prospective donor leads |
| `/crm/reports` | CRM pipeline and conversion analytics |
| `/hrm/employees` | Employee master — CNIC verify, office timings, full HR record |
| `/hrm/attendance` | Attendance register — late detection, remote approvals |
| `/hrm/leaves` | Leave applications (incl. Hajj, Umrah, Special) |
| `/hrm/salaries` | Salary records |
| `/hrm/salaries/generate` | Monthly payroll generator — Pakistan income tax + custom deductions |
| `/hrm/advances` | Advance requests — policy enforcement, approval workflow |
| `/hrm/loans` | Loans — policy enforcement (probation, caps, installments) |
| `/hrm/reports` | HRM analytics — payroll by department |
| `/accounting/accounts` | Chart of accounts with control account flags |
| `/accounting/vouchers` | Voucher register — type-first entry, cancel, import |
| `/accounting/vouchers/new` | New voucher — 2-step wizard, partner links, analytical split |
| `/accounting/vouchers/[id]` | Voucher detail — A4 print with totals, words, page numbers |
| `/accounting/reports` | Financial statements — Trial Balance, I&E, Balance Sheet, Cash Flow, Changes in FP |
| `/accounting/analytical` | Analytical distribution — cost center donut chart + matrix |
| `/accounting/partners` | Partner ledger — control account reconciliation (Odoo/SAP pattern) |
| `/administration/users` | User management |
| `/administration/roles` | Roles & Rights — full permission matrix |
| `/administration/audit` | Audit log — column-level change history |
| `/setup/companies|countries|provinces|districts|cities|cost-centers` | Geographic & organizational master data |
| `/vendors` | Vendor master (subledger linked to GL control account) |
| `/field/missions` | Rescue/relief missions — team assignment, custom types, location cascade |
| `/posts` | Daily columns and stories |
| `/media` | Media library — photo/video upload + linking |
| `/reports` | Reports hub |
| `/database/backup` | Database table statistics + export |
| `/database/upload` | Bulk CSV import for 9 modules |

---

## Key Features

### Double-Entry Accounting

Every voucher is balanced (total debits = total credits). Six voucher types:

| Type | Code | Description |
|------|------|-------------|
| Cash Receipt Voucher | CRV | Cash received — Dr Cash, Cr Income |
| Cash Payment Voucher | CPV | Cash paid — Dr Expense, Cr Cash |
| Bank Receipt Voucher | BRV | Bank received — Dr Bank, Cr Income |
| Bank Payment Voucher | BPV | Bank paid — Dr Expense, Cr Bank |
| Journal Voucher | JV | Any debit/credit combination |
| Contra Voucher | CV | Cash ↔ Bank transfers |

**Entry flow**: Select type first → enter the entry (grouped accounts with debit/credit) → balance check in real-time → post.

### Partner Accounts (Subledger)

Donors, donees, and vendors do NOT have individual GL accounts. Instead:
- One **control account** per partner class sits in the chart of accounts
- Partner-level detail is tracked in the **subledger** (voucher lines with partner links)
- Reconciliation at `/accounting/partners` verifies control balance = subledger total

This keeps the chart of accounts lean (12 heads vs hundreds) — the same pattern used by Odoo, Oracle Financials, and SAP.

### Analytical Distribution

Voucher expense lines can be **split across cost centers with percentage** (e.g., 60% Ration Program + 40% Education). The analytical distribution report shows a cost-center donut chart and an expense head × program matrix.

### Donor Portal & Impact Media

Donors log in to see their complete giving history, which donees they support, and **photos/videos from the field** showing how their donations changed lives. Monthly support schedules are shown month-by-month.

### Rescue Missions

When a lost child is found or a disaster hits:
1. Admin creates a mission with type, location (cascading dropdowns), capacity, and due date
2. Volunteers are assigned (search + multi-select) or can self-join from the website
3. Volunteers submit field results (feedback, outcome, photos/videos) from their mobile
4. Results can be shared on the public website for transparency

13 built-in mission types plus community-proposed custom types (admin confirms).

### Financial Transparency

The public website shows **live Income & Expenditure** and **Balance Sheet** generated directly from the double-entry ledger. No manual reports needed.

### Print & Export

| Format | Where |
|--------|-------|
| A4 (portrait/landscape) | Every list page, vouchers, receipts, disbursement batches |
| PDF | Every list page, receipt detail |
| Excel (.xlsx) | Every list page |
| CSV | Every list page + template download + CSV import |
| Thermal 80mm | Receipt detail, voucher detail |
| Registration form | Donor and donee print with photo |

Voucher A4 print includes: type label, amount in English words (PKR crore/lakh), Page X/Y, cost center + analytical distribution per line, three signature lines.

---

## Permission System

Permissions use a `module.action` pattern with wildcards:

- `*` — full access to everything
- `donations.*` — all actions on all donation submodules
- `donations.receipts.view` — view only on receipts
- `*.print` — print across all modules

Five pre-configured roles: Administrator, Finance Manager, HR Officer, Fundraiser, Viewer.

Permission is enforced at:
- **Sidebar** — menus auto-hide if the user has no access
- **Page level** — `RequireAccess` component shows access-restricted screen
- **API level** — `requireAccess(module, action)` returns 403 if denied
- **Action buttons** — edit, delete, import, print buttons hide/show per permission

---

## Audit Trail

Every create, update, delete, import, cancel, and login is logged to the `audit_logs` table with:
- **User** (name + ID)
- **Module** (e.g., `donations.receipts`)
- **Record ID**
- **Action** (create/update/delete/import/cancel/login)
- **Column-level changes** (field name, old value, new value)
- **IP address**
- **Timestamp**

Passwords and sensitive fields are automatically masked in audit entries.

---

## Database Architecture

45 tables with:
- Proper serial primary keys
- Foreign key constraints (ON DELETE cascade / set null)
- NOT NULL on required columns
- Sensible DEFAULT values
- **71 explicit indexes** on all FK columns and frequently queried fields

Key table groups:
- **Geography**: countries → provinces → districts → cities → areas
- **Donations**: donors, donees, donation_receipts → receipt_lines → receipt_distributions, disbursement_batches → disbursements
- **HRM**: employees, attendance, leaves, salaries, advances, loans, remote_approvals, hr_policies, tax_slabs
- **Accounting**: accounts (with control account flags), vouchers → voucher_lines → analytical_distributions
- **CRM**: campaigns, leads
- **Field ops**: missions, mission_assignments, mission_results, volunteers, custom_mission_types
- **Content**: posts, media, public_campaigns, contact_messages
- **System**: users, roles, audit_logs, companies, cost_centers, nadra_records, email_outbox

---

## Development

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # production server
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run lint         # ESLint check
```

### Schema changes

Edit `src/db/schema.ts`, then:
```bash
npx drizzle-kit push    # apply to database
```

### Seed data

```bash
DATABASE_URL=... SESSION_SECRET=... npx tsx src/db/seed.ts
```

---

## License

Internal project for Shauoor Welfare Society. All rights reserved.
#   n g o  
 