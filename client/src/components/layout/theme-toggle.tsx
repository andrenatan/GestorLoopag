import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const label = theme === "light" ? "Ativar modo escuro" : "Ativar modo claro";

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      title={label}
      className={cn("relative shrink-0", className)}
    >
      <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
