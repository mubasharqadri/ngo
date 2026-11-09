"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Check, X, Clock, Edit2, FileDown, UploadCloud, CalendarRange } from "lucide-react";
import { PageHeader, Badge, Card, Modal, Field, LoadingTable, Tabs, ListScroll } from "@/components/ui/Breadcrumbs";
import { ImportModal } from "@/components/ImportModal";
import { RequireAccess } from "@/components/RequireAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/components/ui/toast";
import { downloadCSV } from "@/lib/exports";
import { Clock3 } from "lucide-react";

type AttRow = { id: number; employeeId: number; employeeName?: string; empTimeIn?: string | null; empTimeOut?: string | null; date: string; status: string; checkIn: string | null; checkOut: string | null; notes: string | null; mode: string | null };

/** minutes late vs the employee's own office time-in (null = not late / N/A) */
function lateMinutes(a: AttRow): number | null {
  if (a.status !== "present" && a.status !== "half") return null;
  if (!a.checkIn || !a.empTimeIn) return null;
  const [ih, im] = a.checkIn.split(":").map(Number);
  const [oh, om] = a.empTimeIn.split(":").map(Number);
  if ([ih, im, oh, om].some((x) => isNaN(x))) return null;
  const diff = ih * 60 + im - (oh * 60 + om);
  return diff > 0 ? diff : null;
}
type Approval = { id: number; employeeId: number; employeeName: string | null; fromDate: string; toDate: string; location: string | null; reason: string | null; status: string; approvedByName: string | null; createdAt: string };

const statusTone: Record<string, "emerald" | "rose" | "amber" | "sky"> = { present: "emerald", absent: "rose", half: "amber", leave: "sky" };

