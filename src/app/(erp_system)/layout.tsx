import { TopNav } from "@/components/layout/TopNav";
import { Sidebar } from "@/components/layout/sidebar";
import { ErpClientShell } from "./ErpClientShell";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ErpClientShell />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
