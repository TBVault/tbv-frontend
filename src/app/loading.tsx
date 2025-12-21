import { Skeleton, SkeletonAvatar, SkeletonText } from '@/components/Skeleton';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen py-8 px-6 lg:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-background-elevated rounded-2xl border border-border p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <SkeletonAvatar size={96} className="rounded-2xl" />
              <div className="absolute -bottom-2 -right-2 px-2.5 py-1 bg-background-elevated border border-border rounded-full">
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <Skeleton className="h-8 w-48 mb-2 mx-auto sm:mx-0" />
              <Skeleton className="h-5 w-64 mb-4 mx-auto sm:mx-0" />
              <SkeletonText lines={1} lastLineWidth="80%" className="mx-auto sm:mx-0" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-background-elevated rounded-xl border border-border p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
          
          <div className="bg-background-elevated rounded-xl border border-border p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-background-elevated rounded-2xl border border-border p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-6 w-24" />
          </div>
          <SkeletonText lines={1} lastLineWidth="60%" className="mb-4" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-background-elevated rounded-xl border border-border p-6">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <Skeleton className="h-6 w-32" />
            </div>
            <SkeletonText lines={2} lastLineWidth="90%" />
          </div>

          <div className="bg-background-elevated rounded-xl border border-border p-6">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <Skeleton className="h-6 w-32" />
            </div>
            <SkeletonText lines={2} lastLineWidth="90%" />
          </div>
        </div>
      </div>
    </div>
  );
}

