// Stub module declarations to allow type-checking without installed packages

declare module "next-auth" {
  export type NextAuthConfig = any;
  const NextAuth: any;
  export default NextAuth;
}

declare module "next-auth/providers/google" {
  const Google: any;
  export default Google;
}

declare module "next-auth/providers/github" {
  const GitHub: any;
  export default GitHub;
}

declare module "@auth/mongodb-adapter" {
  export const MongoDBAdapter: any;
}

declare module "mongoose" {
  const mongoose: any;
  export default mongoose;
}

declare module "mongodb" {
  export class MongoClient {
    constructor(uri: string, options?: any);
    connect(): Promise<MongoClient>;
  }
}
