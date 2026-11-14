/** The switch on 07 between the residual risk sheet and the reports. It sits beside the page title, so it takes no extra row. */

import { cn } from '@/lib/utils';

export type Sheet07 = 'residual' | 'reports';

export function SheetSwitch({ value, onChange }: { value: Sheet07; onChange: (v: Sheet07) => void }) {
  return (
    <span role="group" aria-label="Sheet" className="inline-flex gap-0.5 rounded-[10px] bg-[#E9E7E1] p-[3px]">
      {([['residual', 'Residual risk'], ['reports', 'Reports']] as const).map(([k, label]) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={cn('min-h-[30px] rounded-[8px] px-3 text-[13px] transition-colors', value === k ? 'bg-white font-medium text-[#1C1B19] shadow-[0_1px_2px_rgba(28,27,25,.1)]' : 'text-[#5F5E5B] hover:text-[#1C1B19]')}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
