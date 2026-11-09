"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LifeBuoy, LogOut, MapPin, CalendarClock, Send, Camera, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { clsx } from "clsx";

const urgencyTone: Record<string, string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};
const statusTone: Record<string, string> = {
  open: "bg-gray-100 text-gray-600",
  assigned: "bg-sky-100 text-sky-700",
  "in-progress": "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-200 text-gray-500",
};

type Mission = {
  id: number; title: string; missionType: string; description: string | null; location: string | null;
  urgency: string; status: string; thumbnail: string | null; dueDate: string | null; createdAt: string;
  assignedAt: string; assignmentNote: string | null;
};
type Result = { id: number; missionId: number; feedback: string | null; outcome: string; location: string | null; sharePublicly: boolean; submittedAt: string };

export default function VolunteerDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const [openMission, setOpenMission] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [outcome, setOutcome] = useState("success");
  const [location, setLocation] = useState("");
  const [share, setShare] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<{ url: string; mediaType: string }[]>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vol-missions"],
    queryFn: async () => {
      const res = await fetch("/api/portal/volunteer/missions", { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      return (await res.json()).data as { volunteer: { id: number; name: string; email: string; type: string; city: string | null }; missions: Mission[]; results: Result[] };
    },
    retry: false,
  });

  useEffect(() => {
    if (isError) router.replace("/volunteer/login");
  }, [isError, router]);

  const submitMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/portal/volunteer/missions/${openMission}/result`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedback, outcome, location, sharePublicly: share, media: mediaUrls.filter((m) => m.url) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vol-missions"] });
      setOpenMission(null);
      setFeedback(""); setOutcome("success"); setLocation(""); setShare(false); setMediaUrls([]);
    },
  });

  async function logout() {
    await fetch("/api/portal/volunteer/logout", { method: "POST" });
    router.replace("/volunteer/login");
  }

  if (isLoading || !data) {
    return <div className="max-w-2xl mx-auto p-6 space-y-4"><div className="skeleton h-14" /><div className="skeleton h-40" /><div className="skeleton h-40" /></div>;
  }

  const resultFor = (mid: number) => data.results.find((r) => r.missionId === mid);

  return (
    <div>
      <header className="bg-[#172554] text-white">
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><LifeBuoy className="w-5 h-5" /></div>
            <div>
              <div className="font-semibold leading-tight">Field Portal</div>
              <div className="text-xs text-blue-200">{data.volunteer.name} · {data.volunteer.type}</div>
            </div>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition"><LogOut className="w-4 h-4" /> Exit</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-7">
        <h1 className="text-xl font-bold text-[#172554] mb-1">My Missions</h1>
        <p className="text-sm text-gray-500 mb-6">Tasks assigned to you by the Shauoor team. Submit your result below each mission.</p>

        {data.missions.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <LifeBuoy className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <div className="font-semibold text-gray-700">No missions yet</div>
            <p className="text-sm text-gray-500 mt-1">When the team assigns you a task — like tracing a lost child's family — it will appear here.</p>
          </div>
        )}

        <div className="space-y-4">
          {data.missions.map((m) => {
            const done = resultFor(m.id);
            const open = openMission === m.id;
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="font-bold text-[#172554] leading-snug">{m.title}</h2>
                    <span className={clsx("text-[11px] font-bold uppercase rounded-full px-2.5 py-1 shrink-0", urgencyTone[m.urgency])}>{m.urgency}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] mb-3">
                    <span className={clsx("rounded-full px-2.5 py-1 font-semibold", statusTone[m.status])}>{m.status}</span>
                    {m.location && <span className="inline-flex items-center gap-1 text-gray-500"><MapPin className="w-3 h-3" />{m.location}</span>}
                    {m.dueDate && <span className="inline-flex items-center gap-1 text-gray-500"><CalendarClock className="w-3 h-3" />Due {m.dueDate}</span>}
                  </div>
                  {m.description && <p className="text-sm text-gray-600 leading-relaxed mb-2">{m.description}</p>}
                  {m.assignmentNote && <p className="text-xs bg-blue-50 text-blue-800 rounded-lg px-3 py-2">📌 {m.assignmentNote}</p>}

                  {done ? (
                    <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-1">
                        <CheckCircle2 className="w-4 h-4" /> Result submitted — {done.outcome}
                      </div>
                      <p className="text-xs text-emerald-900/80">{done.feedback}</p>
                      <div className="text-[11px] text-emerald-700 mt-2">{done.sharePublicly ? "Shared on website ✅" : "Kept private"}</div>
                    </div>
                  ) : (
                    <button onClick={() => { setOpenMission(open ? null : m.id); setFeedback(""); setOutcome("success"); setLocation(m.location ?? ""); setShare(false); setMediaUrls([]); }}
                      className={clsx("mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition", open ? "bg-gray-100 text-gray-700" : "bg-[#172554] text-white hover:bg-[#1e3a8a]")}>
                      <Send className="w-4 h-4" /> {open ? "Close form" : "Submit result"}
                    </button>
                  )}
                </div>

                {open && !done && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-5 space-y-4">
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-600 mb-1 block">What happened? (feedback / result) *</span>
                      <textarea className="input" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="e.g. Family located in Mughalpura, child reunited with parents at 4pm…" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-600 mb-1 block">Outcome</span>
                        <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                          <option value="success">Success ✅</option>
                          <option value="partial">Partially done</option>
                          <option value="failed">Could not complete</option>
                          <option value="pending">Still in progress</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-600 mb-1 block">Location</span>
                        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
                      </label>
                    </div>

                    {/* media from mobile */}
                    <div>
                      <span className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Photos / videos (paste links from your mobile)</span>
                      {mediaUrls.map((mu, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <select className="input w-28" value={mu.mediaType} onChange={(e) => setMediaUrls((arr) => arr.map((x, j) => (j === i ? { ...x, mediaType: e.target.value } : x)))}>
                            <option value="image">Photo</option>
                            <option value="video">Video</option>
                          </select>
                          <input className="input" placeholder="https://…" value={mu.url} onChange={(e) => setMediaUrls((arr) => arr.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                          <button className="text-gray-400 hover:text-rose-600 px-1" onClick={() => setMediaUrls((arr) => arr.filter((_, j) => j !== i))}>✕</button>
                        </div>
                      ))}
                      <button className="text-xs font-semibold text-[#172554] hover:underline" onClick={() => setMediaUrls((arr) => [...arr, { url: "", mediaType: "image" }])}>+ Add photo/video link</button>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer bg-white border border-gray-200 rounded-xl p-3">
                      <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-0.5 accent-[#172554]" />
                      <span className="text-xs text-gray-600">
                        <b>Share this result on the public website</b> — so visitors can see the outcome. Leave unchecked to keep it internal only.
                      </span>
                    </label>

                    <button disabled={submitMut.isPending || !feedback.trim()} onClick={() => submitMut.mutate()}
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                      <Send className="w-4 h-4" /> {submitMut.isPending ? "Submitting…" : "Submit result"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800">← Shauoor website</Link>
        </div>
      </main>
    </div>
  );
}
