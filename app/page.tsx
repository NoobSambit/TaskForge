import { redirect } from "next/navigation";

async function isAuthenticated() {
  return false;
}

export default async function HomePage() {
  const loggedIn = await isAuthenticated();
  if (loggedIn) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome</h1>
        <p className="mt-2 text-muted-foreground">
          Next.js 15 + TypeScript + TailwindCSS v4 + ShadCN/UI scaffold is ready.
        </p>
      </div>
    </main>
  );
}
