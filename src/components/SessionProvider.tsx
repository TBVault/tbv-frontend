"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

// Component to handle proactive token refresh
function TokenRefreshHandler() {
  const { data: session, update } = useSession();

  useEffect(() => {
    if (!session?.idToken) return;

    // Refresh session every 50 minutes to keep token fresh
    // (tokens expire after 1 hour, so refresh before expiration)
    const refreshInterval = setInterval(async () => {
      try {
        // Trigger session update, which will call JWT callback and refresh token if needed
        await update();
      } catch (error) {
        console.error("Error refreshing session:", error);
      }
    }, 50 * 60 * 1000); // 50 minutes

    // Also refresh when page becomes visible again (user returns from another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        update();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session, update]);

  return null;
}

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextAuthSessionProvider>
      <TokenRefreshHandler />
      {children}
    </NextAuthSessionProvider>
  );
}

