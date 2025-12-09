import { auth, signIn } from "@/auth";
import Link from "next/link";
import { transcriptsProtectedTranscriptsGet } from "@/api/generated/endpoints/default/default";
import type { Transcript } from "@/api/generated/schemas";
import Logo from "@/components/Logo";
import formatTime from "@/utils/formatTime";

export default async function Home() {
  const session = await auth();
  let recentTranscripts: Transcript[] = [];
  let totalCount = 0;

  // Fetch recent transcripts if logged in
  if (session?.idToken) {
    try {
      const response = await transcriptsProtectedTranscriptsGet(
        { page_number: 1 },
        {
          headers: {
            Authorization: session.idToken.trim(),
          },
        }
      );
      
      if (response.status === 200) {
        recentTranscripts = response.data.transcripts.slice(0, 3);
        totalCount = response.data.total_count;
      }
    } catch (error: any) {
      // Silently handle token expiration - user will be prompted to re-auth when they navigate
      console.log('Unable to fetch transcripts - session may have expired');
    }
  }

  if (!session) {
    // Not logged in - show welcoming but gated page
    return (
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary flex items-center justify-center px-6 py-20" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 mb-6 shadow-lg p-3">
              <Logo size={56} />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              The Bhakti Vault
            </h1>
            <p className="text-lg text-foreground-secondary mb-2">
              H.G. Vaisesika Dasa's Lecture Archive
            </p>
            <p className="text-sm text-foreground-tertiary">
              A Private Collection for Team Members
            </p>
          </div>

          <div className="bg-background rounded-2xl border border-border p-8 shadow-xl">
            <p className="text-foreground-secondary text-center mb-6">
              This platform contains transcripts of lectures, talks, and seminars, accessible to authorized team members only.
            </p>
            
            <form action={async () => {
              "use server";
              await signIn("oidc");
            }}>
              <button
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Sign In with Google
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-foreground-tertiary text-center">
                Need access?
              </p>
              <p className="text-sm text-foreground-secondary text-center mt-1">
                Contact your administrator to request membership.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Logged in - show dashboard
  return (
    <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome back {session.user?.name || 'Friend'}
          </h1>
          <p className="text-foreground-secondary">
            Access H.G. Vaisesika Dasa's collection of lectures and talks
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-foreground-tertiary">Total Transcripts</p>
                <p className="text-3xl font-bold text-foreground">{totalCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-foreground-tertiary">Your Access Level</p>
                <p className="text-xl font-semibold text-foreground capitalize">{session.user?.role || 'Member'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transcripts or Session Expiry Notice */}
        {recentTranscripts.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Recently Added</h2>
              <Link 
                href="/transcripts"
                className="text-primary-600 hover:text-primary-700 font-medium transition-colors flex items-center gap-1"
              >
                View All
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentTranscripts.map((transcript) => (
                <Link
                  key={transcript.public_id}
                  href={`/transcript/${transcript.public_id}`}
                  className="bg-background rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary-500 transition-all duration-200 flex flex-col"
                >
                  <h3 className="font-bold text-foreground mb-3 line-clamp-2">
                    {transcript.title}
                  </h3>
                  
                  {transcript.summary && (
                    <p className="text-sm text-foreground-secondary mb-4 line-clamp-3 flex-grow">
                      {transcript.summary}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border">
                    <div className="px-2 py-1 bg-neutral-200 text-foreground rounded-full text-xs font-medium">
                      {formatTime(transcript.duration)}
                    </div>
                    <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                      {transcript.source === 'otterai' ? 'OtterAI' : transcript.source.charAt(0).toUpperCase() + transcript.source.slice(1)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : session?.idToken && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Session Expired</h3>
                <p className="text-sm text-foreground-secondary mb-3">
                  Your session has expired. Please sign in again to view transcripts.
                </p>
                <form action={async () => {
                  "use server";
                  await signIn("oidc");
                }}>
                  <button
                    type="submit"
                    className="text-sm bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Sign In Again
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Browse All CTA */}
        <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-xl border border-primary-200 p-8 text-center">
          <h3 className="text-xl font-bold text-foreground mb-2">
            Explore the Complete Archive
          </h3>
          <p className="text-foreground-secondary mb-6">
            Browse all transcripts with advanced search and filtering
          </p>
          <Link
            href="/transcripts"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Browse All Transcripts
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
