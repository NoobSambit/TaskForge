import { auth } from "@/lib/auth";
import UserMenu from "@/components/auth/UserMenu";
import { SyncIndicator } from "@/components/sync";

export default async function Header() {
  const session = await auth();

  return (
    <header className="h-16 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-semibold">A</span>
          <span className="text-lg font-semibold">App</span>
        </div>
        <div className="flex items-center gap-3">
          <SyncIndicator />
          <UserMenu user={session?.user as any} />
        </div>
      </div>
    </header>
  );
}
