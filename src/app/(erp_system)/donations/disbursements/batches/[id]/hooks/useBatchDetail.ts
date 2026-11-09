import { useQuery } from "@tanstack/react-query";
export function useBatchDetail(id: string) {
  return useQuery({
    queryKey: ["batch", id],
    queryFn: async () => {
      const res = await fetch(`/api/donations/disbursements/batches/${id}`, { credentials: "include" });
      const j = await res.json();
      return j.data;
    },
  });
}
