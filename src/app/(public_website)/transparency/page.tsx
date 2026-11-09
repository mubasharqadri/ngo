"use client";
import { useQuery } from "@tanstack/react-query";
import { Scale, Landmark, ShieldCheck, HandCoins, Heart, Users } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

const fmt = (n: number) => "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

export default function TransparencyPage() {
  const year = new Date().getFullYear();
  const [tab, setTab] = useState<"ie" | "bs">("ie");
  const [period, setPeriod] = useState(String(year));

  const { data, isLoading } = useQuery({
    queryKey: ["transparency", period],
    queryFn: async () => {
      const p = period === "all" ? "" : `&year=${period}`;
      return (await (await fetch(`/api/public/transparency?_=1${p}`)).json()).data;
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Full transparency</div>
        <h1 className="text-4xl font-bold text-[#1c2b26] mb-3">Our Accounts, Open to You</h1>
        <p className="text-gray-600 max-w-2xl">
          Every rupee is accounted for. Below are our Income & Expenditure Account and Balance Sheet — generated live from our double-entry accounting system.
        </p>
      </div>

      {data?.impact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: HandCoins, label: "Total Collected", value: fmt(data.impact.collected), tone: "bg-emerald-50 text-emerald-700" },
            { icon: Heart, label: "Disbursed to Donees", value: fmt(data.impact.disbursed), tone: "bg-rose-50 text-rose-700" },
            { icon: Users, label: "Donors", value: String(data.impact.donors), tone: "bg-sky-50 text-sky-700" },
            { icon: Users, label: "Donees Served", value: String(data.impact.donees), tone: "bg-amber-50 text-amber-700" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", s.tone)}><s.icon className="w-5 h-5" /></div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{s.label}</div>
                <div className="font-bold text-[#1c2b26]">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 border-b border-gray-200">
          {[{ id: "ie", label: "Income & Expenditure", icon: Scale }, { id: "bs", label: "Balance Sheet", icon: Landmark }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as never)}
              className={clsx("inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition", tab === t.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-800")}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
        <select className="input w-44" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value={String(year)}>{year}</option>
          <option value={String(year - 1)}>{year - 1}</option>
          <option value="all">All time</option>
        </select>
      </div>

      {isLoading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>}

      {data && tab === "ie" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50/50">
            <div className="font-bold text-[#1c2b26]">Income & Expenditure Account</div>
            <div className="text-xs text-gray-500">Period: {data.period.from} → {data.period.to}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div>
              <div className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 border-b border-gray-100">Income</div>
              {data.incomeExpenditure.income.map((r: { code: string; name: string; amount: number }) => (
                <div key={r.code} className="px-6 py-3 flex justify-between text-sm border-b border-gray-50">
                  <span>{r.name}</span><span className="font-semibold text-emerald-700">{fmt(r.amount)}</span>
                </div>
              ))}
              <div className="px-6 py-3.5 flex justify-between font-bold bg-emerald-50/60"><span>Total Income</span><span className="text-emerald-700">{fmt(data.incomeExpenditure.totalIncome)}</span></div>
            </div>
            <div>
              <div className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 border-b border-gray-100">Expenditure</div>
              {data.incomeExpenditure.expenses.map((r: { code: string; name: string; amount: number }) => (
                <div key={r.code} className="px-6 py-3 flex justify-between text-sm border-b border-gray-50">
                  <span>{r.name}</span><span className="font-semibold text-rose-700">{fmt(r.amount)}</span>
                </div>
              ))}
              <div className="px-6 py-3.5 flex justify-between font-bold bg-rose-50/60"><span>Total Expenditure</span><span className="text-rose-700">{fmt(data.incomeExpenditure.totalExpense)}</span></div>
            </div>
          </div>
          <div className="px-6 py-4 flex justify-between items-center bg-[#0e3b2e] text-white">
            <span className="font-bold">Surplus — reinvested in welfare</span>
            <span className="text-xl font-bold">{fmt(data.incomeExpenditure.surplus)}</span>
          </div>
        </div>
      )}

      {data && tab === "bs" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50/50">
            <div className="font-bold text-[#1c2b26]">Balance Sheet</div>
            <div className="text-xs text-gray-500">As of {data.period.to}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div>
              <div className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 border-b border-gray-100">Assets</div>
              {data.balanceSheet.assets.map((r: { code: string; name: string; amount: number }) => (
                <div key={r.code} className="px-6 py-3 flex justify-between text-sm border-b border-gray-50"><span>{r.name}</span><span className="font-semibold">{fmt(r.amount)}</span></div>
              ))}
              <div className="px-6 py-3.5 flex justify-between font-bold bg-emerald-50/60"><span>Total Assets</span><span className="text-emerald-700">{fmt(data.balanceSheet.totalAssets)}</span></div>
            </div>
            <div>
              <div className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 border-b border-gray-100">Liabilities & Fund</div>
              {data.balanceSheet.liabilities.map((r: { code: string; name: string; amount: number }) => (
                <div key={r.code} className="px-6 py-3 flex justify-between text-sm border-b border-gray-50"><span>{r.name}</span><span className="font-semibold">{fmt(r.amount)}</span></div>
              ))}
              {data.balanceSheet.equity.map((r: { code: string; name: string; amount: number }) => (
                <div key={r.code} className="px-6 py-3 flex justify-between text-sm border-b border-gray-50"><span>{r.name}</span><span className="font-semibold">{fmt(r.amount)}</span></div>
              ))}
              <div className="px-6 py-3 flex justify-between text-sm border-b border-gray-50"><span>Accumulated Surplus</span><span className="font-semibold">{fmt(data.balanceSheet.retainedSurplus)}</span></div>
              <div className="px-6 py-3.5 flex justify-between font-bold bg-emerald-50/60"><span>Total Liab. & Fund</span><span className="text-emerald-700">{fmt(data.balanceSheet.totalLiabilitiesEquity)}</span></div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 text-center">Statements are generated live from our ERP double-entry ledger. Audited figures are published annually.</p>
    </div>
  );
}
