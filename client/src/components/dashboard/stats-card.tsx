import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "red" | "yellow" | "orange" | "blue" | "green" | "purple";
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const colorVariants = {
  red: "border-red-500/30 hover:border-red-500/50",
  yellow: "border-yellow-500/30 hover:border-yellow-500/50", 
  orange: "border-orange-500/30 hover:border-orange-500/50",
  blue: "border-blue-500/30 hover:border-blue-500/50",
  green: "border-green-500/30 hover:border-green-500/50",
  purple: "border-purple-500/30 hover:border-purple-500/50",
};

const iconColorVariants = {
  red: "text-red-500 bg-red-500/10",
  yellow: "text-yellow-500 bg-yellow-500/10",
  orange: "text-orange-500 bg-orange-500/10", 
  blue: "text-blue-500 bg-blue-500/10",
  green: "text-green-500 bg-green-500/10",
  purple: "text-purple-500 bg-purple-500/10",
};

const valueColorVariants = {
  red: "text-red-500",
  yellow: "text-yellow-500",
  orange: "text-orange-500",
  blue: "text-blue-500", 
  green: "text-green-500",
  purple: "text-purple-500",
};

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend, 
  className 
}: StatsCardProps) {
  return (
    <Card className={cn(
      "stats-card",
      colorVariants[color],
      color === "red" && "animate-pulse-slow",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className={cn("text-2xl font-bold", valueColorVariants[color])}>
              {value}
            </p>
            {trend && (
              <p className={cn(
                "text-xs mt-1",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            iconColorVariants[color]
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
