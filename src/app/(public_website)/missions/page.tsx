"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { LifeBuoy, MapPin, CheckCircle2, ArrowRight, Clock, Users, HandHeart } from "lucide-react";
import { clsx } from "clsx";

const statusTone: Record<string, string> = {
  open: "bg-gray-100 text-gray-600",
  assigned: "bg-sky-100 text-sky-700",
  "in-progress": "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-200 text-gray-500",
};

export default function PublicMissionsPage() {
  const { data } = useQuery({
    queryKey: ["public-missions"],
    queryFn: async () => (await (await fetch("/api/missions?public=1")).json()).data,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 mb-2 flex items-center gap-2"><LifeBuoy className="w-4 h-4" /> Community rescue missions</div>
        <h1 className="text-4xl font-bold text-[#1c2b26] mb-3">Missions & Outcomes</h1>
        <p className="text-gray-600 max-w-2xl">
          When a lost child is found, a flood hits, or a hospital needs help — our registered volunteers, philanthropists and social workers take the mission forward. These are the stories we've been allowed to share.
        </p>
      </div>

      <div className="space-y-4">
        {data?.map((m: { id: number; title: string; missionType: string; otherTypeLabel: string | null; description: string | null; location: string | null; area: string | null; status: string; urgency: string; thumbnail: string | null; createdAt: string; resultsCount: number; assignedCount: number; maxHelpers: number | null }) => (
          <Link key={m.id} href={`/missions/${m.id}`} className="group flex gap-5 bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-emerald-300 transition">
            <div className="w-28 h-24 md:w-40 md:h-28 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 overflow-hidden shrink-0">
              {m.thumbnail ? <img src={m.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full flex items-center justify-center text-emerald-400"><LifeBuoy className="w-8 h-8" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={clsx("text-[11px] font-bold uppercase rounded-full px-2.5 py-0.5", statusTone[m.status])}>{m.status === "completed" ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span> : m.status}</span>
                <span className="text-[11px] font-bold uppercase rounded-full px-2.5 py-0.5 bg-sky-100 text-sky-700">{m.missionType === "other" ? m.otherTypeLabel ?? "Other" : m.missionType.replace(/-/g, " ")}</span>
                {(m.area || m.location) && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3" />{m.area ?? m.location}</span>}
                <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{String(m.createdAt).slice(0, 10)}</span>
              </div>
              <h3 className="font-bold text-[#1c2b26] group-hover:text-emerald-700 transition leading-snug">{m.title}</h3>
              {m.description && <p className="text-sm text-gray-600 line-clamp-2 mt-1">{m.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1 font-semibold text-[#172554]"><Users className="w-3.5 h-3.5" /> {m.assignedCount} joined{m.maxHelpers ? ` / ${m.maxHelpers} max` : ""}</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">View outcome & join <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" /></span>
              </div>
            </div>
          </Link>
        ))}
        {data && data.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <LifeBuoy className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            Shared mission outcomes will appear here.
          </div>
        )}
      </div>

      <div className="mt-10 bg-[#172554] rounded-2xl p-8 text-white text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-blue-500/20" />
        <HandHeart className="w-9 h-9 mx-auto text-blue-300 mb-3" />
        <h2 className="text-2xl font-bold mb-2">Be the help someone is waiting for</h2>
        <p className="text-blue-100/90 mb-5 text-sm max-w-xl mx-auto">Register as a volunteer, philanthropist or social worker — then join any published mission directly from its page, even on the day it runs.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/volunteer/register" className="inline-flex items-center gap-2 bg-white text-[#172554] rounded-xl px-6 py-3 text-sm font-bold hover:bg-blue-50 transition">Join as a helper <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/volunteer/login" className="inline-flex items-center gap-2 border border-white/40 rounded-xl px-6 py-3 text-sm font-semibold hover:bg-white/10 transition">Helper login</Link>
        </div>
      </div>
    </div>
  );
}
