
import { Skeleton } from '@/components/Skeleton';

export default function ChatLoading() {
  return (
    <div className="h-screen-mobile flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-4 py-3 lg:px-6 flex items-center gap-3 min-h-[56px]">
        {/* Mobile menu button placeholder */}
        <div className="lg:hidden w-6 h-6 rounded bg-foreground-muted/10 animate-pulse" />
        
        {/* Title */}
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md w-full flex flex-col items-center">
            {/* Icon */}
            <Skeleton className="w-16 h-16 rounded-2xl mb-6" />
            
            {/* Title */}
            <Skeleton className="h-8 w-64 mb-2" />
            
            {/* Subtitle */}
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-border bg-background-secondary p-4">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="w-full h-14 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
