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
  blurValue?: boolean;
}

const colorVariants = {
  red: "border-destructive/30 hover:border-destructive/40",
  yellow: "border-warning/30 hover:border-warning/40", 
  orange: "border-warning/30 hover:border-warning/40",
  blue: "border-info/30 hover:border-info/40",
  green: "border-success/30 hover:border-success/40",
  purple: "border-primary/30 hover:border-primary/40",
};

const iconColorVariants = {
  red: "text-destructive bg-destructive/10",
  yellow: "text-warning bg-warning/10",
  orange: "text-warning bg-warning/10", 
  blue: "text-info bg-info/10",
  green: "text-success bg-success/10",
  purple: "text-primary bg-primary/10",
};

const valueColorVariants = {
  red: "text-destructive",
  yellow: "text-warning",
  orange: "text-warning",
  blue: "text-info", 
  green: "text-success",
  purple: "text-primary",
};

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend, 
  className,
  blurValue 
}: StatsCardProps) {
  return (
    <Card className={cn(
      "glass p-6",
      colorVariants[color],
      
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
              <Icon className={cn("w-3.5 h-3.5", valueColorVariants[color])} />
              {title}
            </p>
            <p className={cn("text-2xl font-bold", valueColorVariants[color], blurValue && "blur-sm select-none")} style={blurValue ? { transition: 'filter 0.3s ease' } : { transition: 'filter 0.3s ease' }}>
              {value}
            </p>
            {trend && (
              <p className={cn(
                "text-xs mt-1",
                trend.isPositive ? "text-success" : "text-destructive"
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
