import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Typography from "@/components/ui/typography";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: string;
}

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  iconColor = "text-primary",
}: MetricCardProps) => {
  return (
    <Card className="bg-card border-border hover:bg-card/80 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Typography variant="body-sm" tone="muted" className="mb-1">
              {title}
            </Typography>
            <Typography variant="h2" weight="bold" className="mb-1">
              {value}
            </Typography>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.isPositive ? "text-green-500" : "text-red-500",
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">
                  vs last period
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center bg-primary/10",
              iconColor,
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
