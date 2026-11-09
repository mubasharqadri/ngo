import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-[#0e3b2e] flex items-center justify-center text-white font-bold text-lg shadow-sm">S</div>
            <div>
              <div className="font-bold text-[15px] leading-tight text-[#1c2b26]">Shauoor</div>
              <div className="text-[10px] text-gray-500 leading-tight tracking-wide">WELFARE SOCIETY</div>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-gray-600 hover:text-[#0e3b2e] transition">Home</Link>
            <Link href="/campaigns" className="text-gray-600 hover:text-[#0e3b2e] transition">Campaigns</Link>
            <Link href="/stories" className="text-gray-600 hover:text-[#0e3b2e] transition">Stories</Link>
            <Link href="/missions" className="text-gray-600 hover:text-[#0e3b2e] transition">Missions</Link>
            <Link href="/transparency" className="text-gray-600 hover:text-[#0e3b2e] transition">Transparency</Link>
            <Link href="/about" className="text-gray-600 hover:text-[#0e3b2e] transition">About</Link>
            <Link href="/contacts" className="text-gray-600 hover:text-[#0e3b2e] transition">Contact</Link>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/donor/login" className="hidden sm:inline-flex text-sm font-semibold text-[#0e3b2e] border border-emerald-700/30 rounded-lg px-3.5 py-2 hover:bg-emerald-50 transition">Donor Portal</Link>
            <Link href="/dashboard" className="inline-flex text-sm font-semibold text-white bg-[#0e3b2e] rounded-lg px-3.5 py-2 hover:bg-[#15503c] transition">Staff Login</Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-[#0e3b2e] text-emerald-100/80 pt-12 pb-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white font-bold text-lg">S</div>
              <div className="text-white font-bold">Shauoor Welfare Society</div>
            </div>
            <p className="leading-relaxed text-emerald-100/70">Serving humanity with dignity since 2015. Registered NGO working across Pakistan.</p>
          </div>
          <div>
            <div className="font-bold text-white mb-3">Explore</div>
            <ul className="space-y-2">
              <li><Link href="/campaigns" className="hover:text-white transition">Our Campaigns</Link></li>
              <li><Link href="/stories" className="hover:text-white transition">Stories & Updates</Link></li>
              <li><Link href="/missions" className="hover:text-white transition">Rescue Missions</Link></li>
              <li><Link href="/transparency" className="hover:text-white transition">Financial Transparency</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-white mb-3">Get Involved</div>
            <ul className="space-y-2">
              <li><Link href="/donor/login" className="hover:text-white transition">Donor Portal</Link></li>
              <li><Link href="/volunteer/register" className="hover:text-white transition">Become a Volunteer</Link></li>
              <li><Link href="/volunteer/login" className="hover:text-white transition">Volunteer Login</Link></li>
              <li><Link href="/contacts" className="hover:text-white transition">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-white mb-3">Reach Us</div>
            <ul className="space-y-2 text-emerald-100/70">
              <li>12-B, Block F, Johar Town</li>
              <li>Lahore, Pakistan</li>
              <li>+92 300 1234567</li>
              <li>info@shauoor.org</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-emerald-100/50">
          © {new Date().getFullYear()} Shauoor Welfare Society · All rights reserved · <Link href="/transparency" className="underline hover:text-white">Accounts published openly</Link>
        </div>
      </footer>
    </div>
  );
}
