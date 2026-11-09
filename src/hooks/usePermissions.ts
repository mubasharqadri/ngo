"use client";

import { useQuery } from "@tanstack/react-query";
import { can as canFn } from "@/lib/permissions";

export type MeData = {
  user: { id: number; name: string; email: string };
  roleName: string | null;
  permissions: string[];
};

export function useMe() {
  return useQuery<MeData>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) throw new Error("Unauthorized");
      return (await res.json()).data as MeData;
    },
    staleTime: 60_000,
    retry: false,
  });
}

/** Permission hook for client-side UI gating. */
export function usePermissions() {
  const { data, isLoading } = useMe();
  return {
    me: data,
    loading: isLoading,
    can: (module: string, action: string) => canFn(data?.permissions, module, action),
  };
}
