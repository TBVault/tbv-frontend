import { Suspense } from 'react';
import type { Metadata } from 'next';
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { transcriptsProtectedTranscriptsGet } from '@/api/generated/endpoints/default/default';
import TranscriptsView from '@/components/TranscriptsView';

export const metadata: Metadata = {
  title: "Transcripts | The Bhakti Vault",
};

interface PageProps {
  searchParams: Promise<{ p?: string }>;
}

async function TranscriptsContent({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;
  const page = parseInt(params.p || '1', 10);

  // Show gated page if not logged in
  if (!session?.idToken) {
    return (
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary flex items-center justify-center px-6 py-20" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 mb-6">
            <svg className="w-10 h-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Transcripts Library
          </h1>
          
          <p className="text-foreground-secondary mb-8">
            This content is available to authorized team members only.
          </p>
          
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
            Don't have access? Please contact an administrator.
          </p>
        </div>
      </main>
    );
  }

  // Fetch transcripts on the server
  try {
    const response = await transcriptsProtectedTranscriptsGet(
      {
        page_number: page,
      },
      {
        headers: {
          Authorization: session.idToken.trim(),
        },
        next: {
          revalidate: 300, // Cache for 5 minutes
          tags: ['transcripts'],
        },
      }
    );
    
    if (response.status === 200) {
      return (
        <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
          <div className="max-w-5xl mx-auto px-6 py-10">
            <TranscriptsView 
              transcripts={response.data.transcripts}
              currentPage={page}
              totalPages={response.data.page_count}
            />
          </div>
        </main>
      );
    }
    
    throw new Error('Failed to fetch transcripts');
  } catch (error: any) {
    // Check if it's an authentication error
    if (error?.status === 401 || error?.status === 403 || error?.message?.includes('401') || error?.message?.includes('403')) {
      redirect('/auth/error');
    }
    
    // Show error UI
    return (
      <main className="bg-gradient-to-br from-background-secondary via-background to-background-secondary" style={{ minHeight: 'calc(100vh - var(--header-height))' }}>
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse H.G. Vaisesika Dasa's lectures and talks</p>
          </div>
          <div className="bg-error-50 border-l-4 border-error-500 rounded-r-xl p-6 shadow-sm">
            <h3 className="font-semibold text-error-900 mb-1">Error Loading Transcripts</h3>
            <p className="text-error-800">{error.message || 'An unexpected error occurred'}</p>
          </div>
        </div>
      </main>
    );
  }
}

export default function TranscriptsPage(props: PageProps) {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-background-secondary via-background to-background-secondary">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse and explore all available transcripts</p>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-neutral-200 border-t-primary-600"></div>
          </div>
        </div>
      </main>
    }>
      <TranscriptsContent searchParams={props.searchParams} />
    </Suspense>
  );
}



