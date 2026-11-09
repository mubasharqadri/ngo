"use client";
import { useQuery } from "@tanstack/react-query";
import { Heart, Eye, History } from "lucide-react";

export default function Page() {
  const { data } = useQuery({
    queryKey: ["about"],
    queryFn: async () => {
      const res = await fetch("/api/about");
      return (await res.json()).data;
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">About Shauoor</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          A trusted welfare organization serving Pakistan since 2015.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[
          { icon: Heart, title: "Mission", key: "mission" },
          { icon: Eye, title: "Vision", key: "vision" },
          { icon: History, title: "Our Story", key: "history" },
        ].map((s) => (
          <div key={s.key} className="card p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <s.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold mb-2">{s.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {data?.content?.[s.key] ?? "Loading..."}
            </p>
          </div>
        ))}
      </div>

      {data?.company && (
        <div className="card p-6">
          <h3 className="font-semibold mb-3">Organization Details</h3>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">Name</dt><dd className="font-medium">{data.company.name}</dd></div>
            <div><dt className="text-gray-500">Registration</dt><dd className="font-medium">{data.company.regNumber ?? "—"}</dd></div>
            <div><dt className="text-gray-500">Email</dt><dd className="font-medium">{data.company.email ?? "—"}</dd></div>
            <div><dt className="text-gray-500">Phone</dt><dd className="font-medium">{data.company.phone ?? "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-gray-500">Address</dt><dd className="font-medium">{data.company.address}, {data.company.city}, {data.company.country}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
