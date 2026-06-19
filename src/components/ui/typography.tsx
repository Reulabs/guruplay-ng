import { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "subtitle"
  | "body"
  | "body-sm"
  | "caption"
  | "eyebrow"
  | "label"
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl"
  | "2xl";
type Weight = "normal" | "medium" | "semibold" | "bold" | "black";
type Tone = "default" | "muted" | "subtle" | "primary" | "inverse";
type Align = "left" | "center" | "right";

type TypographyProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variant?: Variant;
  weight?: Weight;
  tone?: Tone;
  align?: Align;
  uppercase?: boolean;
  truncate?: boolean;
};

const variantClasses: Record<Variant, string> = {
  display: "text-3xl md:text-4xl leading-tight",
  h1: "text-2xl md:text-3xl leading-tight",
  h2: "text-xl md:text-2xl leading-snug",
  h3: "text-lg md:text-xl leading-snug",
  title: "text-base md:text-lg leading-snug",
  subtitle: "text-sm md:text-base leading-relaxed",
  body: "text-sm leading-relaxed",
  "body-sm": "text-xs md:text-sm leading-relaxed",
  caption: "text-xs leading-normal",
  eyebrow: "text-[0.68rem] leading-none uppercase tracking-[0.22em]",
  label: "text-xs leading-none",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-sm md:text-base",
  lg: "text-base md:text-lg",
  xl: "text-lg md:text-xl",
  "2xl": "text-xl md:text-2xl",
};

const weightClasses: Record<Weight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  black: "font-black",
};

const toneClasses: Record<Tone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  subtle: "text-foreground/75",
  primary: "text-primary",
  inverse: "text-background",
};

const alignClasses: Record<Align, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const Typography = ({
  as: Component = "p",
  variant = "base",
  weight = "normal",
  tone = "default",
  align = "left",
  uppercase = false,
  truncate = false,
  className,
  ...props
}: TypographyProps) => {
  return (
    <Component
      className={cn(
        variantClasses[variant],
        weightClasses[weight],
        toneClasses[tone],
        alignClasses[align],
        uppercase && "uppercase tracking-[0.22em]",
        truncate && "truncate",
        className,
      )}
      {...props}
    />
  );
};

export default Typography;
