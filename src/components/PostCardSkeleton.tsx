import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PostCardSkeletonProps {
  index?: number;
}

export const PostCardSkeleton = ({ index = 0 }: PostCardSkeletonProps) => {
  return (
    <Card 
      className="p-6 bg-card border-border animate-fade-in"
      style={{
        animationDelay: `${index * 100}ms`
      }}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 animate-pulse" style={{ animationDelay: '100ms' }} />
            <Skeleton className="h-3 w-24 animate-pulse" style={{ animationDelay: '200ms' }} />
          </div>
          <Skeleton className="h-8 w-8 rounded-md animate-pulse" style={{ animationDelay: '150ms' }} />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full animate-pulse" style={{ animationDelay: '300ms' }} />
          <Skeleton className="h-4 w-3/4 animate-pulse" style={{ animationDelay: '350ms' }} />
          <Skeleton className="h-4 w-5/6 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>

        {/* Media placeholder */}
        <Skeleton className="h-96 w-full rounded-lg animate-pulse" style={{ animationDelay: '450ms' }} />

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex gap-4">
            <Skeleton className="h-9 w-20 rounded-md animate-pulse" style={{ animationDelay: '500ms' }} />
            <Skeleton className="h-9 w-20 rounded-md animate-pulse" style={{ animationDelay: '550ms' }} />
            <Skeleton className="h-9 w-20 rounded-md animate-pulse" style={{ animationDelay: '600ms' }} />
          </div>
          <Skeleton className="h-9 w-9 rounded-md animate-pulse" style={{ animationDelay: '650ms' }} />
        </div>
      </div>
    </Card>
  );
};
