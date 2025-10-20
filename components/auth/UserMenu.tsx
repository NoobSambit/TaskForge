"use client";

import Link from "next/link";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "./actions";

const itemClasses =
  "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export default function UserMenu({ user }: { user?: User | null }) {
  const initials =
    (user?.name ?? user?.email ?? "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
        {user?.image ? (
          <Image
            src={user.image}
            alt={user?.name ?? user?.email ?? "User"}
            width={24}
            height={24}
            className="rounded-full"
          />
        ) : (
          <span className="inline-flex h-6 w-6 select-none items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {initials}
          </span>
        )}
        <span className="max-w-[140px] truncate">{user?.name ?? user?.email ?? "Account"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuLabel className="max-w-[220px] truncate">
          {user?.name ?? user?.email ?? "User"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/settings" className={itemClasses}>
          Profile
        </Link>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <button type="submit" className={itemClasses}>
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
