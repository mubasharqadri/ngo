"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard, HandCoins, Users, Building2, UserCog,
  Briefcase, Receipt, Database, LineChart, Megaphone,
  FileBarChart2, Settings, ChevronRight, Heart, LogOut,
  Shield, UserCircle2, Globe2, MapPinned, Map, MapPin, ScrollText,
  CalendarCheck, CalendarOff, Wallet, CreditCard, Landmark, BookOpen,
  PieChart, Network, Truck, LifeBuoy, Newspaper, Images,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

type NavItem = { label: string; href: string; module: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", module: "dashboard", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", module: "analytics", icon: LineChart },
      { label: "Reports", href: "/reports", module: "reports", icon: FileBarChart2 },
    ],
  },
  {
    label: "Donations",
    items: [
      { label: "Donors", href: "/donations/donors", module: "donations.donors", icon: Users },
      { label: "Donees", href: "/donations/donees", module: "donations.donees", icon: Heart },
      { label: "Receipts", href: "/donations/receipts", module: "donations.receipts", icon: Receipt },
      { label: "Disbursements", href: "/donations/disbursements", module: "donations.disbursements", icon: HandCoins },
    ],
  },
  {
    label: "CRM",
    items: [
      { label: "Campaigns", href: "/crm/campaings", module: "crm.campaigns", icon: Megaphone },
      { label: "Leads", href: "/crm/leads", module: "crm.leads", icon: UserCircle2 },
      { label: "Reports", href: "/crm/reports", module: "crm.reports", icon: FileBarChart2 },
    ],
  },
  {
    label: "HRM",
    items: [
      { label: "Employees", href: "/hrm/employees", module: "hrm.employees", icon: Briefcase },
      { label: "Attendance", href: "/hrm/attendance", module: "hrm.attendance", icon: CalendarCheck },
      { label: "Leaves", href: "/hrm/leaves", module: "hrm.leaves", icon: CalendarOff },
      { label: "Salaries", href: "/hrm/salaries", module: "hrm.salaries", icon: Wallet },
      { label: "Advances", href: "/hrm/advances", module: "hrm.advances", icon: HandCoins },
      { label: "Loans", href: "/hrm/loans", module: "hrm.loans", icon: CreditCard },
      { label: "Reports", href: "/hrm/reports", module: "hrm.reports", icon: FileBarChart2 },
    ],
  },
  {
    label: "Accounting",
    items: [
      { label: "Chart of Accounts", href: "/accounting/accounts", module: "accounting.accounts", icon: Landmark },
      { label: "Vouchers", href: "/accounting/vouchers", module: "accounting.vouchers", icon: BookOpen },
      { label: "Financial Statements", href: "/accounting/reports", module: "accounting.reports", icon: FileBarChart2 },
      { label: "Analytical Distribution", href: "/accounting/analytical", module: "accounting.analytical", icon: PieChart },
      { label: "Partner Ledger", href: "/accounting/partners", module: "accounting.partners", icon: Network },
      { label: "Vendors", href: "/vendors", module: "vendors", icon: Truck },
    ],
  },
  {
    label: "Field Operations",
    items: [
      { label: "Missions (Rescue)", href: "/field/missions", module: "missions", icon: LifeBuoy },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Posts & Columns", href: "/posts", module: "posts", icon: Newspaper },
      { label: "Media Library", href: "/media", module: "media", icon: Images },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/administration/users", module: "administration.users", icon: UserCog },
      { label: "Roles & Rights", href: "/administration/roles", module: "administration.roles", icon: Shield },
      { label: "Audit Log", href: "/administration/audit", module: "administration.audit", icon: ScrollText },
    ],
  },
  {
    label: "Setup",
    items: [
      { label: "Companies", href: "/setup/companies", module: "setup.companies", icon: Building2 },
      { label: "Countries", href: "/setup/countries", module: "setup.countries", icon: Globe2 },
      { label: "Provinces", href: "/setup/provinces", module: "setup.provinces", icon: MapPinned },
      { label: "Districts", href: "/setup/districts", module: "setup.districts", icon: Map },
      { label: "Cities", href: "/setup/cities", module: "setup.cities", icon: MapPin },
      { label: "Cost Centers", href: "/setup/cost-centers", module: "setup.costcenters", icon: Settings },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Database Backup", href: "/database/backup", module: "database.backup", icon: Database },
      { label: "Database Upload", href: "/database/upload", module: "database.upload", icon: Database },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { can, loading } = usePermissions();

  const visibleGroups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((it) => loading || can(it.module, "view")),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold shadow-sm">
            S
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">Shauoor</div>
            <div className="text-[11px] text-gray-500 leading-tight">Welfare Society</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {loading && (
          <div className="space-y-2 px-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-6" />
            ))}
          </div>
        )}
        {!loading && visibleGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-3 text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition group",
                        active
                          ? "bg-emerald-50 text-emerald-800 font-medium"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Icon className={clsx("w-4 h-4 shrink-0", active ? "text-emerald-700" : "text-gray-400 group-hover:text-gray-700")} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="w-3.5 h-3.5" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-3 py-3 border-t border-gray-100">
        <Link
          href="/api/logout"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
        >
          <LogOut className="w-4 h-4 text-gray-400" />
          Sign out
        </Link>
      </div>
    </aside>
  );
}
