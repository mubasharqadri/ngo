"use client";

import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, ScrollText, UserCircle2 } from "lucide-react";
import { PageHeader, Card, Badge, LoadingTable, EmptyState } from "@/components/ui/Breadcrumbs";
import { ExportButtons } from "@/components/ExportButtons";
import { RequireAccess } from "@/components/RequireAccess";
import { MODULES, ACTIONS } from "@/lib/permissions";
import { clsx } from "clsx";

type AuditEntry = {
  id: number;
  userName: string | null;
  module: string;
  recordId: number | null;
  action: string;
  changes: { field: string; oldValue: unknown; newValue: unknown }[] | null;
  createdAt: string;
};

const actionTone: Record<string, "emerald" | "amber" | "rose" | "sky" | "slate" | "violet"> = {
  create: "emerald", import: "sky", update: "amber", delete: "rose", cancel: "rose", login: "violet",
};

function AuditInner() {
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-report", module, action, user, from, to],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (module) p.set("module", module);
      if (action) p.set("action", action);
      if (user) p.set("user", user);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const res = await fetch(`/api/administration/audit?${p}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const j = await res.json();
      return { rows: j.data as AuditEntry[], total: j.meta?.total as number };
    },
  });

  const rows = data?.rows ?? [];

  const exportRows = rows.map((r) => ({
    time: String(r.createdAt).slice(0, 16).replace("T", " "),
    user: r.userName ?? "System",
    module: r.module,
    record: r.recordId ?? "",
    action: r.action,
    changes: (r.changes ?? []).map((c) => `${c.field}: ${c.oldValue ?? "—"} → ${c.newValue ?? "—"}`).join(" | "),
  }));

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Every create, edit, delete, import, cancel and login — with column-level change detail"
      />

      {/* Filters */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1 block">Module / Page</span>
            <select className="input" value={module} onChange={(e) => setModule(e.target.value)}>
              <option value="">All modules</option>
              <option value="auth">Login (auth)</option>
              {MODULES.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1 block">Action</span>
            <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              {[...ACTIONS, "login"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1 block">User</span>
            <input className="input" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Filter by name..." />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1 block">From</span>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 mb-1 block">To</span>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-sm text-gray-500">
          {data ? <><b className="text-gray-800">{data.total}</b> log entries</> : "Loading..."}
        </div>
        <ExportButtons
          filename="audit-log"
          title="Audit Log Report"
          subtitle={module ? `Module: ${module}` : "All modules"}
          columns={[
            { key: "time", label: "Time" },
            { key: "user", label: "User" },
            { key: "module", label: "Module" },
            { key: "record", label: "Record #" },
            { key: "action", label: "Action" },
            { key: "changes", label: "Column Changes" },
          ]}
          rows={exportRows}
        />
      </div>

      {isLoading && <LoadingTable rows={8} cols={5} />}

      {data && rows.length === 0 && (
        <EmptyState
          title="No audit entries match"
          description="Try changing the filters — every data change in the system is recorded here."
          icon={<ScrollText className="w-10 h-10 mx-auto" />}
        />
      )}

      {data && rows.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>Time</th>
                  <th>User</th>
                  <th>Module</th>
                  <th>Record</th>
                  <th>Action</th>
                  <th>Changed columns</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const open = expanded === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className="cursor-pointer"
                        onClick={() => setExpanded(open ? null : r.id)}
                      >
                        <td>
                          {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                        </td>
                        <td className="whitespace-nowrap text-xs font-mono">{String(r.createdAt).slice(0, 16).replace("T", " ")}</td>
                        <td>
                          <span className="flex items-center gap-1.5">
                            <UserCircle2 className="w-3.5 h-3.5 text-gray-400" />
                            {r.userName ?? "System"}
                          </span>
                        </td>
                        <td><Badge tone="slate">{r.module}</Badge></td>
                        <td className="font-mono text-xs">{r.recordId ? `#${r.recordId}` : "—"}</td>
                        <td><Badge tone={actionTone[r.action] ?? "slate"}>{r.action}</Badge></td>
                        <td className="text-xs text-gray-500">
                          {r.changes?.length ? `${r.changes.length} column${r.changes.length > 1 ? "s" : ""}: ${r.changes.slice(0, 3).map((c) => c.field).join(", ")}${r.changes.length > 3 ? "…" : ""}` : "—"}
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-gray-50/70">
                          <td colSpan={7} className="px-6 py-3">
                            {r.changes && r.changes.length > 0 ? (
                              <table className="w-full text-xs bg-white border border-gray-200 rounded overflow-hidden">
                                <thead>
                                  <tr className="text-gray-400 border-b border-gray-100">
                                    <th className="text-left px-3 py-1.5 font-medium">Column</th>
                                    <th className="text-left px-3 py-1.5 font-medium">Old value</th>
                                    <th className="text-left px-3 py-1.5 font-medium">New value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.changes.map((c, i) => (
                                    <tr key={i} className="border-b border-gray-50 last:border-0">
                                      <td className="px-3 py-1.5 font-semibold">{c.field}</td>
                                      <td className="px-3 py-1.5 text-gray-500">{c.oldValue === null || c.oldValue === undefined || c.oldValue === "" ? "—" : String(c.oldValue)}</td>
                                      <td className="px-3 py-1.5 text-emerald-700 font-medium">{c.newValue === null || c.newValue === undefined || c.newValue === "" ? "—" : String(c.newValue)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <span className="text-xs text-gray-400">No column-level detail recorded.</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="administration.audit">
      <AuditInner />
    </RequireAccess>
  );
}
