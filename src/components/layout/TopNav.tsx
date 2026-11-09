import { getSession } from "@/lib/auth";
import { Bell, Search, User } from "lucide-react";

export async function TopNav() {
  const session = await getSession();
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-6 gap-4 sticky top-0 z-10">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-transparent rounded-lg focus:bg-white focus:border-gray-200 focus:outline-none"
            placeholder="Search donors, donees, vouchers..."
          />
        </div>
      </div>
      <button className="relative p-2 rounded-lg hover:bg-gray-50 text-gray-500">
        <Bell className="w-4.5 h-4.5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
      </button>
      <div className="h-6 w-px bg-gray-200" />
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-semibold">
          {session?.name?.charAt(0).toUpperCase() ?? <User className="w-4 h-4" />}
        </div>
        <div className="text-sm leading-tight">
          <div className="font-medium">{session?.name ?? "Guest"}</div>
          <div className="text-xs text-gray-500">{session?.roleName ?? "Member"}</div>
        </div>
      </div>
    </header>
  );
}
