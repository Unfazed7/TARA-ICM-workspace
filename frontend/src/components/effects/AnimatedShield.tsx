import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedShieldProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4', blur: 'blur-lg' },
  md: { container: 'w-16 h-16', icon: 'w-8 h-8', blur: 'blur-xl' },
  lg: { container: 'w-24 h-24', icon: 'w-12 h-12', blur: 'blur-2xl' },
};

export function AnimatedShield({ size = 'md', className }: AnimatedShieldProps) {
  const sizes = sizeClasses[size];
  
  return (
    <div className={cn("relative shield-container", className)}>
      {/* Outer glow ring */}
      <div className={cn(
        "absolute inset-0 rounded-xl",
        sizes.blur,
        "shield-outer-glow"
      )} />
      
      {/* Rotating gradient background */}
      <div className={cn(
        "absolute inset-0 rounded-xl shield-gradient-rotate opacity-30"
      )} />
      
      {/* Main shield container */}
      <div className={cn(
        sizes.container,
        "relative rounded-xl bg-gradient-to-br from-primary/20 to-accent/10",
        "border border-primary/30 flex items-center justify-center",
        "shield-pulse"
      )}>
        {/* Inner glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-primary/10 rounded-xl" />
        
        {/* Shield icon with gradient */}
        <Shield className={cn(
          sizes.icon,
          "relative z-10 text-primary drop-shadow-[0_0_8px_hsl(217_91%_60%/0.5)]"
        )} />
      </div>
    </div>
  );
}
