"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, ArrowLeft } from "lucide-react";

export default function VolunteerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", city: "", volunteerType: "citizen", skills: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/volunteer/register", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form),
    });
    const j = await res.json();
    setLoading(false);
    if (!res.ok) { setError(j.error || "Registration failed"); return; }
    router.replace("/volunteer");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/volunteer/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5"><ArrowLeft className="w-4 h-4" /> Back to login</Link>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#172554] text-white flex items-center justify-center"><UserPlus className="w-5 h-5" /></div>
            <div>
              <h2 className="text-xl font-bold text-[#172554]">Join as a volunteer</h2>
              <p className="text-xs text-gray-500">Students, citizens & professionals — all welcome.</p>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2">
                <span className="text-xs font-semibold text-gray-600 mb-1 block">Full name *</span>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label className="block col-span-2">
                <span className="text-xs font-semibold text-gray-600 mb-1 block">Email *</span>
                <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600 mb-1 block">Password *</span>
                <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600 mb-1 block">Phone</span>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600 mb-1 block">City</span>
                <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600 mb-1 block">I am a…</span>
                <select className="input" value={form.volunteerType} onChange={(e) => setForm({ ...form, volunteerType: e.target.value })}>
                  <option value="student">Student</option>
                  <option value="citizen">Citizen</option>
                  <option value="professional">Professional</option>
                  <option value="philanthropist">Philanthropist</option>
                  <option value="social-worker">Social Worker</option>
                </select>
              </label>
              <label className="block col-span-2">
                <span className="text-xs font-semibold text-gray-600 mb-1 block">Skills / notes</span>
                <textarea className="input" rows={2} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="e.g. local area knowledge, first aid, translation…" />
              </label>
            </div>
            {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-[#172554] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#1e3a8a] transition disabled:opacity-60">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
