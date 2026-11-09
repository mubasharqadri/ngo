"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Heart } from "lucide-react";

type Campaign = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  goal: string | null;
  raised: string | null;
  imageUrl: string | null;
};

const fmtPKR = (n: unknown) => {
  const v = Number(n);
  if (isNaN(v) || !n) return "PKR 0";
  return "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(v);
};

export default function Page() {
  const { data, isLoading } = useQuery<Campaign[]>({
    queryKey: ["public-campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns");
      return (await res.json()).data;
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Active Campaigns</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Support our ongoing initiatives and make a real difference in someone's life today.
        </p>
      </div>

      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton h-40" />
              <div className="p-5 space-y-2"><div className="skeleton h-4" /><div className="skeleton h-3 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>
            </div>
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="card p-12 text-center">
          <Heart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No active campaigns at the moment.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((c) => {
            const goal = Number(c.goal || 0);
            const raised = Number(c.raised || 0);
            const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
            return (
              <div key={c.id} className="card overflow-hidden hover:shadow-lg transition group">
                <div className="aspect-[16/10] bg-gradient-to-br from-emerald-100 to-emerald-200 relative overflow-hidden">
                  {c.imageUrl ? (
                    <img src={c.imageUrl} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-400"><Heart className="w-16 h-16" /></div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold mb-1.5 leading-tight">{c.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{c.summary}</p>
                  <div className="mb-2">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span><span className="font-semibold text-emerald-700">{fmtPKR(raised)}</span> raised</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">Goal: {fmtPKR(goal)}</div>
                  <button className="btn btn-primary w-full justify-center">Donate Now</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
