
import { Skeleton, SkeletonTranscriptCard } from '@/components/Skeleton';

export default function TranscriptsLoadingSkeleton() {
  return (
    <>
      <div className="sticky top-0 z-35 bg-background flex items-center gap-3 px-4 py-3 border-b border-border min-h-[56px] lg:hidden">
        <div className="w-6 h-6 rounded bg-foreground-muted/10 animate-pulse" />
        <Skeleton className="h-6 w-32" />
      </div>

      <div className="min-h-screen py-8 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="hidden lg:block text-3xl font-bold text-foreground mb-2">Transcripts</h1>
              <p className="text-foreground-secondary">Browse H.G. Vaiśeṣika Dāsa&apos;s lectures and talks</p>
            </div>
            <div className="hidden min-[750px]:flex items-center gap-1 bg-background-elevated border border-border rounded-lg p-1">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          </div>
          
          {/* Search bar skeleton */}
          <Skeleton className="w-full h-12 rounded-xl" />
        </div>

        {/* Transcript cards skeleton */}
        <div className="space-y-3 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonTranscriptCard key={i} variant="row" />
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
