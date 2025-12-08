"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (status === "loading") {
    return (
      <div className="w-10 h-10 rounded-full bg-neutral-200 animate-pulse"></div>
    );
  }

  if (session?.user) {
    const userImage = session.user.image || session.user.email?.[0].toUpperCase();
    const userName = session.user.name || session.user.email;

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full"
          aria-label="User menu"
        >
          {session.user.image && !imageError ? (
            <img
              src={session.user.image}
              alt={userName || "User"}
              className="w-10 h-10 rounded-full border-2 border-border hover:border-primary-500 transition-colors"
              onError={() => setImageError(true)}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold text-base border-2 border-border hover:border-primary-500 transition-colors">
              {userImage}
            </div>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-background rounded-lg shadow-lg border border-border py-1 z-50">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">{userName}</p>
              {session.user.email && (
                <p className="text-xs text-foreground-tertiary mt-1">{session.user.email}</p>
              )}
            </div>
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-foreground-secondary hover:bg-background-secondary transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("oidc")}
      className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg transition-colors"
    >
      Sign in
    </button>
  );
}

