import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./db";

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    // Providers will read credentials from environment variables.
    // For v5, use AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET and AUTH_GITHUB_ID/AUTH_GITHUB_SECRET
    Google,
    GitHub,
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
      if (session?.user && user?.id) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
export const authOptions = authConfig;
