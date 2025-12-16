import { signIn } from '@/auth';
import Link from 'next/link';

interface GatedPageProps {
  title: string;
  description: string;
  showSignInButton?: boolean;
}

export default function GatedPage({ title, description, showSignInButton = true }: GatedPageProps) {
  return (
    <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary flex items-center justify-center px-6 py-20" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 mb-6">
          <svg className="w-10 h-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3">{title}</h1>
        <p className="text-foreground-secondary mb-8">{description}</p>

        {showSignInButton && (
          <>
            <div className="bg-background rounded-xl border border-border p-8 shadow-lg mb-6">
              <form action={async () => {
                "use server";
                await signIn("oidc");
              }}>
                <button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  Sign In to Access
                </button>
              </form>
            </div>

            <p className="text-sm text-foreground-tertiary">
              Don&apos;t have access? Contact your administrator.
            </p>
          </>
        )}

        {!showSignInButton && (
          <div className="bg-background rounded-xl border border-border p-8 shadow-lg mb-6">
            <Link
              href="/"
              className="block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg text-center"
            >
              Sign In to Continue
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

