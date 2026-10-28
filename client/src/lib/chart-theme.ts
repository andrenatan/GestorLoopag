import type { CSSProperties } from "react";

/**
 * Recharts styling bound to the design tokens in index.css. Values are CSS
 * color strings with var() so charts follow light/dark without re-rendering.
 */
export const tokenColor = (token: string, alpha?: number) =>
  alpha === undefined ? `hsl(var(--${token}))` : `hsl(var(--${token}) / ${alpha})`;

export const CHART_PALETTE = [1, 2, 3, 4, 5, 6].map((i) => tokenColor(`chart-${i}`));

export const chartColors = {
  pitaya: tokenColor("chart-1"),
  anil: tokenColor("chart-2"),
  lagoa: tokenColor("chart-3"),
  sol: tokenColor("chart-4"),
  laranja: tokenColor("chart-5"),
  uva: tokenColor("chart-6"),
  danger: tokenColor("destructive"),
};

export const chartGridStroke = "hsl(var(--foreground) / 0.08)";

export const chartAxisTick = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };

export const chartTooltipStyle: CSSProperties = {
  backgroundColor: "hsl(var(--popover) / 0.96)",
  border: "1px solid hsl(var(--edge) / var(--edge-alpha))",
  borderRadius: 16,
  boxShadow: "var(--shadow-float)",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
  padding: "8px 12px",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "hsl(var(--muted-foreground))",
  marginBottom: 2,
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "hsl(var(--popover-foreground))",
  fontWeight: 600,
};

export const chartCursor = { fill: "hsl(var(--foreground) / 0.05)" };
