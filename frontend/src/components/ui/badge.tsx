import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // D-51 state tags: colour marks state only. Uppercase like the design's tags.
        yellow: "border-transparent bg-state-yellow text-state-yellow-foreground px-[9px] text-[11px] uppercase tracking-[.05em]",
        green: "border-transparent bg-state-green text-state-green-foreground px-[9px] text-[11px] uppercase tracking-[.05em]",
        blue: "border-transparent bg-state-blue text-state-blue-foreground px-[9px] text-[11px] uppercase tracking-[.05em]",
        red: "border-transparent bg-state-red text-state-red-foreground px-[9px] text-[11px] uppercase tracking-[.05em]",
        grey: "border-transparent bg-state-grey text-state-grey-foreground px-[9px] text-[11px] uppercase tracking-[.05em]",
      },
      // Plain case for state badges used inside sentences.
      case: {
        tag: "",
        normal: "px-2.5 text-xs normal-case tracking-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      case: "tag",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, case: letterCase, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, case: letterCase }), className)} {...props} />;
}

export { Badge, badgeVariants };
