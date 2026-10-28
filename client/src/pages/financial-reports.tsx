import { BarChart3 } from "lucide-react";
import { PageHeader, PageShell } from "@/components/layout/page-header";

export default function FinancialReports() {
  return (
    <PageShell>
      <PageHeader title="Relatórios Financeiros" description="Em breve." />

      <div className="glass p-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-highlight text-highlight-foreground">
          <BarChart3 className="h-6 w-6" />
        </div>
        <p className="text-sm text-muted-foreground">Esta seção está em construção.</p>
      </div>
    </PageShell>
  );
}
