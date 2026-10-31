import { ElementType, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@guruplay/ui/utils";
import Typography from "@guruplay/ui/typography";

export interface SidebarNavItemData {
  icon: ElementType;
  label: string;
  path: string;
  activeMatch?: (pathname: string, search: string) => boolean;
}

interface SidebarNavSectionProps {
  title: string;
  children: ReactNode;
}

export const SidebarNavSection = ({
  title,
  children,
}: SidebarNavSectionProps) => {
  return (
    <div className="space-y-4">
      <Typography variant="eyebrow" weight="bold" className="text-white/40">
        {title}
      </Typography>
      <nav className="space-y-2">{children}</nav>
    </div>
  );
};

export const SidebarNavItem = ({
  icon: Icon,
  label,
  path,
  activeMatch,
}: SidebarNavItemData) => {
  const { pathname, search } = useLocation();
  const isActive = activeMatch
    ? activeMatch(pathname, search)
    : pathname === path;

  return (
    <Link
      to={path}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3.5 rounded-full px-4 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isActive
          ? "bg-white/[0.07] text-white"
          : "text-white/58 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 transition-colors",
          isActive ? "text-primary" : "text-white/55 group-hover:text-white",
        )}
      />
      <Typography variant="sm" weight="bold" truncate className="text-inherit">
        {label}
      </Typography>
    </Link>
  );
};
