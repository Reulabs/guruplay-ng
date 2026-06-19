import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, SignalLow, WifiOff } from 'lucide-react';
import Typography from '@/components/ui/typography';
import { cn } from '@/lib/utils';

type EffectiveType = 'slow-2g' | '2g' | '3g' | '4g';

interface NetworkInformation extends EventTarget {
  effectiveType?: EffectiveType;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

const getConnection = () => {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
};

const isSlowConnection = (connection?: NetworkInformation) => {
  if (!connection) return false;
  return (
    connection.saveData === true ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.effectiveType === '3g' ||
    (typeof connection.downlink === 'number' && connection.downlink < 1.25) ||
    (typeof connection.rtt === 'number' && connection.rtt > 650)
  );
};

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [connection, setConnection] = useState<NetworkInformation | undefined>(() => getConnection());
  const [showRecovered, setShowRecovered] = useState(false);
  const wasDegradedRef = useRef(false);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    const updateConnection = () => setConnection(getConnection());
    const activeConnection = getConnection();

    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    activeConnection?.addEventListener('change', updateConnection);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      activeConnection?.removeEventListener('change', updateConnection);
    };
  }, []);

  const networkState = useMemo(() => {
    if (!isOnline) {
      return {
        kind: 'offline' as const,
        icon: WifiOff,
        title: 'You are offline',
        message: 'Playback and uploads may pause until your connection returns.',
      };
    }

    if (isSlowConnection(connection)) {
      return {
        kind: 'slow' as const,
        icon: SignalLow,
        title: 'Network is unstable',
        message: 'Streaming may buffer on this connection.',
      };
    }

    return null;
  }, [connection, isOnline]);

  useEffect(() => {
    if (networkState) {
      wasDegradedRef.current = true;
      setShowRecovered(false);
      return;
    }

    if (!wasDegradedRef.current) {
      return;
    }

    setShowRecovered(true);
    wasDegradedRef.current = false;

    const timeout = window.setTimeout(() => {
      setShowRecovered(false);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [networkState]);

  const status = networkState ?? (showRecovered
    ? {
        kind: 'recovered' as const,
        icon: CheckCircle2,
        title: 'Back online',
        message: 'Your connection looks healthy again.',
      }
    : null);

  if (!status) {
    return null;
  }

  const Icon = status.icon;
  const isRecovered = status.kind === 'recovered';

  return (
    <div
      className={cn(
        'fixed left-0 right-0 top-0 z-[80] border-b px-4 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-xl',
        isRecovered
          ? 'border-emerald-300/25 bg-emerald-500/95 text-white'
          : 'border-amber-300/25 bg-amber-500/95 text-black'
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 text-center">
        <Icon className="h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <Typography variant="body-sm" weight="bold" className="inline">
            {status.title}
          </Typography>
          <Typography variant="body-sm" className={cn('ml-2 inline', isRecovered ? 'text-white/85' : 'text-black/70')}>
            {status.message}
          </Typography>
        </div>
      </div>
    </div>
  );
};

export default NetworkStatus;
