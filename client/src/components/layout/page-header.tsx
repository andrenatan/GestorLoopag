import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Standard page gutter + vertical rhythm for screens inside the app shell. */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[1600px] space-y-6 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-8", className)}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Large, friendly page title sitting directly on the color field (no pane). */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header data-reveal className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-balance font-display text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[2.6rem]">
          {title}
        </h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
