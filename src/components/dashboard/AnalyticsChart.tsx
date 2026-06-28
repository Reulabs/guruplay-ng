import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartNoAxesCombined } from "lucide-react";
import EmptyState from "@/components/fallbacks/EmptyState";

interface AnalyticsChartProps {
  data: { date: string; plays: number; listeners: number }[];
  title: string;
}

const AnalyticsChart = ({ data, title }: AnalyticsChartProps) => {
  const hasActivity = data.some(
    (point) => point.plays > 0 || point.listeners > 0,
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasActivity ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Line
                type="monotone"
                dataKey="plays"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Plays"
              />
              <Line
                type="monotone"
                dataKey="listeners"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                name="Listeners"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={ChartNoAxesCombined}
            title="No listening activity yet"
            description="Performance trends will appear after listeners play your songs."
            className="min-h-[300px] border-0 bg-transparent"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AnalyticsChart;
