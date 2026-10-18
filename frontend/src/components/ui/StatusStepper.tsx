import { AlertStatus } from '../../types/alert.types';
import { cn } from '../../utils/cn';

const STEPS: AlertStatus[] = ['New', 'Verified', 'Notice Issued'];

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
                  idx <= currentIndex ? 'bg-[#22c55e]' : 'bg-[#2a3832]'
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
                isCompleted && 'bg-[#22c55e] text-[#0b0f0e] font-bold',
                isCurrent && 'bg-[#111816] border-2 border-[#22c55e] text-[#22c55e] font-bold',
                isUpcoming && 'bg-[#111816] border border-[#2a3832] text-[#b4c2bb]',
                !readonly && onStatusClick && 'cursor-pointer hover:border-[#22c55e]'
              )}
            >
              {isCompleted ? '✓' : idx + 1}
            </button>

            {/* Step Label */}
            <span
              className={cn(
                'mt-1.5 text-[11px] font-mono tracking-wider text-center select-none truncate max-w-full px-1',
                isCurrent && 'text-[#22c55e] font-semibold',
                isCompleted && 'text-[#f1f5f3]',
                isUpcoming && 'text-[#b4c2bb]'
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
