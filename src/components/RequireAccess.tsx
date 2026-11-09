"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { ShieldOff } from "lucide-react";
import Link from "next/link";

/**
 * Client-side page access guard. Hides children unless the user has
 * "view" permission for the given module.
 */
export function RequireAccess({ module, children }: { module: string; children: React.ReactNode }) {
  const { can, loading } = usePermissions();
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }
  if (!can(module, "view")) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto mt-10">
        <ShieldOff className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold mb-1">Access restricted</h2>
        <p className="text-sm text-gray-500 mb-5">
          Your role does not have permission to open this page. Please contact your administrator to request access.
        </p>
        <Link href="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }
  return <>{children}</>;
}
