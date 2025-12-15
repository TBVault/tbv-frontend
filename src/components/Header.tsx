"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import AuthButton from "@/components/AuthButton";
import Logo from "@/components/Logo";

export default function Header() {
  const { data: session } = useSession();

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Logo size={40} />
            <h2 className="text-lg font-semibold text-neutral-800">The Bhakti Vault</h2>
          </Link>
          {session && (
            <>
              <Link href="/transcripts" className="text-foreground-secondary hover:text-foreground transition-colors font-medium">
                Transcripts
              </Link>
              <Link href="/chat" className="text-foreground-secondary hover:text-foreground transition-colors font-medium">
                Chat
              </Link>
            </>
          )}
        </div>
        <AuthButton />
      </div>
    </div>
  );
}

