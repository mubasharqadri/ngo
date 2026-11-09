"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Newspaper, ImageIcon, Play, ArrowRight } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

type Post = { id: number; title: string; slug: string; excerpt: string | null; coverImage: string | null; category: string; author: string | null; publishedAt: string };
type Media = { id: number; title: string | null; mediaType: string; url: string; caption: string | null };

export default function StoriesPage() {
  const [tab, setTab] = useState<"posts" | "gallery">("posts");
  const [playing, setPlaying] = useState<string | null>(null);

  const { data: posts } = useQuery<Post[]>({
    queryKey: ["public-posts"],
    queryFn: async () => (await (await fetch("/api/public/posts")).json()).data,
  });
  const { data: media } = useQuery<Media[]>({
    queryKey: ["public-media"],
    queryFn: async () => (await (await fetch("/api/media?public=1")).json()).data,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 mb-2">Daily from the field</div>
        <h1 className="text-4xl font-bold text-[#1c2b26] mb-3">Stories & Updates</h1>
        <p className="text-gray-600 max-w-2xl">Columns, ground reports, photos and videos — real moments of change, shared daily to inspire you.</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {[{ id: "posts", label: "Columns & Stories", icon: Newspaper }, { id: "gallery", label: "Photo & Video Gallery", icon: ImageIcon }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as never)}
            className={clsx("inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition", tab === t.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-800")}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts?.map((p) => (
            <Link key={p.id} href={`/stories/${p.slug}`} className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition">
              <div className="aspect-[16/9] bg-gradient-to-br from-emerald-100 to-emerald-200 overflow-hidden">
                {p.coverImage ? (
                  <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-400"><Newspaper className="w-10 h-10" /></div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-[11px] mb-2">
                  <span className="bg-emerald-50 text-emerald-700 font-bold uppercase rounded-full px-2.5 py-0.5">{p.category}</span>
                  <span className="text-gray-400">{String(p.publishedAt).slice(0, 10)}</span>
                </div>
                <h3 className="font-bold text-[#1c2b26] leading-snug mb-2 group-hover:text-emerald-700 transition">{p.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{p.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">Read <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" /></span>
              </div>
            </Link>
          ))}
          {posts && posts.length === 0 && <div className="col-span-full text-center text-gray-500 py-16">No stories published yet.</div>}
        </div>
      )}

      {tab === "gallery" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media?.filter((m) => m.mediaType === "image").map((m) => (
            <div key={m.id} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img src={m.url} alt={m.title ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              {m.title && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white text-xs font-semibold">{m.title}</div>}
            </div>
          ))}
          {media?.filter((m) => m.mediaType === "video").map((m) => (
            <button key={m.id} onClick={() => setPlaying(m.url)} className="group relative aspect-square rounded-xl overflow-hidden bg-gray-900">
              <video src={m.url} className="w-full h-full object-cover opacity-80" muted preload="metadata" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition"><Play className="w-5 h-5 text-[#0e3b2e] ml-0.5" /></div>
              </div>
              {m.title && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white text-xs font-semibold text-left">{m.title}</div>}
            </button>
          ))}
          {media && media.length === 0 && <div className="col-span-full text-center text-gray-500 py-16">Gallery will fill up as field media is uploaded.</div>}
        </div>
      )}

      {playing && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6" onClick={() => setPlaying(null)}>
          <video src={playing} controls autoPlay className="max-w-4xl w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
