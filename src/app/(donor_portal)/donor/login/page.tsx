"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, Mail, Lock, ArrowRight } from "lucide-react";

export default function DonorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/portal/donor/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error || "Login failed"); return; }
      router.replace("/donor");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-5">
      {/* Brand side */}
      <div className="lg:col-span-2 relative overflow-hidden bg-[#0e3b2e] text-white flex flex-col justify-between p-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#1a5c46] opacity-60" />
        <div className="absolute bottom-10 -left-20 w-72 h-72 rounded-full bg-[#15503c] opacity-50" />
        <Link href="/" className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg">S</div>
          <div>
            <div className="font-semibold">Shauoor Welfare Society</div>
            <div className="text-xs text-emerald-200">Donor Portal</div>
          </div>
        </Link>
        <div className="relative">
          <HeartHandshake className="w-12 h-12 text-emerald-300 mb-4" />
          <h1 className="text-3xl font-bold leading-snug mb-3">آپ کی نیکی،<br />کسی کی امید</h1>
          <p className="text-emerald-100/90 leading-relaxed">
            See exactly where your donations went — which families they reached, and how their lives are changing, with photos and videos from the field.
          </p>
        </div>
        <div className="relative text-xs text-emerald-200/70">© {new Date().getFullYear()} Shauoor Welfare Society</div>
      </div>

      {/* Form side */}
      <div className="lg:col-span-3 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1 text-[#1c2b26]">Donor sign in</h2>
          <p className="text-sm text-gray-500 mb-7">Track your giving and its impact.</p>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1 block">Email</span>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" className="input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-600 mb-1 block">Password</span>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" className="input pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
            </label>
            {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-[#0e3b2e] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#15503c] transition disabled:opacity-60">
              {loading ? "Signing in..." : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <div className="mt-6 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg p-3">
            <div className="font-semibold text-gray-700 mb-1">Demo donor account</div>
            Email: <code>donor@demo.org</code> · Password: <code>donor123</code>
          </div>
          <div className="mt-4 text-center text-sm">
            <Link href="/" className="text-[#0e3b2e] font-medium hover:underline">← Back to website</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
