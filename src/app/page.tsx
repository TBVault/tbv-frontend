import { auth, signIn } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import { transcriptsProtectedTranscriptsGet, chatSessionsProtectedChatSessionsGet } from "@/api/generated/endpoints/default/default";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default async function Home() {
  const session = await auth();
  let totalTranscripts = 0;
  let totalChats = 0;

  // Fetch stats if logged in
  if (session?.idToken) {
    try {
      const [transcriptResponse, chatResponse] = await Promise.all([
        transcriptsProtectedTranscriptsGet(
          { page_number: 1 },
          {
            headers: {
              Authorization: session.idToken.trim(),
            },
            next: {
              revalidate: 60,
              tags: ['transcripts', 'home'],
            },
          }
        ),
        chatSessionsProtectedChatSessionsGet({
          headers: {
            Authorization: session.idToken.trim(),
          },
          next: {
            revalidate: 10,
            tags: ['chat-sessions'],
          },
        }),
      ]);
      
      if (transcriptResponse.status === 200) {
        totalTranscripts = transcriptResponse.data.total_count;
      }
      if (chatResponse.status === 200) {
        totalChats = chatResponse.data.length;
      }
    } catch {
      console.log('Unable to fetch stats - session may have expired');
    }
  }

  if (!session) {
    // Not logged in - show welcoming landing page
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 mb-6 shadow-lg shadow-primary-500/20">
              <Logo size={48} />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              The Bhakti Vault
            </h1>
            <p className="text-lg text-foreground-secondary mb-2">
              H.G. Vaiśeṣika Dāsa&apos;s Lecture Archive
            </p>
            <p className="text-sm text-foreground-tertiary">
              A Private Collection for Team Members
            </p>
          </div>

          <div className="bg-background-elevated rounded-2xl border border-border p-8">
            <p className="text-foreground-secondary text-center mb-6">
              This platform contains transcripts of lectures, talks, and seminars, accessible to authorized team members only.
            </p>
            
            <form action={async () => {
              "use server";
              await signIn("oidc");
            }}>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
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
      </div>
    );
  }

  // Logged in - show profile/dashboard
  const userName = session.user?.name || 'Friend';
  const userEmail = session.user?.email;
  const userRole = session.user?.role || 'Member';
  const userImage = session.user?.image;

  return (
    <div className="min-h-screen py-8 px-6 lg:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-background-elevated rounded-2xl border border-border p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-2xl border-2 border-primary-500/30"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-3xl font-bold text-white">
                  {userName[0]?.toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 px-2.5 py-1 bg-background-elevated border border-border rounded-full">
                <span className="text-xs font-medium text-primary-400 capitalize">{userRole}</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {userName}
              </h1>
              {userEmail && (
                <p className="text-foreground-secondary mb-4">{userEmail}</p>
              )}
              <p className="text-foreground-tertiary text-sm">
                Welcome to The Bhakti Vault — your portal to H.G. Vaiśeṣika Dāsa&apos;s wisdom.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-background-elevated rounded-xl border border-border p-6 hover:border-primary-500/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-foreground-tertiary">Total Transcripts</p>
                <p className="text-3xl font-bold text-foreground">{totalTranscripts.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-background-elevated rounded-xl border border-border p-6 hover:border-secondary-500/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-foreground-tertiary">Your Conversations</p>
                <p className="text-3xl font-bold text-foreground">{totalChats.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-background-elevated rounded-2xl border border-border p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Appearance
          </h2>
          <p className="text-foreground-secondary text-sm mb-4">
            Choose your preferred theme for the application.
          </p>
          <ThemeToggle />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/chat"
            className="group bg-gradient-to-br from-primary-600/20 to-primary-700/10 hover:from-primary-600/30 hover:to-primary-700/20 border border-primary-500/20 hover:border-primary-500/40 rounded-xl p-6 transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary-400 transition-colors">
                Start New Chat
              </h3>
            </div>
            <p className="text-foreground-secondary text-sm">
              Ask questions about the lectures and get AI-powered insights with direct citations.
            </p>
          </Link>

          <Link
            href="/transcripts"
            className="group bg-gradient-to-br from-secondary-600/20 to-secondary-700/10 hover:from-secondary-600/30 hover:to-secondary-700/20 border border-secondary-500/20 hover:border-secondary-500/40 rounded-xl p-6 transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-secondary-400 transition-colors">
                Browse Transcripts
              </h3>
            </div>
            <p className="text-foreground-secondary text-sm">
              Explore the complete archive with search and filtering capabilities.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
