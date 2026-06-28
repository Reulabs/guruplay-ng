import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { useNotifications } from "@/hooks/use-notifications";
import InlineState from "@/components/fallbacks/InlineState";

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const NotificationsPopover = () => {
  const { notifications, unreadCount, isLoading, error, markAllRead } =
    useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 transition-colors hover:bg-white/12 hover:text-white"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-black bg-primary" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] rounded-2xl border-white/10 bg-[#202020] p-0 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <Typography variant="title" weight="bold">
              Notifications
            </Typography>
            <Typography variant="caption" tone="muted">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </Typography>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            disabled={unreadCount === 0}
          >
            Mark read
          </Button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-4 text-sm text-white/60">
              Loading notifications...
            </div>
          ) : error ? (
            <InlineState
              tone="error"
              title="Notifications unavailable"
              description={error}
            />
          ) : notifications.length === 0 ? (
            <InlineState title="No notifications yet" />
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-xl p-3 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex gap-3">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary data-[read=true]:bg-transparent"
                    data-read={notification.read}
                  />
                  <div className="min-w-0">
                    <Typography
                      variant="body-sm"
                      weight="bold"
                      className="text-white"
                    >
                      {notification.title}
                    </Typography>
                    {notification.body && (
                      <Typography
                        variant="body-sm"
                        className="mt-1 text-white/60"
                      >
                        {notification.body}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      className="mt-2 text-white/40"
                    >
                      {formatTime(notification.createdAt)}
                    </Typography>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;
