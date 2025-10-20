import { signOut } from "@/lib/auth";

export async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}
