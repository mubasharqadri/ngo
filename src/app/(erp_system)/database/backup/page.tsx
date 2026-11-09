"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, Badge, LoadingTable, DataTable } from "@/components/ui/Breadcrumbs";
import { Database, Download } from "lucide-react";

function PageInner() {
  const { data, isLoading } = useQuery({
    queryKey: ["backup"],
    queryFn: async () => {
      const res = await fetch("/api/database/backup", { credentials: "include" });
      return (await res.json()).data;
    },
  });
  return (
    <div>
      <PageHeader title="Database Backup" subtitle="View and export database tables" actions={<button className="btn btn-primary" onClick={() => alert("Backup exported (demo)")}><Download className="w-4 h-4" /> Export SQL</button>} />
      {isLoading && <LoadingTable rows={6} cols={2} />}
      {data && (
        <DataTable
          columns={[
            { key: "table", label: "Table", render: (r) => <span className="flex items-center gap-2"><Database className="w-3.5 h-3.5 text-emerald-600" />{(r as any).table}</span> },
            { key: "rows", label: "Rows", render: (r) => <Badge>{(r as any).rows}</Badge> },
          ]}
          rows={data}
        />
      )}
    </div>
  );
}

import { RequireAccess } from "@/components/RequireAccess";
export default function Page() {
  return (
    <RequireAccess module="database.backup">
      <PageInner />
    </RequireAccess>
  );
}
