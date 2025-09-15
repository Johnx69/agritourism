import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./lib/prisma";
import bcrypt from "bcryptjs";
import { logActivity } from "./lib/activity";
import { getServerSession } from "next-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {}, // using App Router
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = (creds?.email || "").toString().toLowerCase().trim();
        const password = (creds?.password || "").toString();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || user.deletedAt) {
          throw new Error("CredentialsSignin");
        }
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) throw new Error("CredentialsSignin");
        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role } as unknown as NextAuthUser;
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET! })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const db = await prisma.user.findUnique({ where: { id: (user as any).id } });
        token.id = db?.id;
        token.role = db?.role || "VISITOR";
        token.deletedAt = db?.deletedAt?.toISOString() || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).deletedAt = token.deletedAt;
      }
      return session;
    },
    async signIn({ user }) {
      await logActivity({ userId: (user as any)?.id, action: "AUTH_SIGN_IN" });
      return true;
    },
  },
  events: {
    async signOut({ token }) {
      await logActivity({ userId: (token as any)?.id || null, action: "AUTH_SIGN_OUT" });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function auth() {
  return getServerSession(authOptions);
}
