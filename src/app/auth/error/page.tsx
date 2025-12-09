"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return {
          title: "Account Not Found",
          message: "Your account was not found in the system. Please contact an administrator to create your account.",
        };
      case "AccessDenied":
        return {
          title: "Access Denied",
          message: "You do not have permission to access this application.",
        };
      case "Verification":
        return {
          title: "Verification Error",
          message: "The verification token has expired or has already been used.",
        };
      default:
        return {
          title: "Authentication Error",
          message: "An error occurred during authentication. Please try again.",
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div 
      className="flex items-center justify-center p-8"
      style={{ height: 'calc(100vh - var(--header-height))' }}
    >
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{errorInfo.title}</h1>
        <p className="mb-6 text-gray-600">{errorInfo.message}</p>
        <div>
          <Link
            href="/"
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div 
        className="flex items-center justify-center p-8"
        style={{ height: 'calc(100vh - var(--header-height))' }}
      >
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-6"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}

