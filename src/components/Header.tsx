import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function Header() {
  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-2 h-8 bg-gradient-to-b from-primary-500 to-secondary-600 rounded-full"></div>
            <h2 className="text-lg font-semibold text-neutral-800">The Bhakti Vault</h2>
          </Link>
          <Link href="/transcripts" className="text-foreground-secondary hover:text-foreground transition-colors font-medium">
            Transcripts
          </Link>
        </div>
        <AuthButton />
      </div>
    </div>
  );
}

