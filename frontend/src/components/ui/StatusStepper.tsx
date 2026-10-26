import { AlertStatus } from '../../types/alert.types';
import { cn } from '../../utils/cn';

const STEPS: AlertStatus[] = ['New', 'Verified', 'Notice Issued', 'Signed & Served'];

const STEP_LABELS: Record<AlertStatus, string> = {
  New: '1. New',
  Verified: '2. Verified',
  'Notice Issued': '3. Draft Notice',
  'Signed & Served': '4. Signed & Served',
};

interface StatusStepperProps {
  currentStatus: AlertStatus;
  onStatusClick?: (status: AlertStatus) => void;
  className?: string;
  readonly?: boolean;
}

export function StatusStepper({
  currentStatus,
  onStatusClick,
  className,
  readonly = false,
}: StatusStepperProps) {
  const currentIndex = STEPS.indexOf(currentStatus);

  return (
    <div className={cn('flex items-center w-full max-w-xl gap-2', className)}>
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isUpcoming = idx > currentIndex;

        return (
          <div key={step} className="flex-1 flex flex-col items-center relative">
            {/* Connector Line */}
            {idx > 0 && (
              <div
                className={cn(
                  'absolute top-3.5 -left-1/2 w-full h-[2px] transition-colors',
                  idx <= currentIndex ? 'bg-[#facc15]' : 'bg-[#222c3d]'
                )}
              />
            )}

            {/* Step Circle */}
            <button
              type="button"
              disabled={readonly || (!onStatusClick && idx !== currentIndex + 1)}
              onClick={() => onStatusClick && onStatusClick(step)}
              className={cn(
                'relative z-10 w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs transition-colors',
                isCompleted && 'bg-[#facc15] text-[#0b1018] font-bold',
                isCurrent && 'bg-[#111826] border-2 border-[#facc15]/40 text-[#facc15] font-bold',
                isUpcoming && 'bg-[#111826] border border-[#222c3d] text-[#98a2b3]',
                !readonly && onStatusClick && 'cursor-pointer hover:border-[#facc15]/40'
              )}
            >
              {isCompleted ? '✓' : idx + 1}
            </button>

            {/* Step Label */}
            <span
              className={cn(
                'mt-1.5 text-[10px] font-mono tracking-wider text-center select-none truncate max-w-full px-1',
                isCurrent && 'text-[#facc15] font-semibold',
                isCompleted && 'text-[#e6eaf0]',
                isUpcoming && 'text-[#98a2b3]'
              )}
            >
              {STEP_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
