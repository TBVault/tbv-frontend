import { Skeleton, SkeletonChatMessage, SkeletonText } from '@/components/Skeleton';

export default function HistoricalChatLoading() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 lg:px-6 flex items-center min-h-[56px]">
        <Skeleton className="h-6 w-48" />
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Messages area */}
        <div className="flex-1 overflow-hidden p-4 lg:p-6 flex flex-col">
          <div className="max-w-5xl mx-auto w-full space-y-6 flex-1">
            {/* User message skeleton */}
            <SkeletonChatMessage isUser={true} lines={2} />
            
            {/* Assistant message skeleton */}
            <div className="flex justify-start">
              <div className="w-full">
                <SkeletonText lines={4} className="mb-4" />
                
                {/* Sources section skeleton */}
                <div className="mt-4 pt-4 border-t border-border">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <div className="flex gap-2 flex-wrap">
                    <Skeleton className="h-8 w-32 rounded-lg" />
                    <Skeleton className="h-8 w-40 rounded-lg" />
                    <Skeleton className="h-8 w-28 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Another user message */}
            <SkeletonChatMessage isUser={true} lines={1} />
            
            {/* Another assistant message */}
            <div className="flex justify-start">
              <div className="w-full">
                <SkeletonText lines={3} />
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-border bg-background-secondary p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3">
              <Skeleton className="flex-1 h-12 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

