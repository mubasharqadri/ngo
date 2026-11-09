"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HeartHandshake, Receipt, Users, Sprout, LogOut, Play, ImageIcon, CalendarDays, MapPin } from "lucide-react";

const fmtPKR = (n: number | string) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number(n));

type Dashboard = {
  donor: { id: number; name: string; membershipNo: string | null; since: string | null; email: string; supportType: string | null };
  totalGiven: number;
  receiptCount: number;
  helpedCount: number;
  receipts: { id: number; receiptNo: string; receiptDate: string; donationDate: string; totalAmount: string; instrumentNo: string | null; voucherNo: string | null; restrictUseInFund: boolean }[];
  helped: { doneeId: number | null; doneeName: string | null; doneeCity: string | null; problemType: string | null; categoryName: string | null; totalGiven: string; receiptCount: number }[];
  impactMedia: { id: number; title: string | null; caption: string | null; mediaType: string; url: string; linkId: number | null; doneeName: string | null; createdAt: Date }[];
  schedule: { month: string; doneeName: string | null; categoryName: string | null; amount: string }[];
};

export default function DonorDashboard() {
  const router = useRouter();
  const [playing, setPlaying] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["donor-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/portal/donor/dashboard", { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      return (await res.json()).data as Dashboard;
    },
    retry: false,
  });

  useEffect(() => {
    if (isError) router.replace("/donor/login");
  }, [isError, router]);

  async function logout() {
    await fetch("/api/portal/donor/logout", { method: "POST" });
    router.replace("/donor/login");
  }

  if (isLoading || !data) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <div className="skeleton h-14 w-full" />
        <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Top bar */}
      <header className="bg-[#0e3b2e] text-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><HeartHandshake className="w-5 h-5" /></div>
            <div>
              <div className="font-semibold leading-tight">Donor Portal</div>
              <div className="text-xs text-emerald-200">{data.donor.name} {data.donor.membershipNo ? `· ${data.donor.membershipNo}` : ""}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-emerald-100 hover:text-white hidden sm:block">Website</Link>
            <button onClick={logout} className="inline-flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition"><LogOut className="w-4 h-4" /> Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome + impact stats */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1c2b26]">Assalam-o-Alaikum, {data.donor.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Here is the complete account of your generosity and the lives it has touched.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"><Sprout className="w-5 h-5" /></div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total Given</div>
              <div className="text-2xl font-bold text-[#0e3b2e] mt-0.5">{fmtPKR(data.totalGiven)}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center"><Receipt className="w-5 h-5" /></div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Receipts</div>
              <div className="text-2xl font-bold text-[#1c2b26] mt-0.5">{data.receiptCount}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Lives Touched</div>
              <div className="text-2xl font-bold text-[#1c2b26] mt-0.5">{data.helpedCount}</div>
            </div>
          </div>
        </div>

        {/* Impact media — transformation photos/videos */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-[#1c2b26] mb-1">The Change You Made Possible</h2>
          <p className="text-sm text-gray-500 mb-4">Photos & videos from the field — how your donees' lives are transforming.</p>
          {data.impactMedia.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
              <ImageIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              Impact media will appear here as our team uploads field updates.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.impactMedia.map((m) => (
                <button key={m.id} onClick={() => m.mediaType === "video" && setPlaying(m.url)} className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 text-left">
                  {m.mediaType === "video" ? (
                    <>
                      <video src={m.url} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                        <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-5 h-5 text-[#0e3b2e] ml-0.5" /></div>
                      </div>
                    </>
                  ) : (
                    <img src={m.url} alt={m.title ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 text-white">
                    <div className="text-xs font-semibold truncate">{m.doneeName ?? m.title}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donees helped */}
          <section>
            <h2 className="text-lg font-bold text-[#1c2b26] mb-4">Families You Support</h2>
            <div className="space-y-3">
              {data.helped.map((h, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-emerald-300 transition">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-[#0e3b2e] text-white flex items-center justify-center font-bold shrink-0">
                    {(h.doneeName ?? "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#1c2b26] truncate">{h.doneeName ?? "—"}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      {h.doneeCity && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{h.doneeCity}</span>}
                      {h.categoryName && <span className="bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">{h.categoryName}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-emerald-700">{fmtPKR(h.totalGiven)}</div>
                    <div className="text-[11px] text-gray-400">{h.receiptCount} receipt{h.receiptCount > 1 ? "s" : ""}</div>
                  </div>
                </div>
              ))}
              {data.helped.length === 0 && <div className="text-sm text-gray-500 bg-white border rounded-xl p-6 text-center">Your supported donees will appear here.</div>}
            </div>
          </section>

          {/* Donation receipts */}
          <section>
            <h2 className="text-lg font-bold text-[#1c2b26] mb-4">My Donation Receipts</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="table">
                <thead><tr><th>Receipt</th><th>Date</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {data.receipts.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="font-mono text-xs text-emerald-700">{r.receiptNo}</div>
                        {r.voucherNo && <div className="text-[10px] text-gray-400">Voucher {r.voucherNo}</div>}
                      </td>
                      <td className="text-xs"><span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3 text-gray-400" />{r.receiptDate}</span></td>
                      <td className="text-right font-semibold">{fmtPKR(r.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.schedule.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-[#1c2b26] mt-6 mb-3">Support Schedule (month-wise)</h3>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="table">
                    <thead><tr><th>Month</th><th>Donee</th><th>Fund</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      {data.schedule.slice(0, 12).map((s, i) => (
                        <tr key={i}>
                          <td className="font-mono text-xs">{s.month}</td>
                          <td className="text-xs">{s.doneeName ?? "—"}</td>
                          <td className="text-xs">{s.categoryName ?? "—"}</td>
                          <td className="text-right text-xs font-semibold">{fmtPKR(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* Video lightbox */}
      {playing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setPlaying(null)}>
          <video src={playing} controls autoPlay className="max-w-3xl w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
