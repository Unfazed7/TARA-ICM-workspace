import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  variant?: 'fade' | 'slide' | 'scale';
}

export function PageTransition({ 
  children, 
  className,
  variant = 'fade' 
}: PageTransitionProps) {
  const variants = {
    fade: 'page-transition',
    slide: 'page-transition-slide',
    scale: 'page-transition-scale',
  };

  return (
    <div className={cn(variants[variant], className)}>
      {children}
    </div>
  );
}
