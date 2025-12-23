import { Skeleton, SkeletonText } from '@/components/Skeleton';

export default function TranscriptLoading() {
  return (
    <div className="min-h-screen py-8 px-6 lg:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="mb-10">
          {/* Title */}
          <Skeleton className="h-10 w-3/4 mb-6" />
          
          {/* Subtitle (original title) */}
          <Skeleton className="h-5 w-1/2 mb-4" />

          {/* Tags */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>

          {/* Summary box */}
          <div className="bg-gradient-to-br from-primary-500/10 to-secondary-500/10 border border-primary-500/20 rounded-xl p-5">
            <Skeleton className="h-4 w-40 mb-3" />
            <SkeletonText lines={3} lastLineWidth="80%" />
          </div>
        </div>

        {/* Transcript Content */}
        <div className="bg-background-elevated rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-background-tertiary px-6 py-4 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </div>
          
          {/* Transcript chunks */}
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-6 py-4 border-l-4 border-transparent">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-7 w-20 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <SkeletonText lines={i % 2 === 0 ? 3 : 4} lastLineWidth="70%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

