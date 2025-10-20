import { signIn } from "@/lib/auth";
import type { ReactNode } from "react";

async function signInAction(formData: FormData) {
  "use server";
  const provider = formData.get("provider");
  if (typeof provider === "string" && provider.length > 0) {
    await signIn(provider, { redirectTo: "/dashboard" });
  }
}

export default function SignInButton({
  provider,
  children,
  className,
}: {
  provider: "google" | "github";
  children: ReactNode;
  className?: string;
}) {
  return (
    <form action={signInAction}>
      <input type="hidden" name="provider" value={provider} />
      <button
        type="submit"
        className={
          className ??
          "inline-flex w-full items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90"
        }
      >
        {children}
      </button>
    </form>
  );
}
