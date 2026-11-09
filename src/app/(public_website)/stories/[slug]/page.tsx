"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";

export default function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data } = useQuery({
    queryKey: ["post", slug],
    queryFn: async () => (await (await fetch(`/api/public/posts?slug=${slug}`)).json()).data,
  });

  if (!data) {
    return <div className="max-w-3xl mx-auto px-6 py-24 text-center text-gray-500"><Newspaper className="w-10 h-10 mx-auto mb-3 text-gray-300" />Loading story…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/stories" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"><ArrowLeft className="w-4 h-4" /> All stories</Link>
      <div className="flex items-center gap-2 text-xs mb-3">
        <span className="bg-emerald-50 text-emerald-700 font-bold uppercase rounded-full px-2.5 py-1">{data.category}</span>
        <span className="text-gray-400">{String(data.publishedAt).slice(0, 10)} {data.author ? `· ${data.author}` : ""}</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-[#1c2b26] leading-tight mb-5">{data.title}</h1>
      {data.coverImage && <img src={data.coverImage} alt={data.title} className="w-full aspect-[16/8] object-cover rounded-2xl mb-7" />}
      {data.excerpt && <p className="text-lg text-gray-700 font-medium leading-relaxed mb-6 border-l-4 border-emerald-500 pl-4">{data.excerpt}</p>}
      <div className="text-[17px] text-gray-700 leading-[1.8] whitespace-pre-line">{data.body}</div>
    </div>
  );
}
