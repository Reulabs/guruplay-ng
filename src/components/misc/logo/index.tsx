import { Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DefaultLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

export const DefaultLogo = ({
  className,
  markClassName,
  textClassName,
}: DefaultLogoProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar>
        <AvatarImage  src="/assets/logo.png" />
     
      </Avatar>
    </div>
  );
};
