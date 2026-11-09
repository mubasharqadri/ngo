"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState, useMemo } from "react";
import { Shield, Plus, Trash2, Save, Check } from "lucide-react";
import { PageHeader, Card, Badge, Modal, Field, ConfirmDialog } from "@/components/ui/Breadcrumbs";
import { MODULES, ACTIONS, can } from "@/lib/permissions";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { clsx } from "clsx";

type Role = { id: number; name: string; permissions: string[] | null };

function RolesInner() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can: iCan } = usePermissions();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Role | null>(null);

  const { data: roles } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/administration/roles?limit=100", { credentials: "include" });
      return (await res.json()).data;
    },
  });

  const selected = roles?.find((r) => r.id === selectedId) ?? roles?.[0] ?? null;
  const perms: string[] = useMemo(() => (selected?.permissions as string[]) ?? [], [selected]);
  const isSuperAdmin = perms.includes("*");

  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const lastRoleId = selected?.id;
  // reset draft when role changes
  const [trackedRole, setTrackedRole] = useState<number | null>(null);
  if (selected && trackedRole !== selected.id) {
    setTrackedRole(selected.id);
    const d: Record<string, boolean> = {};
    for (const m of MODULES) for (const a of ACTIONS) d[`${m.key}|${a}`] = can(selected.permissions ?? [], m.key, a);
    setDraft(d);
  }
  void lastRoleId;

  const toggle = (module: string, action: string) => {
    const k = `${module}|${action}`;
    setDraft((d) => ({ ...d, [k]: !d[k] }));
  };

  const toggleModuleAll = (module: string) => {
    const allOn = ACTIONS.every((a) => draft[`${module}|${a}`]);
    setDraft((d) => {
      const nd = { ...d };
      for (const a of ACTIONS) nd[`${module}|${a}`] = !allOn;
      return nd;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const permissions: string[] = [];
      for (const m of MODULES) {
        const allOn = ACTIONS.every((a) => draft[`${m.key}|${a}`]);
        if (allOn) {
          permissions.push(`${m.key}.*`);
        } else {
          for (const a of ACTIONS) if (draft[`${m.key}|${a}`]) permissions.push(`${m.key}.${a}`);
        }
      }
      const res = await fetch(`/api/administration/roles?id=${selected!.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.push({ title: "Rights saved", desc: `Permissions for "${selected?.name}" updated.`, tone: "success" });
    },
    onError: () => toast.push({ title: "Save failed", tone: "error" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/administration/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newRoleName, permissions: [] }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setAdding(false);
      setNewRoleName("");
      toast.push({ title: "Role created", tone: "success" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (r: Role) => {
      const res = await fetch(`/api/administration/roles?id=${r.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setDeleting(null);
      toast.push({ title: "Role deleted", tone: "info" });
    },
  });

  const groups = useMemo(() => {
    const g = new Map<string, typeof MODULES>();
    for (const m of MODULES) {
      if (!g.has(m.group)) g.set(m.group, []);
      g.get(m.group)!.push(m);
    }
    return [...g.entries()];
  }, []);

  const canEdit = iCan("administration.roles", "edit");

  return (
    <div>
      <PageHeader
        title="Roles & Rights"
        subtitle="Control which menus each role can open and which actions (view, create, edit, delete, print, import, cancel) are allowed on every page"
        actions={
          canEdit ? (
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4" /> New Role
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Role list */}
        <Card className="p-3 lg:col-span-1 h-fit">
          <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold px-2 pt-1 pb-2">Roles</div>
          <div className="space-y-1">
            {roles?.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition",
                  selected?.id === r.id ? "bg-emerald-50 text-emerald-800 font-medium" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> {r.name}</span>
                {(r.permissions as string[])?.includes("*") && <Badge tone="violet">Full</Badge>}
              </button>
            ))}
          </div>
        </Card>

        {/* Matrix */}
        <Card className="lg:col-span-3 p-0 overflow-hidden">
          {selected ? (
            <>
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {selected.name}
                    {isSuperAdmin && <Badge tone="violet">Full Access (*)</Badge>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {isSuperAdmin
                      ? "This role has every right on every page. Uncheck “Full Access” in the database to use the matrix."
                      : "Tick the boxes to grant menu access and per-page action rights."}
                  </div>
                </div>
                <div className="flex gap-2">
                  {canEdit && !isSuperAdmin && (
                    <button className="btn btn-primary" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                      <Save className="w-4 h-4" /> {saveMutation.isPending ? "Saving..." : "Save rights"}
                    </button>
                  )}
                  {canEdit && selected.name !== "Administrator" && (
                    <button className="btn btn-ghost text-rose-600" onClick={() => setDeleting(selected)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="min-w-44">Menu / Page</th>
                      <th className="text-center">All</th>
                      {ACTIONS.map((a) => (
                        <th key={a} className="text-center capitalize">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(([group, mods]) => (
                      <Fragment key={group}>
                        <tr className="bg-gray-50">
                          <td colSpan={ACTIONS.length + 2} className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold py-1.5">{group}</td>
                        </tr>
                        {mods.map((m) => {
                          const allOn = ACTIONS.every((a) => (isSuperAdmin ? true : draft[`${m.key}|${a}`]));
                          return (
                            <tr key={m.key}>
                              <td className="font-medium">{m.label} <span className="text-[10px] text-gray-400 font-mono">({m.key})</span></td>
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  disabled={isSuperAdmin || !canEdit}
                                  checked={allOn}
                                  onChange={() => toggleModuleAll(m.key)}
                                  className="accent-emerald-600"
                                />
                              </td>
                              {ACTIONS.map((a) => (
                                <td key={a} className="text-center">
                                  <input
                                    type="checkbox"
                                    disabled={isSuperAdmin || !canEdit}
                                    checked={isSuperAdmin ? true : !!draft[`${m.key}|${a}`]}
                                    onChange={() => toggle(m.key, a)}
                                    className={clsx("accent-emerald-600", a === "delete" && "accent-rose-600")}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-sm text-gray-500">Loading roles...</div>
          )}
        </Card>
      </div>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Create role"
        size="sm"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={!newRoleName.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </>
        }
      >
        <Field label="Role name" required>
          <input className="input" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g. Branch Manager" />
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        title="Delete role?"
        message={`Users assigned to "${deleting?.name}" will lose access until reassigned.`}
        confirmText="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="administration.roles">
      <RolesInner />
    </RequireAccess>
  );
}
