"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, LifeBuoy, Share2, EyeOff, UserCheck, Eye, MapPin, Check, X, Users } from "lucide-react";
import { PageHeader, Badge, Card, Modal, Field, EmptyState, LoadingTable, ConfirmDialog } from "@/components/ui/Breadcrumbs";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { MISSION_TYPES, VOLUNTEER_TYPES } from "@/lib/options";

const urgencyTone: Record<string, "rose" | "amber" | "emerald"> = { high: "rose", medium: "amber", low: "emerald" };

/* cascading select */
function CascadeSelect({ api, parentField, parentValue, value, onChange, placeholder, disabled }: {
  api: string; parentField?: string; parentValue?: string; value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean;
}) {
  const { data } = useQuery({
    queryKey: ["m-cascade", api, parentField, parentValue],
    enabled: !parentField || !!parentValue,
    staleTime: 60_000,
    queryFn: async () => {
      const q = parentField && parentValue ? `?${parentField}=${parentValue}&limit=500` : "?limit=500";
      return (await (await fetch(`${api}${q}`, { credentials: "include" })).json()).data as { id: number; name: string }[];
    },
  });
  return (
    <select className="input" value={value} disabled={disabled || !!(parentField && !parentValue)} onChange={(e) => onChange(e.target.value)}>
      <option value="">{parentField && !parentValue ? "Select parent first" : placeholder}</option>
      {(data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

function MissionsInner() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const allowCreate = can("missions", "create");
  const allowEdit = can("missions", "edit");
  const allowDelete = can("missions", "delete");

  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", missionType: "child-rescue", otherTypeLabel: "", description: "", urgency: "medium", dueDate: "",
    countryId: "", provinceId: "", districtId: "", cityId: "", area: "", maxHelpers: "", shareOnWebsite: false, thumbnail: "",
  });
  const [selectedVols, setSelectedVols] = useState<number[]>([]);
  const [assignNote, setAssignNote] = useState("");

  const { data: missions, isLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => (await (await fetch("/api/missions", { credentials: "include" })).json()).data,
  });
  const { data: volunteers } = useQuery({
    queryKey: ["volunteers-list"],
    queryFn: async () => (await (await fetch("/api/portal/volunteers?limit=500", { credentials: "include" })).json()).data,
  });
  const { data: typesData } = useQuery({
    queryKey: ["mission-types", typesOpen],
    queryFn: async () => (await (await fetch(`/api/missions/types?includePending=1`, { credentials: "include" })).json()).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["missions"] });
    qc.invalidateQueries({ queryKey: ["mission-types"] });
  };

  const createMut = useMutation({
    mutationFn: async () => {
      // if 'other' with a new label → propose the custom type first
      let missionType = form.missionType;
      let otherTypeLabel = form.otherTypeLabel || null;
      if (form.missionType === "other" && form.otherTypeLabel?.trim()) {
        await fetch("/api/missions/types", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ label: form.otherTypeLabel.trim() }) });
      }
      const res = await fetch("/api/missions", {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          ...form, missionType, otherTypeLabel,
          countryId: form.countryId || null, provinceId: form.provinceId || null, districtId: form.districtId || null, cityId: form.cityId || null,
          area: form.area || null, maxHelpers: form.maxHelpers ? Number(form.maxHelpers) : null, thumbnail: form.thumbnail || null,
          dueDate: form.dueDate || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
    },
    onSuccess: () => {
      invalidate(); setCreating(false);
      setForm({ title: "", missionType: "child-rescue", otherTypeLabel: "", description: "", urgency: "medium", dueDate: "", countryId: "", provinceId: "", districtId: "", cityId: "", area: "", maxHelpers: "", shareOnWebsite: false, thumbnail: "" });
      toast.push({ title: "Mission created", desc: form.missionType === "other" ? "Your custom mission type was proposed — admin confirmation pending." : undefined });
    },
    onError: (e: Error) => toast.push({ title: "Create failed", desc: e.message, tone: "error" }),
  });

  const assignMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/missions/${assigning.id}`, { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ volunteerIds: selectedVols, note: assignNote }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
    },
    onSuccess: () => { invalidate(); setAssigning(null); setSelectedVols([]); setAssignNote(""); toast.push({ title: "Volunteers assigned", desc: "They will see the mission in their portal." }); },
    onError: (e: Error) => toast.push({ title: "Assign failed", desc: e.message, tone: "error" }),
  });

  const shareMut = useMutation({
    mutationFn: async (m: any) => {
      const res = await fetch(`/api/missions?id=${m.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ shareOnWebsite: !m.shareOnWebsite }) });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); toast.push({ title: "Sharing updated", tone: "info" }); },
  });

  const typeMut = useMutation({
    mutationFn: async ({ id, approved }: { id: number; approved: boolean }) => {
      const res = await fetch(`/api/missions/types?id=${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ approved }) });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); toast.push({ title: "Mission type updated" }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (m: any) => {
      const res = await fetch(`/api/missions?id=${m.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setDeleting(null); toast.push({ title: "Mission deleted", tone: "info" }); },
  });

  const { data: detail } = useQuery({
    queryKey: ["mission-detail", viewing?.id],
    enabled: !!viewing,
    queryFn: async () => (await (await fetch(`/api/missions/${viewing.id}`, { credentials: "include" })).json()).data,
  });

  const typeLabel = (m: any) => {
    if (m.missionType === "other") return m.otherTypeLabel ? `Other — ${m.otherTypeLabel}` : "Other";
    return MISSION_TYPES.find((t) => t.value === m.missionType)?.label ?? (typesData?.custom ?? []).find((c: any) => c.label === m.missionType)?.label ?? m.missionType;
  };

  const pendingTypes = (typesData?.custom ?? []).filter((c: any) => !c.approved);
  const approvedCustom = (typesData?.custom ?? []).filter((c: any) => c.approved);

  return (
    <div>
      <PageHeader
        title="Missions — Rescue & Relief Tasks"
        subtitle="Create tasks (lost child, flood relief, hospital emergency…), assign the volunteer team, publish outcomes"
        actions={
          <div className="flex gap-2 flex-wrap justify-end">
            <button className="btn btn-ghost" onClick={() => setTypesOpen(true)}>Mission types {pendingTypes.length > 0 && <Badge tone="amber">{pendingTypes.length} pending</Badge>}</button>
            {allowCreate && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> New Mission</button>}
          </div>
        }
      />

      {isLoading && <LoadingTable rows={5} cols={6} />}

      {missions && (
        <Card className="p-0 overflow-hidden">
          <div style={{ maxHeight: "calc(100vh - 260px)", overflow: "auto" }}>
            <table className="table">
              <thead><tr><th>Mission</th><th>Type</th><th>Location</th><th>Urgency</th><th>Team</th><th>Website</th><th className="w-36 text-right">Actions</th></tr></thead>
              <tbody>
                {missions.length === 0 && <tr><td colSpan={7} className="py-8"><EmptyState title="No missions yet" icon={<LifeBuoy className="w-10 h-10 mx-auto" />} /></td></tr>}
                {missions.map((m: any) => (
                  <tr key={m.id}>
                    <td>
                      <div className="font-semibold">{m.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{String(m.createdAt).slice(0, 10)}{m.maxHelpers ? ` · max ${m.maxHelpers} helpers` : ""}</div>
                    </td>
                    <td><Badge tone="sky">{typeLabel(m)}</Badge></td>
                    <td className="text-xs text-gray-500">{m.area ?? m.location ?? "—"}</td>
                    <td><Badge tone={urgencyTone[m.urgency] ?? "slate"}>{m.urgency}</Badge></td>
                    <td className="text-sm"><span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-gray-400" />{m.assignedCount} joined</span></td>
                    <td>
                      <button disabled={!allowEdit} onClick={() => shareMut.mutate(m)} className={m.shareOnWebsite ? "inline-flex items-center gap-1 text-xs font-semibold text-emerald-700" : "inline-flex items-center gap-1 text-xs font-semibold text-gray-400"}>
                        {m.shareOnWebsite ? <><Share2 className="w-3.5 h-3.5" /> Shared</> : <><EyeOff className="w-3.5 h-3.5" /> Hidden</>}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-1 justify-end">
                        <button className="p-1.5 rounded hover:bg-sky-50 text-gray-400 hover:text-sky-600" title="View details" onClick={() => setViewing(m)}><Eye className="w-3.5 h-3.5" /></button>
                        {allowEdit && <button className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600" title="Assign team" onClick={() => { setAssigning(m); setSelectedVols([]); setAssignNote(""); }}><UserCheck className="w-3.5 h-3.5" /></button>}
                        {allowDelete && <button className="p-1.5 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600" title="Delete" onClick={() => setDeleting(m)}><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create mission */}
      <Modal open={creating} onClose={() => setCreating(false)} title="New Mission" size="xl"
        footer={<><button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
          <button className="btn btn-primary" disabled={createMut.isPending || !form.title || (form.missionType === "other" && !form.otherTypeLabel)} onClick={() => createMut.mutate()}>{createMut.isPending ? "Saving..." : "Create mission"}</button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Title" required><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lost child found at Data Darbar — trace family" /></Field></div>
          <Field label="Mission type" required>
            <select className="input" value={form.missionType} onChange={(e) => setForm({ ...form, missionType: e.target.value })}>
              {MISSION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              {approvedCustom.map((c: any) => <option key={c.id} value={c.label}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Urgency">
            <select className="input" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </Field>
          {form.missionType === "other" && (
            <div className="sm:col-span-2">
              <Field label="Describe this mission type (will be added to mission types after admin confirmation)" required>
                <input className="input" value={form.otherTypeLabel} onChange={(e) => setForm({ ...form, otherTypeLabel: e.target.value })} placeholder="e.g. School rebuilding drive" />
              </Field>
            </div>
          )}
          {/* location cascade */}
          <Field label="Country"><CascadeSelect api="/api/setup/countries" value={form.countryId} onChange={(v) => setForm({ ...form, countryId: v, provinceId: "", districtId: "", cityId: "" })} placeholder="— country —" /></Field>
          <Field label="Province"><CascadeSelect api="/api/setup/provinces" parentField="countryId" parentValue={form.countryId} value={form.provinceId} onChange={(v) => setForm({ ...form, provinceId: v, districtId: "", cityId: "" })} placeholder="— province —" /></Field>
          <Field label="District"><CascadeSelect api="/api/setup/districts" parentField="provinceId" parentValue={form.provinceId} value={form.districtId} onChange={(v) => setForm({ ...form, districtId: v, cityId: "" })} placeholder="— district —" /></Field>
          <Field label="City"><CascadeSelect api="/api/setup/cities" parentField="provinceId" parentValue={form.provinceId} value={form.cityId} onChange={(v) => setForm({ ...form, cityId: v })} placeholder="— city —" /></Field>
          <Field label="Area (street / locality / landmark)"><input className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. near Data Darbar gate 3" /></Field>
          <Field label="Max helpers (team capacity)"><input type="number" className="input" value={form.maxHelpers} onChange={(e) => setForm({ ...form, maxHelpers: e.target.value })} placeholder="e.g. 10 (blank = unlimited)" /></Field>
          <Field label="Due date"><input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <Field label="Thumbnail image URL"><input className="input" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://…" /></Field>
          <div className="sm:col-span-2"><Field label="Description"><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
            <input type="checkbox" className="accent-emerald-600" checked={form.shareOnWebsite} onChange={(e) => setForm({ ...form, shareOnWebsite: e.target.checked })} />
            <span className="text-sm">Publish on the public website — volunteers / philanthropists / social workers can join directly</span>
          </label>
        </div>
      </Modal>

      {/* Mission types manager */}
      <Modal open={typesOpen} onClose={() => setTypesOpen(false)} title="Mission types — community proposals" size="lg"
        footer={<button className="btn btn-ghost" onClick={() => setTypesOpen(false)}>Close</button>}>
        <div className="space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Pending confirmation ({pendingTypes.length})</div>
            {pendingTypes.length === 0 && <div className="text-sm text-gray-400">No pending proposals.</div>}
            {pendingTypes.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between border border-amber-200 bg-amber-50 rounded-xl px-4 py-2.5 mb-2">
                <div>
                  <div className="font-semibold text-sm">{c.label}</div>
                  <div className="text-xs text-gray-500">proposed by {c.proposedBy}</div>
                </div>
                <div className="flex gap-1">
                  {allowEdit && <button className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700" title="Approve & add to types" onClick={() => typeMut.mutate({ id: c.id, approved: true })}><Check className="w-4 h-4" /></button>}
                  {allowEdit && <button className="p-1.5 rounded hover:bg-rose-100 text-rose-600" title="Reject" onClick={() => typeMut.mutate({ id: c.id, approved: false })}><X className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Approved custom types</div>
            <div className="flex flex-wrap gap-2">
              {approvedCustom.length === 0 && <div className="text-sm text-gray-400">None yet.</div>}
              {approvedCustom.map((c: any) => <Badge key={c.id} tone="emerald">{c.label}</Badge>)}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Built-in types</div>
            <div className="flex flex-wrap gap-2">{MISSION_TYPES.map((t) => <Badge key={t.value} tone="sky">{t.label}</Badge>)}</div>
          </div>
        </div>
      </Modal>

      {/* Assign team */}
      <Modal open={!!assigning} onClose={() => setAssigning(null)} title={`Assign team — ${assigning?.title ?? ""}`} size="lg"
        footer={<><button className="btn btn-ghost" onClick={() => setAssigning(null)}>Cancel</button>
          <button className="btn btn-primary" disabled={assignMut.isPending || !selectedVols.length} onClick={() => assignMut.mutate()}>{assignMut.isPending ? "Assigning..." : `Assign ${selectedVols.length} member(s)`}</button></>}>
        <p className="text-xs text-gray-500 mb-3">Registered volunteers, philanthropists & social workers. Others can also self-join from the website if the mission is published.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto mb-4">
          {(volunteers ?? []).map((v: any) => (
            <label key={v.id} className="flex items-center gap-3 border border-gray-200 rounded-xl p-3 cursor-pointer hover:border-emerald-300 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/50 transition">
              <input type="checkbox" className="accent-emerald-600" checked={selectedVols.includes(v.id)} onChange={(e) => setSelectedVols((arr) => (e.target.checked ? [...arr, v.id] : arr.filter((x) => x !== v.id)))} />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{v.name}</div>
                <div className="text-xs text-gray-500">{VOLUNTEER_TYPES.find((t) => t.value === v.volunteerType)?.label ?? v.volunteerType} · {v.city ?? "—"}</div>
              </div>
            </label>
          ))}
          {(volunteers ?? []).length === 0 && <div className="col-span-full text-sm text-gray-500 text-center py-6">No registered helpers yet.</div>}
        </div>
        <Field label="Note to team"><textarea className="input" rows={2} value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="Instructions, meeting point, contacts…" /></Field>
      </Modal>

      {/* View detail */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Mission #${viewing?.id ?? ""} — ${viewing?.title ?? ""}`} size="xl"
        footer={<button className="btn btn-ghost" onClick={() => setViewing(null)}>Close</button>}>
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone="sky">{typeLabel(detail)}</Badge>
              <Badge tone={urgencyTone[detail.urgency] ?? "slate"}>{detail.urgency}</Badge>
              <Badge tone={detail.shareOnWebsite ? "emerald" : "slate"}>{detail.shareOnWebsite ? "Shared on website" : "Hidden"}</Badge>
              {detail.maxHelpers && <Badge tone="violet">max {detail.maxHelpers} helpers</Badge>}
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-600" /> {[detail.area, detail.cityId ? `City #${detail.cityId}` : null, detail.location].filter(Boolean).join(" · ") || "No location set"}</div>
            {detail.description && <p className="text-sm text-gray-600">{detail.description}</p>}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Team ({detail.assignments.length}{detail.maxHelpers ? ` / ${detail.maxHelpers}` : ""})</div>
              {detail.assignments.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#172554] text-white text-xs font-bold flex items-center justify-center">{(a.volunteerName ?? "?").charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{a.volunteerName}</div>
                    <div className="text-xs text-gray-500">{a.volunteerType} · {a.volunteerPhone ?? "—"}</div>
                  </div>
                  {a.note && <div className="text-xs text-gray-500 max-w-40 truncate" title={a.note}>📌 {a.note}</div>}
                </div>
              ))}
              {detail.assignments.length === 0 && <div className="text-sm text-gray-400">No team members yet.</div>}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Field results ({detail.results.length})</div>
              {detail.results.map((r: any) => (
                <div key={r.id} className="border border-gray-100 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{r.volunteerName ?? "Volunteer"}</span>
                    <div className="flex items-center gap-2">
                      <Badge tone={r.outcome === "success" ? "emerald" : r.outcome === "failed" ? "rose" : r.outcome === "partial" ? "amber" : "slate"}>{r.outcome}</Badge>
                      <span className="text-[10px] text-gray-400">{r.sharePublicly ? "public" : "private"}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{r.feedback}</p>
                </div>
              ))}
              {detail.results.length === 0 && <div className="text-sm text-gray-400">No results submitted yet.</div>}
            </div>
            {detail.media.length > 0 && (
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Activity media ({detail.media.length})</div>
                <div className="grid grid-cols-3 gap-2">
                  {detail.media.map((m: any) => (
                    m.mediaType === "video"
                      ? <video key={m.id} src={m.url} controls className="w-full aspect-video object-cover rounded-lg" />
                      : <img key={m.id} src={m.url} alt="" className="w-full aspect-video object-cover rounded-lg" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting)}
        title="Delete mission?" message={`"${deleting?.title}" and its team/results will be removed.`} confirmText="Delete" danger loading={deleteMut.isPending} />
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="missions">
      <MissionsInner />
    </RequireAccess>
  );
}
