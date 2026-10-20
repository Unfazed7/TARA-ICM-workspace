/**
 * Right-hand sheet in the D-51 style: a floating card with a header strip. Used for Settings
 * ("What I read") and for the Stage 01 Assumptions.
 */

import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  description: string;
  badge?: ReactNode;
  width?: number;
  children: ReactNode;
};

export function SideSheet({ open, onOpenChange, eyebrow, title, description, badge, width = 620, children }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={{ maxWidth: `min(${width}px, calc(100% - 24px))` }}
        className="flex w-full flex-col gap-0 overflow-hidden rounded-[14px] border border-border bg-card p-0 shadow-xl sm:bottom-3 sm:right-3 sm:top-3 sm:h-auto [&>button:last-child]:right-5 [&>button:last-child]:top-5"
      >
        <div className="aegis-card-head py-4 pr-14">
          <span className="flex flex-col gap-0.5">
            <span className="aegis-label">{eyebrow}</span>
            <SheetTitle className="text-xl font-semibold tracking-tight">{title}</SheetTitle>
            <SheetDescription className="sr-only">{description}</SheetDescription>
          </span>
          {badge}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
