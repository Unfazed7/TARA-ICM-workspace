import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4 flex-1 min-h-0 pb-4',
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        'lg:[grid-template-rows:2fr_1fr]',
        className
      )}
    >
      {children}
    </div>
  );
}
