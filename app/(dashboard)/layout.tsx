import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { OfflineSyncProvider } from "@/components/providers/OfflineSyncProvider";
import { OfflineBanner, ConflictResolver, InstallPrompt } from "@/components/sync";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <OfflineSyncProvider>
      <div className="min-h-screen">
        <OfflineBanner />
        <Header />
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
          <Sidebar />
          <main className="flex-1">
            {children}
          </main>
        </div>
        <ConflictResolver />
        <InstallPrompt />
      </div>
    </OfflineSyncProvider>
  );
}
