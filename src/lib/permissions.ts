// Shared permission model — used on both server (enforcement) and client (UI gating)

export const ACTIONS = ["view", "create", "edit", "delete", "print", "import", "cancel"] as const;
export type Action = (typeof ACTIONS)[number];

export const MODULES: { key: string; label: string; group: string }[] = [
  { key: "dashboard", label: "Dashboard", group: "Overview" },
  { key: "analytics", label: "Analytics", group: "Overview" },
  { key: "reports", label: "Reports Hub", group: "Overview" },
  { key: "donations.donors", label: "Donors", group: "Donations" },
  { key: "donations.donees", label: "Donees", group: "Donations" },
  { key: "donations.receipts", label: "Receipts", group: "Donations" },
  { key: "donations.disbursements", label: "Disbursements", group: "Donations" },
  { key: "crm.campaigns", label: "Campaigns", group: "CRM" },
  { key: "crm.leads", label: "Leads", group: "CRM" },
  { key: "crm.reports", label: "CRM Reports", group: "CRM" },
  { key: "hrm.employees", label: "Employees", group: "HRM" },
  { key: "hrm.attendance", label: "Attendance", group: "HRM" },
  { key: "hrm.leaves", label: "Leaves", group: "HRM" },
  { key: "hrm.salaries", label: "Salaries", group: "HRM" },
  { key: "hrm.advances", label: "Advances", group: "HRM" },
  { key: "hrm.loans", label: "Loans", group: "HRM" },
  { key: "hrm.reports", label: "HRM Reports", group: "HRM" },
  { key: "accounting.accounts", label: "Chart of Accounts", group: "Accounting" },
  { key: "accounting.vouchers", label: "Vouchers", group: "Accounting" },
  { key: "accounting.reports", label: "Financial Statements", group: "Accounting" },
  { key: "accounting.analytical", label: "Analytical Distribution", group: "Accounting" },
  { key: "accounting.partners", label: "Partner Ledger", group: "Accounting" },
  { key: "vendors", label: "Vendors", group: "Accounting" },
  { key: "missions", label: "Missions (Rescue Tasks)", group: "Field Operations" },
  { key: "posts", label: "Posts & Columns", group: "Content" },
  { key: "media", label: "Media Library", group: "Content" },
  { key: "administration.users", label: "Users", group: "Administration" },
  { key: "administration.roles", label: "Roles & Rights", group: "Administration" },
  { key: "administration.audit", label: "Audit Log", group: "Administration" },
  { key: "setup.companies", label: "Companies", group: "Setup" },
  { key: "setup.countries", label: "Countries", group: "Setup" },
  { key: "setup.provinces", label: "Provinces", group: "Setup" },
  { key: "setup.districts", label: "Districts", group: "Setup" },
  { key: "setup.cities", label: "Cities", group: "Setup" },
  { key: "setup.costcenters", label: "Cost Centers", group: "Setup" },
  { key: "database.backup", label: "Database Backup", group: "System" },
  { key: "database.upload", label: "Database Upload", group: "System" },
];

/**
 * Permission patterns:
 *  "*"                       → everything
 *  "module.*"                → all submodules + actions under a top module (e.g. "donations.*")
 *  "module.sub.*"            → all actions on a specific module
 *  "module.sub.action"       → specific action on a module
 *  "*.action"                → one action across all modules (e.g. "*.print")
 */
export function can(perms: string[] | null | undefined, module: string, action: string): boolean {
  if (!perms || !perms.length) return false;
  const mm = module.split(".");
  return perms.some((p) => {
    if (!p) return false;
    if (p === "*") return true;
    const pp = p.split(".");
    if (pp.length === 2) {
      const [pm, pa] = pp;
      if (pm === "*") return pa === "*" || pa === action;
      if (mm[0] === pm && (pa === "*" || pa === action)) return true;
      return false;
    }
    if (pp.length === 3) {
      const [a, b, c] = pp;
      if (a === "*" && b === "*") return c === "*" || c === action;
      if (module === `${a}.${b}` && (c === "*" || c === action)) return true;
      return false;
    }
    return false;
  });
}

/** Does the user get to see this menu item / open this page at all? */
export function menuCan(perms: string[] | null | undefined, module: string): boolean {
  return can(perms, module, "view");
}

export function describePerm(p: string): string {
  if (p === "*") return "Full Access";
  return p;
}
