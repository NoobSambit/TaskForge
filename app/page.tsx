import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome</h1>
          <p className="mt-2 text-muted-foreground">
            Next.js 15 + TypeScript + TailwindCSS v4 + ShadCN/UI scaffold is ready.
          </p>
        </div>
        <div>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90"
          >
            Get started
          </a>
        </div>
      </div>
    </main>
  );
}
