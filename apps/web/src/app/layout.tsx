import type { Metadata } from "next";
import QueryProvider from "@/components/providers/QueryProvider";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetVigil — AI-Driven Multi-Vendor Network Compliance Auditor",
  description: "Deterministic compliance audit engine for heterogeneous network architectures (NTRO - SIH26155)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
