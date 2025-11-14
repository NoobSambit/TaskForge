"use client";

import React, { useState } from "react";
import { GamificationHeader } from "@/components/gamification";
import { SyncIndicator } from "@/components/sync";
import { MobileNav, MobileNavButton } from "@/components/layout/MobileNav";
import type { Session } from "next-auth";

interface HeaderClientProps {
  session: Session | null;
}

export function HeaderClient({ session }: HeaderClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <MobileNavButton 
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-semibold">A</span>
            <span className="text-lg font-semibold">App</span>
          </div>
          <div className="flex items-center gap-3">
            <GamificationHeader />
            <SyncIndicator />
            <UserMenu user={session?.user as any} />
          </div>
        </div>
      </header>
      
      <MobileNav 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}

// Import UserMenu dynamically to avoid SSR issues
import dynamic from "next/dynamic";

const UserMenu = dynamic(() => import("@/components/auth/UserMenu"), {
  ssr: false,
});