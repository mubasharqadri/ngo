import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Shauoor Welfare Society",
  description: "NGO management system for Shauoor Welfare Society — donations, HR, accounting and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
