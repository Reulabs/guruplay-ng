import type { LucideIcon } from "lucide-react";

export default function FeedbackIllustration({
  icon: Icon,
}: {
  icon?: LucideIcon;
}) {
  return (
    <div aria-hidden="true" className="relative mb-6 h-28 w-44 shrink-0">
      <svg viewBox="0 0 176 112" fill="none" className="h-full w-full">
        <ellipse
          cx="88"
          cy="99"
          rx="65"
          ry="6"
          className="fill-white/[0.025]"
        />
        <path
          d="M20 52h14m108 0h14M29 28l8 6m102 0 8-6"
          className="stroke-white/15"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect
          x="49"
          y="15"
          width="78"
          height="82"
          rx="13"
          className="fill-[#161616] stroke-white/15"
        />
        <path
          d="M64 79h48m-38 7h28"
          className="stroke-white/20"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="88"
          cy="47"
          r="22"
          className="fill-white/[0.035] stroke-white/10"
        />
        {!Icon && (
          <path
            d="M76 48v-7a12 12 0 0 1 24 0v7m-24-2h-2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h5V46h-3Zm24 0h2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-5V46h3Z"
            className="stroke-white/45"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}
        <path
          d="M38 73v9m-6-5h12m96-9v7m-4-3h8"
          className="stroke-white/20"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="129" cy="23" r="8" className="fill-primary/15" />
        <circle cx="129" cy="23" r="3" className="fill-primary" />
      </svg>
      {Icon && (
        <Icon
          className="absolute left-[74px] top-[33px] h-7 w-7 text-white/50"
          strokeWidth={1.5}
        />
      )}
    </div>
  );
}
