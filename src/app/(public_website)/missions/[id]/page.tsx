"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, CheckCircle2, Play, LifeBuoy, MessageSquareHeart, HandHeart, Users } from "lucide-react";
import { useState } from "react";

const outcomeTone: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  failed: "bg-rose-100 text-rose-700",
  pending: "bg-gray-100 text-gray-600",
};

export default function PublicMissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [playing, setPlaying] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["public-mission", id],
    queryFn: async () => {
      const res = await fetch(`/api/missions/${id}?public=1`);
      if (!res.ok) return null;
      return (await res.json()).data;
    },
  });

  const joinMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/missions/${id}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ note: "Joined from website" }),
      });
      const j = await res.json();
      if (res.status === 401) throw new Error("AUTH");
      if (!res.ok) throw new Error(j.error || "Could not join");
    },
    onSuccess: () => setJoinMsg({ ok: true, text: "You're on the team! Check your helper portal for mission updates." }),
    onError: (e: Error) => setJoinMsg({ ok: false, text: e.message === "AUTH" ? "AUTH" : e.message }),
  });

  if (isLoading) return <div className="max-w-3xl mx-auto p-10 space-y-4"><div className="skeleton h-10 w-2/3" /><div className="skeleton h-40" /></div>;
  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center text-gray-500">
        <LifeBuoy className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        This mission is not shared publicly (or doesn't exist).
        <div className="mt-4"><Link href="/missions" className="text-emerald-700 font-semibold hover:underline">← All missions</Link></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/missions" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"><ArrowLeft className="w-4 h-4" /> All missions</Link>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] font-bold uppercase rounded-full px-2.5 py-1 bg-emerald-100 text-emerald-700">{data.missionType}</span>
        <span className={`text-[11px] font-bold uppercase rounded-full px-2.5 py-1 ${data.status === "completed" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>{data.status}</span>
        {data.location && <span className="inline-flex items-center gap-1 text-sm text-gray-500"><MapPin className="w-3.5 h-3.5" />{data.location}</span>}
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-[#1c2b26] leading-tight mb-4">{data.title}</h1>
      {data.description && <p className="text-lg text-gray-700 leading-relaxed mb-6">{data.description}</p>}

      {/* Join the mission */}
      <div className="bg-[#172554] rounded-2xl p-6 text-white mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center"><HandHeart className="w-5 h-5 text-blue-200" /></div>
          <div>
            <div className="font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-300" /> {data.assignments.length} helper{data.assignments.length !== 1 ? "s" : ""} on this mission{data.maxHelpers ? ` (max ${data.maxHelpers})` : ""}
            </div>
            <div className="text-xs text-blue-100/80">Volunteers, philanthropists & social workers — you can join even on mission day.</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button onClick={() => joinMut.mutate()} disabled={joinMut.isPending}
            className="inline-flex items-center gap-2 bg-white text-[#172554] rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-blue-50 transition disabled:opacity-60">
            <HandHeart className="w-4 h-4" /> {joinMut.isPending ? "Joining…" : "Join this mission"}
          </button>
          {joinMsg && joinMsg.text === "AUTH" && (
            <Link href="/volunteer/login" className="text-xs text-blue-200 underline">Sign in as a helper first →</Link>
          )}
          {joinMsg && joinMsg.text !== "AUTH" && (
            <span className={`text-xs ${joinMsg.ok ? "text-emerald-300" : "text-rose-300"}`}>{joinMsg.text}</span>
          )}
        </div>
      </div>

      {data.thumbnail && <img src={data.thumbnail} alt="" className="w-full aspect-[16/8] object-cover rounded-2xl mb-8" />}

      {/* volunteers who worked on it */}
      {data.assignments.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-[#1c2b26] mb-3">Volunteers on this mission</h2>
          <div className="flex flex-wrap gap-2">
            {data.assignments.map((a: { id: number; volunteerName: string | null; volunteerType: string | null }) => (
              <span key={a.id} className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-1.5 pr-3 py-1.5 text-sm">
                <span className="w-7 h-7 rounded-full bg-[#172554] text-white text-xs font-bold flex items-center justify-center">{(a.volunteerName ?? "?").charAt(0)}</span>
                <b>{a.volunteerName}</b>
                <span className="text-xs text-gray-400">{a.volunteerType}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* shared results */}
      <h2 className="font-bold text-[#1c2b26] mb-3">Field reports (shared publicly)</h2>
      {data.results.length === 0 && <p className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-5 mb-6">No public field reports yet for this mission.</p>}
      <div className="space-y-4 mb-8">
        {data.results.map((r: { id: number; volunteerName: string | null; feedback: string | null; outcome: string; location: string | null; submittedAt: string }) => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquareHeart className="w-4 h-4 text-emerald-600" />
                <b>{r.volunteerName ?? "Volunteer"}</b>
                <span className="text-xs text-gray-400">{String(r.submittedAt).slice(0, 10)}</span>
              </div>
              <span className={`text-[11px] font-bold uppercase rounded-full px-2.5 py-1 ${outcomeTone[r.outcome]}`}>{r.outcome === "success" ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Success</span> : r.outcome}</span>
            </div>
            <p className="text-[15px] text-gray-700 leading-relaxed">{r.feedback}</p>
            {r.location && <div className="text-xs text-gray-500 mt-2 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{r.location}</div>}
          </div>
        ))}
      </div>

      {/* mission media */}
      {data.media.length > 0 && (
        <>
          <h2 className="font-bold text-[#1c2b26] mb-3">Photos & videos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data.media.map((m: { id: number; mediaType: string; url: string; title: string | null }) => (
              m.mediaType === "video" ? (
                <button key={m.id} onClick={() => setPlaying(m.url)} className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-900">
                  <video src={m.url} muted preload="metadata" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center"><div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-5 h-5 text-[#172554] ml-0.5" /></div></div>
                </button>
              ) : (
                <img key={m.id} src={m.url} alt={m.title ?? ""} className="w-full aspect-[4/3] object-cover rounded-xl" />
              )
            ))}
          </div>
        </>
      )}

      {playing && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6" onClick={() => setPlaying(null)}>
          <video src={playing} controls autoPlay className="max-w-3xl w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
