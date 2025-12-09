import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { loginAuthLoginPost } from "@/api/generated/endpoints/default/default";
import type { User } from "@/api/generated/schemas";

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
    async signIn({ account }) {
      // Verify user exists in backend before allowing sign-in
      if (account && account.id_token) {
        try {
          const loginResponse = await loginAuthLoginPost({
            headers: {
              Authorization: `${account.id_token}`,
            },
          });

          // Only allow sign-in if login was successful and user data exists
          const isAuthorized = !!(
            loginResponse.data?.success === true &&
            loginResponse.data.user &&
            loginResponse.data.user !== null
          );

          // If authorized, allow sign-in and redirect to home
          // If not authorized, reject and user will see error page
          return isAuthorized;
        } catch (error) {
          // Reject sign-in if login endpoint fails
          console.error("Login endpoint error:", error);
          return false;
        }
      }
      // Reject sign-in if no account
      return false;
    },
    async jwt({ token, account, user }) {
      // Persist tokens when account is available (on sign-in)
      if (account && account.id_token) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;

        // Call the login endpoint with the OIDC token to get user information
        // This is safe to do here because signIn callback already verified the user exists
        try {
          const loginResponse = await loginAuthLoginPost({
            headers: {
              Authorization: `${account.id_token}`,
            },
          });

          // Store user information if login was successful and user exists
          if (
            loginResponse.data?.success === true &&
            loginResponse.data.user &&
            loginResponse.data.user !== null
          ) {
            token.user = loginResponse.data.user;
          }
        } catch (error) {
          // This shouldn't happen since signIn already verified
          // But log error just in case
          console.error("Unexpected login endpoint error in JWT callback:", error);
        }
      }
      // Include user picture if available
      if (user?.image) {
        token.picture = user.image;
      }
      // Return existing tokens if account is not available (subsequent requests)
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Always include tokens from the JWT token
        session.accessToken = token.accessToken as string;
        session.idToken = token.idToken as string;
        // Include user information from login response
        // If user data is not available, invalidate the session
        // This handles cases where the session was created before we added the login requirement
        if (token.user) {
          session.user = {
            ...session.user,
            id: String((token.user as User).id),
            name: (token.user as User).name,
            email: (token.user as User).email,
            role: (token.user as User).role,
          };
        } else {
          // User data not found - invalidate session by returning null
          // This will require the user to sign in again
          return null as any;
        }
        // Ensure user image is included from token
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
  pages: {
    error: "/auth/error",
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