function AttendanceInner() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = usePermissions();
  const allowEdit = can("hrm.attendance", "edit");
  const allowCreate = can("hrm.attendance", "create");
  const [tab, setTab] = useState("register");
  const [timeEdit, setTimeEdit] = useState<AttRow | null>(null);
  const [reqOpen, setReqOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [reqForm, setReqForm] = useState({ employeeId: "", fromDate: "", toDate: "", location: "", reason: "" });

  const { data: attendance, isLoading } = useQuery<AttRow[]>({
    queryKey: ["attendance"],
    queryFn: async () => (await (await fetch("/api/hrm/attendance?limit=500", { credentials: "include" })).json()).data,
  });
  const { data: approvals } = useQuery<Approval[]>({
    queryKey: ["remote-approvals"],
    queryFn: async () => (await (await fetch("/api/hrm/attendance/remote-approvals", { credentials: "include" })).json()).data,
  });
  const { data: employees } = useQuery({
    queryKey: ["employees-opts-a"],
    queryFn: async () => (await (await fetch("/api/hrm/employees?limit=500", { credentials: "include" })).json()).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["attendance"] });
    qc.invalidateQueries({ queryKey: ["remote-approvals"] });
  };

  const timeMut = useMutation({
    mutationFn: async (r: AttRow) => {
      const res = await fetch(`/api/hrm/attendance?id=${r.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ checkIn: r.checkIn, checkOut: r.checkOut, status: r.status, notes: r.notes }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { invalidate(); setTimeEdit(null); toast.push({ title: "Attendance updated", desc: "Time entry saved (online)." }); },
  });

  const reqMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/hrm/attendance/remote-approvals", {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify(reqForm),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
    },
    onSuccess: () => { invalidate(); setReqOpen(false); setReqForm({ employeeId: "", fromDate: "", toDate: "", location: "", reason: "" }); toast.push({ title: "Remote duty requested" }); },
  });

  const decisionMut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/hrm/attendance/remote-approvals?id=${id}`, {
        method: "PATCH", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ status }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      return j.data;
    },
    onSuccess: (d) => { invalidate(); toast.push({ title: d.status === "approved" ? `Approved — ${d.autoMarked} day(s) auto-marked present` : "Request rejected", tone: d.status === "approved" ? "success" : "info" }); },
  });

  const downloadTemplate = () =>
    downloadCSV("attendance-import-template", ["employeeId", "date", "status", "checkIn", "checkOut", "notes", "mode"].map((k) => ({ key: k, label: k })), []);

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Daily register with remote/field duty approvals — auto attendance + online time entry by employee or HR"
        actions={
          <div className="flex gap-2 flex-wrap justify-end">
            <button className="btn btn-ghost" onClick={downloadTemplate}><FileDown className="w-4 h-4" /> CSV Format</button>
            <button className="btn btn-ghost" onClick={() => setImporting(true)}><UploadCloud className="w-4 h-4" /> Import CSV</button>
            {allowCreate && <button className="btn btn-primary" onClick={() => setReqOpen(true)}><MapPin className="w-4 h-4" /> Remote duty request</button>}
          </div>
        }
      />

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "register", label: "Attendance Register", count: attendance?.length },
        { id: "approvals", label: "Remote / Field Approvals", count: approvals?.filter((a) => a.status === "pending").length },
      ]} />

      {tab === "register" && (
        <>
          {isLoading && <LoadingTable rows={8} cols={6} />}
          {attendance && (
            <ListScroll height="calc(100vh - 300px)">
              <table className="table">
                <thead>
                  <tr><th>Employee</th><th>Date</th><th>Status</th><th>Office Time</th><th>Check In</th><th>Check Out</th><th>Late</th><th>Mode</th><th>Notes</th>{allowEdit && <th className="w-12"></th>}</tr>
                </thead>
                <tbody>
                  {attendance.map((a: any) => {
                    const late = lateMinutes(a);
                    return (
                      <tr key={a.id}>
                        <td className="font-medium">{a.employeeName ?? `#${a.employeeId}`}</td>
                        <td className="text-xs">{a.date}</td>
                        <td><Badge tone={statusTone[a.status] ?? "sky"}>{a.status}</Badge></td>
                        <td className="font-mono text-xs text-gray-500">{a.empTimeIn ?? "—"} → {a.empTimeOut ?? "—"}</td>
                        <td className="font-mono text-xs">{a.status === "absent" ? "—" : a.checkIn ?? "—"}</td>
                        <td className="font-mono text-xs">{a.status === "absent" ? "—" : a.checkOut ?? "—"}</td>
                        <td>
                          {late !== null ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600"><Clock3 className="w-3.5 h-3.5" />{late} min</span>
                          ) : a.status === "present" || a.status === "half" ? (
                            <span className="text-xs font-semibold text-emerald-600">On time</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td>{a.mode === "remote" ? <Badge tone="violet"><MapPin className="w-3 h-3 mr-1" />remote</Badge> : <span className="text-xs text-gray-400">office</span>}</td>
                        <td className="text-xs text-gray-500 max-w-44 truncate" title={a.notes ?? ""}>{a.notes ?? "—"}</td>
                        {allowEdit && (
                          <td>
                            <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-900" title="Enter/edit time online (employee or HR)" onClick={() => setTimeEdit({ ...a })}><Edit2 className="w-3.5 h-3.5" /></button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ListScroll>
          )}
        </>
      )}

      {tab === "approvals" && (
        <Card className="p-0 overflow-hidden">
          <table className="table">
            <thead>
              <tr><th>Employee</th><th>Period</th><th>Location</th><th>Reason</th><th>Status</th><th className="w-32 text-right">Decision</th></tr>
            </thead>
            <tbody>
              {(approvals ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.employeeName ?? `#${a.employeeId}`}</td>
                  <td className="text-xs"><span className="inline-flex items-center gap-1"><CalendarRange className="w-3 h-3 text-gray-400" />{a.fromDate} → {a.toDate}</span></td>
                  <td className="text-xs">{a.location ?? "—"}</td>
                  <td className="text-xs text-gray-500 max-w-48 truncate" title={a.reason ?? ""}>{a.reason ?? "—"}</td>
                  <td><Badge tone={a.status === "approved" ? "emerald" : a.status === "rejected" ? "rose" : "amber"}>{a.status}</Badge></td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      {a.status === "pending" && allowEdit && (
                        <>
                          <button className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600" title="Approve (auto-marks attendance)" onClick={() => decisionMut.mutate({ id: a.id, status: "approved" })}><Check className="w-4 h-4" /></button>
                          <button className="p-1.5 rounded hover:bg-rose-50 text-rose-600" title="Reject" onClick={() => decisionMut.mutate({ id: a.id, status: "rejected" })}><X className="w-4 h-4" /></button>
                        </>
                      )}
                      {a.status !== "pending" && <span className="text-xs text-gray-400">by {a.approvedByName ?? "—"}</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {(approvals ?? []).length === 0 && <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">No remote duty requests yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {/* Time entry modal (online) */}
      <Modal open={!!timeEdit} onClose={() => setTimeEdit(null)} title={`Time entry — ${timeEdit?.employeeName ?? ""} (${timeEdit?.date})`} size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setTimeEdit(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={timeMut.isPending || !timeEdit} onClick={() => timeEdit && timeMut.mutate(timeEdit)}>{timeMut.isPending ? "Saving..." : "Save time"}</button>
          </>
        }>
        {timeEdit && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                className="input"
                value={timeEdit.status}
                onChange={(e) => {
                  const st = e.target.value;
                  // absent → check-in/check-out are null
                  setTimeEdit(st === "absent" || st === "leave"
                    ? { ...timeEdit, status: st, checkIn: null, checkOut: null }
                    : { ...timeEdit, status: st });
                }}
              >
                <option value="present">Present</option><option value="absent">Absent</option><option value="half">Half Day</option><option value="leave">On Leave</option>
              </select>
            </Field>
            <div />
            <Field label="Check In">
              <input type="time" className="input" value={timeEdit.checkIn ?? ""} disabled={timeEdit.status === "absent" || timeEdit.status === "leave"} onChange={(e) => setTimeEdit({ ...timeEdit, checkIn: e.target.value || null })} />
            </Field>
            <Field label="Check Out">
              <input type="time" className="input" value={timeEdit.checkOut ?? ""} disabled={timeEdit.status === "absent" || timeEdit.status === "leave"} onChange={(e) => setTimeEdit({ ...timeEdit, checkOut: e.target.value || null })} />
            </Field>
            <div className="col-span-2"><Field label="Notes"><textarea className="input" rows={2} value={timeEdit.notes ?? ""} onChange={(e) => setTimeEdit({ ...timeEdit, notes: e.target.value || null })} /></Field></div>
            <p className="col-span-2 text-xs text-gray-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time can be entered online by the employee (field) or by the HR officer at office.
              Late is computed against this employee's own time-in{timeEdit.empTimeIn ? ` (${timeEdit.empTimeIn})` : ""}. Absent/leave clears the times.
            </p>
          </div>
        )}
      </Modal>

      {/* Remote duty request modal */}
      <Modal open={reqOpen} onClose={() => setReqOpen(false)} title="Remote / field duty request" size="md"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setReqOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={reqMut.isPending || !reqForm.employeeId || !reqForm.fromDate || !reqForm.toDate} onClick={() => reqMut.mutate()}>{reqMut.isPending ? "Submitting..." : "Submit request"}</button>
          </>
        }>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Employee" required>
              <select className="input" value={reqForm.employeeId} onChange={(e) => setReqForm({ ...reqForm, employeeId: e.target.value })}>
                <option value="">— select —</option>
                {(employees as { id: number; fullName: string }[] | undefined)?.map((e2) => <option key={e2.id} value={e2.id}>{e2.fullName}</option>)}
              </select>
            </Field>
          </div>
          <Field label="From" required><input type="date" className="input" value={reqForm.fromDate} onChange={(e) => setReqForm({ ...reqForm, fromDate: e.target.value })} /></Field>
          <Field label="To" required><input type="date" className="input" value={reqForm.toDate} onChange={(e) => setReqForm({ ...reqForm, toDate: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Remote location / area"><input className="input" value={reqForm.location} onChange={(e) => setReqForm({ ...reqForm, location: e.target.value })} placeholder="e.g. Rajanpur flood camp" /></Field></div>
          <div className="sm:col-span-2"><Field label="Reason / duty detail"><textarea className="input" rows={2} value={reqForm.reason} onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })} /></Field></div>
          <p className="sm:col-span-2 text-xs text-gray-500">On approval, attendance is auto-marked <b>present (remote)</b> for the whole period (weekends skipped).</p>
        </div>
      </Modal>

      <ImportModal open={importing} onClose={() => setImporting(false)} api="/api/hrm/attendance"
        fields={[
          { key: "employeeId", label: "Employee ID", type: "number" }, { key: "date", label: "Date (YYYY-MM-DD)" },
          { key: "status", label: "Status (present/absent/half/leave)" }, { key: "checkIn", label: "Check In (HH:MM)" },
          { key: "checkOut", label: "Check Out (HH:MM)" }, { key: "notes", label: "Notes" }, { key: "mode", label: "Mode (office/remote)" },
        ]}
        title="Attendance" onDone={invalidate} />
    </div>
  );
}

export default function Page() {
  return (
    <RequireAccess module="hrm.attendance">
      <AttendanceInner />
    </RequireAccess>
  );
}
