"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AuthButton from "@/components/AuthButton";
import Logo from "@/components/Logo";

export default function Header() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside or pressing escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Don't close if clicking the hamburger button
        if (!target.closest('button[aria-label="Toggle menu"]')) {
          setIsMobileMenuOpen(false);
        }
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-2 md:px-6 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-6">
          <Link href="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
            <Logo size={32} className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0" />
            <h2 className="text-sm min-[600px]:text-base md:text-lg font-semibold text-neutral-800">The Bhakti Vault</h2>
          </Link>
          {session && (
            <>
              <Link href="/transcripts" className="hidden min-[530px]:inline text-foreground-secondary hover:text-foreground transition-colors font-medium text-sm min-[600px]:text-base">
                Transcripts
              </Link>
              <Link href="/chat" className="hidden min-[530px]:inline text-foreground-secondary hover:text-foreground transition-colors font-medium text-sm min-[600px]:text-base">
                Chat
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="min-[530px]:hidden p-2 hover:bg-background-secondary rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className="w-5 h-5 text-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          )}
          <AuthButton />
        </div>
      </div>

      {/* Mobile Menu */}
      {session && (
        <div
          ref={menuRef}
          className={`absolute top-full left-0 right-0 bg-background border-b border-border shadow-sm min-[530px]:hidden z-30 overflow-hidden transition-all duration-200 ease-in-out ${
            isMobileMenuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-1">
            <Link
              href="/transcripts"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-foreground-secondary hover:text-foreground transition-colors font-medium py-2 px-2 rounded-md hover:bg-background-secondary"
            >
              Transcripts
            </Link>
            <Link
              href="/chat"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-foreground-secondary hover:text-foreground transition-colors font-medium py-2 px-2 rounded-md hover:bg-background-secondary"
            >
              Chat
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

