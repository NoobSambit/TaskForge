import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import { HeaderClient } from "@/components/layout/HeaderClient";
import { OfflineSyncProvider } from "@/components/providers/OfflineSyncProvider";
import { GamificationProvider } from "@/components/providers/GamificationProvider";
import { OfflineBanner, ConflictResolver, InstallPrompt } from "@/components/sync";
import { SyncRetryBanner } from "@/components/sync/SyncRetryBanner";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <OfflineSyncProvider>
      <GamificationProvider>
        <div className="min-h-screen">
          <OfflineBanner />
          <SyncRetryBanner />
          <HeaderClient session={session} />
          <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
            <Sidebar />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <ConflictResolver />
          <InstallPrompt />
        </div>
      </GamificationProvider>
    </OfflineSyncProvider>
  );
}
