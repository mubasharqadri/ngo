"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Heart, ArrowRight, ShieldCheck, HandCoins, Users, Newspaper, LifeBuoy, Play, ImageIcon, Sprout } from "lucide-react";
import { clsx } from "clsx";

const fmtPKR = (n: unknown) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number(n));

export default function Home() {
  const { data: campaigns } = useQuery({
    queryKey: ["home-campaigns"],
    queryFn: async () => (await (await fetch("/api/campaigns")).json()).data,
  });
  const { data: posts } = useQuery({
    queryKey: ["home-posts"],
    queryFn: async () => (await (await fetch("/api/public/posts")).json()).data,
  });
  const { data: missions } = useQuery({
    queryKey: ["home-missions"],
    queryFn: async () => (await (await fetch("/api/missions?public=1")).json()).data,
  });

  return (
    <div>
      {/* ---- Opening: characteristic of the subject — a live appeal board, not a generic hero ---- */}
      <section className="bg-[#0e3b2e] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "26px 26px" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" /> Live from the field — updated daily
            </div>
            <h1 className="text-4xl md:text-[3.4rem] font-bold leading-[1.08] tracking-tight mb-5">
              نیکی کا سفر،<br />
              <span className="text-emerald-300">آپ کے نام سے جاری</span>
            </h1>
            <p className="text-emerald-100/90 text-lg leading-relaxed mb-8 max-w-xl">
              Maan Ghar, Qurbani, Eid, Langar and rescue missions — every rupee tracked, every life documented. Sign in to the donor portal and watch your giving change lives.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/campaigns" className="inline-flex items-center gap-2 bg-white text-[#0e3b2e] rounded-xl px-6 py-3 font-bold hover:bg-emerald-50 transition"><Heart className="w-4 h-4" /> Donate now</Link>
              <Link href="/donor/login" className="inline-flex items-center gap-2 border border-white/30 rounded-xl px-6 py-3 font-semibold hover:bg-white/10 transition">Donor Portal <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>

          {/* quick impact strip */}
          <div className="grid grid-cols-3 gap-3 mt-12 max-w-xl">
            {[{ v: "50,000+", l: "Families served", icon: Users }, { v: "100%", l: "Accounts published", icon: ShieldCheck }, { v: "Daily", l: "Field updates", icon: Newspaper }].map((s) => (
              <div key={s.l} className="bg-white/10 rounded-xl p-4">
                <s.icon className="w-5 h-5 text-emerald-300 mb-2" />
                <div className="text-xl font-bold">{s.v}</div>
                <div className="text-[11px] text-emerald-100/70 uppercase tracking-wide">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Active campaigns: each muhim separately ---- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 mb-2">Running right now</div>
            <h2 className="text-3xl font-bold text-[#1c2b26]">Our Campaigns <span className="text-gray-400 font-normal">· مہمات</span></h2>
          </div>
          <Link href="/campaigns" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">All campaigns <ArrowRight className="w-4 h-4" /></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(campaigns ?? []).slice(0, 4).map((c: { id: number; title: string; slug: string; summary: string | null; goal: string | null; raised: string | null; imageUrl: string | null }) => {
            const goal = Number(c.goal || 0);
            const raised = Number(c.raised || 0);
            const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
            return (
              <Link key={c.id} href={`/campaigns/${c.slug}`} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition">
                <div className="aspect-[16/10] bg-gradient-to-br from-emerald-100 to-emerald-200 overflow-hidden relative">
                  {c.imageUrl ? <img src={c.imageUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full flex items-center justify-center text-emerald-400"><Heart className="w-10 h-10" /></div>}
                  <div className="absolute top-3 left-3 bg-white/95 text-[#0e3b2e] text-[11px] font-bold rounded-full px-3 py-1">{pct.toFixed(0)}% funded</div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-[#1c2b26] leading-snug mb-1.5 group-hover:text-emerald-700 transition">{c.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">{c.summary}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="font-semibold text-emerald-700">{fmtPKR(raised)}</span>
                    <span>of {fmtPKR(goal)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---- Latest stories + rescue missions split ---- */}
      <section className="bg-[#f6f5f1] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 mb-2"><Newspaper className="w-4 h-4" /> Daily motivation</div>
            <h2 className="text-3xl font-bold text-[#1c2b26] mb-6">Latest Stories & Columns</h2>
            <div className="space-y-4">
              {(posts ?? []).slice(0, 3).map((p: { id: number; title: string; slug: string; excerpt: string | null; coverImage: string | null; category: string; publishedAt: string }) => (
                <Link key={p.id} href={`/stories/${p.slug}`} className="group flex gap-4 bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg hover:border-emerald-300 transition">
                  <div className="w-24 h-24 md:w-32 md:h-24 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 overflow-hidden shrink-0">
                    {p.coverImage ? <img src={p.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full flex items-center justify-center text-emerald-400"><ImageIcon className="w-6 h-6" /></div>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] mb-1">
                      <span className="bg-emerald-50 text-emerald-700 font-bold uppercase rounded-full px-2 py-0.5">{p.category}</span>
                      <span className="text-gray-400">{String(p.publishedAt).slice(0, 10)}</span>
                    </div>
                    <h3 className="font-bold text-[#1c2b26] leading-snug group-hover:text-emerald-700 transition">{p.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{p.excerpt}</p>
                  </div>
                </Link>
              ))}
              {(posts ?? []).length === 0 && <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-6 text-center">Daily stories will appear here.</div>}
            </div>
            <Link href="/stories" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline mt-5">All stories & gallery <ArrowRight className="w-4 h-4" /></Link>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#172554] mb-2"><LifeBuoy className="w-4 h-4" /> Rescue missions</div>
            <h2 className="text-3xl font-bold text-[#1c2b26] mb-6">Shared Outcomes</h2>
            <div className="space-y-4">
              {(missions ?? []).slice(0, 3).map((m: { id: number; title: string; status: string; location: string | null }) => (
                <Link key={m.id} href={`/missions/${m.id}`} className="group block bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={clsx("text-[10px] font-bold uppercase rounded-full px-2 py-0.5", m.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{m.status}</span>
                    {m.location && <span className="text-xs text-gray-400">{m.location}</span>}
                  </div>
                  <div className="font-bold text-[#1c2b26] leading-snug group-hover:text-[#172554] transition">{m.title}</div>
                </Link>
              ))}
              {(missions ?? []).length === 0 && <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl p-6 text-center">Mission outcomes appear when volunteers allow sharing.</div>}
            </div>
            <Link href="/missions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#172554] hover:underline mt-5">All missions <ArrowRight className="w-4 h-4" /></Link>

            <div className="mt-6 bg-[#172554] rounded-2xl p-6 text-white">
              <HandCoins className="w-7 h-7 text-blue-300 mb-3" />
              <div className="font-bold text-lg mb-1">Become a field volunteer</div>
              <p className="text-sm text-blue-100/80 mb-4">Take on rescue missions and report from your mobile.</p>
              <Link href="/volunteer/register" className="inline-flex items-center gap-2 bg-white text-[#172554] rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-blue-50 transition">Join now <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Transparency band ---- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-[#0e3b2e] rounded-3xl p-8 md:p-12 text-white grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-emerald-500/20" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 mb-3"><ShieldCheck className="w-4 h-4" /> Radical transparency</div>
            <h2 className="text-3xl font-bold leading-tight mb-3">Our Income & Expenditure and Balance Sheet — published live.</h2>
            <p className="text-emerald-100/80 mb-6">Generated straight from our double-entry accounting system. See exactly where every rupee goes.</p>
            <Link href="/transparency" className="inline-flex items-center gap-2 bg-white text-[#0e3b2e] rounded-xl px-6 py-3 font-bold hover:bg-emerald-50 transition">View our accounts <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="relative grid grid-cols-2 gap-4">
            {[{ icon: Sprout, t: "Donor Portal", d: "Track your giving & see the families you support" }, { icon: Heart, t: "Impact Media", d: "Photos & videos of lives transforming" }, { icon: LifeBuoy, t: "Rescue Missions", d: "Volunteers bring lost children home" }, { icon: Newspaper, t: "Daily Columns", d: "Stories that motivate a nation" }].map((f) => (
              <div key={f.t} className="bg-white/10 rounded-2xl p-5 hover:bg-white/15 transition">
                <f.icon className="w-6 h-6 text-emerald-300 mb-2.5" />
                <div className="font-bold text-sm mb-1">{f.t}</div>
                <div className="text-xs text-emerald-100/70 leading-relaxed">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
