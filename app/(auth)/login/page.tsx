import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignInButton from "./sign-in-button";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="w-full">
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to your account</h1>
          <p className="text-muted-foreground">Choose a provider to continue</p>
        </div>

        <div className="space-y-3">
          <SignInButton provider="google">Continue with Google</SignInButton>
          <SignInButton provider="github" className="inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90">
            Continue with GitHub
          </SignInButton>
        </div>
      </div>
    </main>
  );
}
