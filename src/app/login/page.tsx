"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, Lock, Mail, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const [email, setEmail] = useState("admin@shauoor.org");
  const [password, setPassword] = useState("admin123");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Login failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg">S</div>
            <div>
              <div className="font-semibold">Shauoor Welfare Society</div>
              <div className="text-xs text-emerald-100">Serving humanity with dignity</div>
            </div>
          </div>
        </div>
        <div>
          <Heart className="w-12 h-12 text-emerald-200 mb-4" />
          <h1 className="text-3xl font-semibold leading-snug mb-3">
            Empowering change, <br /> one life at a time.
          </h1>
          <p className="text-emerald-100 max-w-md">
            Manage donors, donees, disbursements, HR and accounting in one unified platform built for
            transparency and impact.
          </p>
        </div>
        <div className="text-xs text-emerald-200">© {new Date().getFullYear()} Shauoor Welfare Society. All rights reserved.</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">S</div>
            <div>
              <div className="font-semibold">Shauoor Welfare Society</div>
              <div className="text-xs text-gray-500">ERP Portal</div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to access the management portal.</p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Email</span>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="input pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Password</span>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  className="input pl-9 pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
            <div className="font-medium text-gray-700 mb-1">Demo credentials</div>
            <div>Email: <code>admin@shauoor.org</code></div>
            <div>Password: <code>admin123</code></div>
          </div>

          <div className="mt-4 text-center text-sm">
            <Link href="/" className="text-emerald-700 hover:text-emerald-800">← Back to website</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
