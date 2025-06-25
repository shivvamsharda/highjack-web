
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSkeletonProps {
  type: 'token' | 'fee' | 'form';
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type }) => {
  if (type === 'token') {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-1 text-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (type === 'fee') {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return <Skeleton className="h-4 w-full" />;
};

export default LoadingSkeleton;
