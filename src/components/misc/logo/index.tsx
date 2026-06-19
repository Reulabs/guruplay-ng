import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

export const DefaultLogo = ({ className, markClassName, textClassName }: DefaultLogoProps) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#ff3545] to-[#ff8f3d] text-white shadow-[0_15px_40px_rgba(255,76,80,0.24)]',
          markClassName
        )}
      >
        <Music2 className="h-5 w-5" />
      </span>
      <span className={cn('text-xl font-bold tracking-[0.18em] text-white uppercase', textClassName)}>
        Guruplay
      </span>
    </div>
  );
};
