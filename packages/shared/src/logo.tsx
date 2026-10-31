import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@guruplay/common/utils";
import { APP_BRAND } from "@guruplay/common/brand";

import { logoUrl } from "./assets";

export interface LogoProps extends ComponentPropsWithoutRef<"span"> {
  markClassName?: string;
  textClassName?: string;
  showWordmark?: boolean;
}

/** Shared brand mark; wrap in an app-owned link when navigation is needed. */
export function Logo({ className, markClassName, textClassName, showWordmark = false, ...props }: LogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-3", className)} {...props}>
      <img src={logoUrl} alt={showWordmark ? "" : APP_BRAND} width={40} height={40}
        className={cn("h-10 w-10 shrink-0 rounded-full object-contain", markClassName)} />
      {showWordmark && <span className={cn("text-lg font-bold", textClassName)}>{APP_BRAND}</span>}
    </span>
  );
}

export { Logo as DefaultLogo };
