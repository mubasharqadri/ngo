"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LifeBuoy, Mail, Lock, ArrowRight, UserPlus } from "lucide-react";

export default function VolunteerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/volunteer/login", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }),
    });
    const j = await res.json();
    setLoading(false);
    if (!res.ok) { setError(j.error || "Login failed"); return; }
    router.replace("/volunteer");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-5">
      <div className="lg:col-span-2 relative overflow-hidden bg-[#172554] text-white flex flex-col justify-between p-10">
        <div className="absolute -bottom-28 -right-20 w-96 h-96 rounded-full bg-[#1e3a8a] opacity-70" />
        <div className="absolute top-16 -left-24 w-64 h-64 rounded-full bg-[#1d4ed8] opacity-30" />
        <Link href="/" className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg">S</div>
          <div>
            <div className="font-semibold">Shauoor Welfare Society</div>
            <div className="text-xs text-blue-200">Volunteer Field Portal</div>
          </div>
        </Link>
        <div className="relative">
          <LifeBuoy className="w-12 h-12 text-blue-300 mb-4" />
          <h1 className="text-3xl font-bold leading-snug mb-3">Field heroes,<br />this is your desk.</h1>
          <p className="text-blue-100/90 leading-relaxed">
            Missions assigned to you — like tracing a lost child's family — appear here. Report results, upload photos & videos, all from your mobile.
          </p>
        </div>
        <div className="relative text-xs text-blue-200/70">© {new Date().getFullYear()} Shauoor Welfare Society</div>
      </div>

      <div className="lg:col-span-3 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1 text-[#172554]">Volunteer sign in</h2>
          <p className="text-sm text-gray-500 mb-7">Access your assigned missions.</p>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1 block">Email</span>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" className="input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1 block">Password</span>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" className="input pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </label>
            {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-[#172554] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#1e3a8a] transition disabled:opacity-60">
              {loading ? "Signing in..." : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <Link href="/volunteer/register" className="mt-4 w-full inline-flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 text-sm font-semibold text-gray-700 hover:bg-white transition">
            <UserPlus className="w-4 h-4" /> Register as a volunteer
          </Link>
          <div className="mt-5 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg p-3">
            <div className="font-semibold text-gray-700 mb-1">Demo volunteer account</div>
            Email: <code>volunteer@demo.org</code> · Password: <code>vol123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
