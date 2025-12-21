"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      router.push("/");
    }
  }, [status, session, router]);

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return {
          title: "Access Denied",
          message: "Your Google account was authenticated successfully, but you are not authorized to access The Bhakti Vault.",
          details: "This platform is restricted to H.G. Vaiśeṣika Dāsa's team members only.",
        };
      case "AccessDenied":
        return {
          title: "Access Denied",
          message: "You do not have permission to access this application.",
          details: "This platform is restricted to authorized team members only.",
        };
      case "Verification":
        return {
          title: "Verification Error",
          message: "The verification token has expired or has already been used.",
          details: "Please try signing in again.",
        };
      default:
        return {
          title: "Authentication Error",
          message: "An error occurred during authentication.",
          details: "Please try again or contact your administrator if the problem persists.",
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen-mobile flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-error-500/20 mb-6">
            <svg className="w-10 h-10 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-3">
            {errorInfo.title}
          </h1>
        </div>

        <div className="bg-background-elevated rounded-xl border border-border p-8">
          <p className="text-foreground-secondary mb-4">
            {errorInfo.message}
          </p>
          
          <p className="text-sm text-foreground-tertiary mb-6">
            {errorInfo.details}
          </p>

          {session?.user?.email && (
            <div className="bg-foreground-muted/10 rounded-lg p-4 mb-6">
              <p className="text-xs text-foreground-tertiary mb-1">
                Attempted with:
              </p>
              <p className="text-sm font-mono text-foreground">
                {session.user.email}
              </p>
            </div>
          )}

          <div className="pt-6 border-t border-border">
            <p className="text-sm font-semibold text-foreground mb-2">
              To request access:
            </p>
            <p className="text-sm text-foreground-secondary mb-6">
              Please contact your administrator with your email address to be added to the authorized team members list.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => signIn("oidc", { callbackUrl: "/" })}
              className="flex-1 border border-border bg-background-elevated hover:bg-sidebar-hover text-foreground font-medium py-2.5 px-3 rounded-xl transition-colors"
            >
              Try Different Account
            </button>
            <Link
              href="/"
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-3 rounded-xl transition-colors text-center"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen-mobile flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-background-elevated rounded-xl border border-border p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-foreground-muted/20 rounded mb-4"></div>
            <div className="h-4 bg-foreground-muted/20 rounded mb-6"></div>
            <div className="h-10 bg-foreground-muted/20 rounded w-24"></div>
          </div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
