import NextAuth from "next-auth";
import type { NextAuthConfig, Session } from "next-auth";
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
          access_type: "offline", // Request refresh token from Google
          prompt: "consent", // Force consent to ensure we get refresh token
          // Note: Google only provides refresh token on first consent or when prompt=consent
        },
      },
      checks: ["pkce", "state"]
    } as const,
  ],
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
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
    async jwt({ token, account }) {
      // Persist tokens when account is available (on sign-in)
      if (account && account.id_token) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000; // Default to 1 hour if not provided

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

      // Check if token needs to be refreshed (expires in less than 5 minutes OR already expired)
      const expiresAt = token.expiresAt as number | undefined;
      const refreshThreshold = 5 * 60 * 1000; // 5 minutes - refresh tokens when they expire in less than 5 minutes
      const shouldRefresh = token.refreshToken && expiresAt && Date.now() >= expiresAt - refreshThreshold;

      if (shouldRefresh && token.refreshToken) {
        try {
          // Refresh the token using the refresh token
          const issuer = process.env.OIDC_ISSUER || "https://accounts.google.com";
          
          // Get token endpoint from discovery document
          const discoveryUrl = issuer.endsWith('/') 
            ? `${issuer}.well-known/openid-configuration`
            : `${issuer}/.well-known/openid-configuration`;
          
          const discoveryResponse = await fetch(discoveryUrl);
          if (!discoveryResponse.ok) {
            throw new Error("Failed to fetch discovery document");
          }
          
          const discovery = await discoveryResponse.json();
          const tokenUrl = discovery.token_endpoint;

          if (!tokenUrl) {
            throw new Error("Token endpoint not found in discovery document");
          }

          const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: process.env.OIDC_CLIENT_ID!,
              client_secret: process.env.OIDC_CLIENT_SECRET!,
              grant_type: "refresh_token",
              refresh_token: token.refreshToken as string,
            }),
          });

          if (response.ok) {
            const refreshedTokens = await response.json();
            
            // Update tokens
            token.accessToken = refreshedTokens.access_token;
            token.idToken = refreshedTokens.id_token;
            token.expiresAt = Date.now() + (refreshedTokens.expires_in || 3600) * 1000;
            
            // Update refresh token if a new one is provided
            if (refreshedTokens.refresh_token) {
              token.refreshToken = refreshedTokens.refresh_token;
            }

            // Re-authenticate with backend using new token
            try {
              const loginResponse = await loginAuthLoginPost({
                headers: {
                  Authorization: `${refreshedTokens.id_token}`,
                },
              });

              if (
                loginResponse.data?.success === true &&
                loginResponse.data.user &&
                loginResponse.data.user !== null
              ) {
                token.user = loginResponse.data.user;
              }
            } catch (error) {
              console.error("Error re-authenticating with backend after token refresh:", error);
            }
          } else {
            const errorText = await response.text();
            console.error("Failed to refresh token:", errorText);
            // Token refresh failed - user will need to sign in again
            return { ...token, error: "RefreshAccessTokenError" };
          }
        } catch (error) {
          console.error("Error refreshing token:", error);
          return { ...token, error: "RefreshAccessTokenError" };
        }
      }

      // Include user picture if available from account (initial sign-in)
      if (account?.picture && typeof account.picture === 'string') {
        token.picture = account.picture;
      }
      
      // Return existing tokens if account is not available (subsequent requests)
      return token;
    },
    async session({ session, token }) {
      // If token refresh failed, invalidate the session
      if (token.error === "RefreshAccessTokenError") {
        return null as unknown as Session;
      }

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
          return null as unknown as Session;
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

