import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedShieldProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { container: 'w-14 h-14', icon: 'w-7 h-7' },
  lg: { container: 'w-20 h-20', icon: 'w-10 h-10' },
};

// 3a Blueprint brand mark: flat primary block, no glow or motion.
export function AnimatedShield({ size = 'md', className }: AnimatedShieldProps) {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        sizes.container,
        'rounded bg-primary text-primary-foreground flex items-center justify-center',
        className
      )}
    >
      <Shield className={sizes.icon} />
    </div>
  );
}
