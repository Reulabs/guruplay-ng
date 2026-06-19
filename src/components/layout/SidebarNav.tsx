import { ElementType, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Typography from "@/components/ui/typography";

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
      <Typography variant="eyebrow" weight="bold" className="text-white/35">
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
      className={cn(
        "group flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all",
        isActive
          ? "bg-white text-black shadow-[0_14px_34px_rgba(255,255,255,0.08)]"
          : "text-white/58 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 transition-colors",
          isActive ? "text-black" : "text-white/55 group-hover:text-white",
        )}
      />
      <Typography variant="sm" weight="bold" truncate>
        {label}
      </Typography>
    </Link>
  );
};
