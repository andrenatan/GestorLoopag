import { BarChart3 } from "lucide-react";

export default function FinancialReports() {
  return (
    <div className="p-6 space-y-4 min-h-screen">
      <div
        className="rounded-2xl p-6 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios Financeiros</h1>
          <p className="text-slate-400 text-sm">Em breve.</p>
        </div>
      </div>

      <div className="bg-[#111c2a] border border-[#1e2e3e] rounded-xl p-16 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <p className="text-slate-400 text-sm">Esta seção está em construção.</p>
      </div>
    </div>
  );
}
