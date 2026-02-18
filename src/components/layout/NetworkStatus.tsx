import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineNotice, setShowOnlineNotice] = useState(false);
  const wasOffline = useRef(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline.current) {
        setShowOnlineNotice(true);
        window.setTimeout(() => setShowOnlineNotice(false), 3000);
      }
      wasOffline.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineNotice(false);
      wasOffline.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showOnlineNotice) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[70]">
      {isOnline ? (
        <div className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-xs font-medium text-white shadow-lg">
          <Wifi className="h-4 w-4" />
          You are back online.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground shadow-lg">
          <WifiOff className="h-4 w-4" />
          You are offline. Some features may not work.
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;
