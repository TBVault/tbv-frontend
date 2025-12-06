import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [
    {
      id: "oidc",
      name: "OpenID Connect",
      type: "oidc",
      issuer: process.env.OIDC_ISSUER,
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
      checks: ["pkce", "state"],
    } as any,
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist tokens when account is available (on sign-in)
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
      }
      // Return existing tokens if account is not available (subsequent requests)
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Always include tokens from the JWT token
        session.accessToken = token.accessToken as string;
        session.idToken = token.idToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

