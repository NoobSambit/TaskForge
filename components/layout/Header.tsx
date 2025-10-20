import Link from "next/link";

export default function Header() {
  return (
    <header className="h-16 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-semibold">A</span>
          <span className="text-lg font-semibold">App</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <Link href="/settings" className="hover:text-foreground">Settings</Link>
        </nav>
      </div>
    </header>
  );
}
