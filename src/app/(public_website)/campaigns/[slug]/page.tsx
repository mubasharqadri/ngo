"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Target, ImageIcon, Play } from "lucide-react";
import { useState } from "react";

const fmtPKR = (n: unknown) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number(n));

export default function CampaignDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [playing, setPlaying] = useState<string | null>(null);

  const { data: campaign } = useQuery({
    queryKey: ["campaign", slug],
    queryFn: async () => (await (await fetch(`/api/campaigns?slug=${slug}`)).json()).data,
  });
  const { data: media } = useQuery({
    queryKey: ["campaign-media", campaign?.id],
    enabled: !!campaign?.id,
    queryFn: async () => (await (await fetch(`/api/media?public=1&linkType=campaign&linkId=${campaign.id}`)).json()).data,
  });

  if (!campaign) {
    return <div className="max-w-3xl mx-auto px-6 py-24 text-center text-gray-500">Loading campaign…</div>;
  }

  const goal = Number(campaign.goal || 0);
  const raised = Number(campaign.raised || 0);
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"><ArrowLeft className="w-4 h-4" /> All campaigns</Link>

      <div className="aspect-[16/7] rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-300 mb-8">
        {campaign.imageUrl ? <img src={campaign.imageUrl} alt={campaign.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-emerald-500"><Heart className="w-16 h-16" /></div>}
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-[#1c2b26] leading-tight mb-4">{campaign.title}</h1>
      <p className="text-lg text-gray-700 leading-relaxed mb-8 whitespace-pre-line">{campaign.description}</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-10">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"><Heart className="w-4 h-4" /> {fmtPKR(raised)} raised</span>
          <span className="inline-flex items-center gap-1.5 text-gray-500"><Target className="w-4 h-4" /> Goal {fmtPKR(goal)}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mb-4">
          <span>{pct.toFixed(0)}% funded</span>
          <span>{fmtPKR(Math.max(goal - raised, 0))} to go</span>
        </div>
        <button className="w-full bg-[#0e3b2e] text-white rounded-xl py-3 font-bold hover:bg-[#15503c] transition">Donate to this campaign</button>
      </div>

      {media && media.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-[#1c2b26] mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-600" /> From this campaign</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {media.map((m: { id: number; mediaType: string; url: string; title: string | null }) => (
              m.mediaType === "video" ? (
                <button key={m.id} onClick={() => setPlaying(m.url)} className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-900">
                  <video src={m.url} muted preload="metadata" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center"><div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-5 h-5 text-[#0e3b2e] ml-0.5" /></div></div>
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
