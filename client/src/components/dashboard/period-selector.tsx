import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface PeriodValue {
  label: string;
  startDate: string;
  endDate: string;
}

function getBrasiliaToday(): Date {
  const now = new Date();
  const brasiliaOffset = -3 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + brasiliaOffset * 60000);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  // Monday-based week (common in Brazil): 0=Sun → go back 6 days, 1=Mon → 0, etc.
  const diff = (day === 0) ? 6 : day - 1;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function computePeriod(label: string, specificMonth?: string): PeriodValue {
  const today = getBrasiliaToday();
  today.setHours(0, 0, 0, 0);

  const y = today.getFullYear();
  const m = today.getMonth();

  switch (label) {
    case "Hoje":
      return { label, startDate: toDateStr(today), endDate: toDateStr(today) };
    case "Ontem": {
      const y = addDays(today, -1);
      return { label, startDate: toDateStr(y), endDate: toDateStr(y) };
    }
    case "Esta Semana": {
      const start = startOfWeek(today);
      return { label, startDate: toDateStr(start), endDate: toDateStr(today) };
    }
    case "Semana Passada": {
      const thisWeekStart = startOfWeek(today);
      const lastWeekStart = addDays(thisWeekStart, -7);
      const lastWeekEnd = addDays(thisWeekStart, -1);
      return { label, startDate: toDateStr(lastWeekStart), endDate: toDateStr(lastWeekEnd) };
    }
    case "Mês Atual": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { label, startDate: toDateStr(start), endDate: toDateStr(end) };
    }
    case "Mês Passado": {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { label, startDate: toDateStr(start), endDate: toDateStr(end) };
    }
    case "Últimos 7 Dias":
      return { label, startDate: toDateStr(addDays(today, -6)), endDate: toDateStr(today) };
    case "Últimos 15 Dias":
      return { label, startDate: toDateStr(addDays(today, -14)), endDate: toDateStr(today) };
    case "Últimos 30 Dias":
      return { label, startDate: toDateStr(addDays(today, -29)), endDate: toDateStr(today) };
    case "Últimos 60 Dias":
      return { label, startDate: toDateStr(addDays(today, -59)), endDate: toDateStr(today) };
    case "Últimos 90 Dias":
      return { label, startDate: toDateStr(addDays(today, -89)), endDate: toDateStr(today) };
    case "Últimos 6 Meses": {
      const start = new Date(y, m - 5, 1);
      const end = new Date(y, m + 1, 0);
      return { label, startDate: toDateStr(start), endDate: toDateStr(end) };
    }
    case "Trimestre Atual": {
      const quarterStart = Math.floor(m / 3) * 3;
      const start = new Date(y, quarterStart, 1);
      const end = new Date(y, quarterStart + 3, 0);
      return { label, startDate: toDateStr(start), endDate: toDateStr(end) };
    }
    case "Trimestre Passado": {
      const qStart = Math.floor(m / 3) * 3;
      const prevQStart = qStart - 3;
      const start = prevQStart < 0 ? new Date(y - 1, 9, 1) : new Date(y, prevQStart, 1);
      const end = prevQStart < 0 ? new Date(y - 1, 12, 0) : new Date(y, qStart, 0);
      return { label, startDate: toDateStr(start), endDate: toDateStr(end) };
    }
    case "Ano Atual": {
      return { label, startDate: `${y}-01-01`, endDate: `${y}-12-31` };
    }
    case "Ano Passado": {
      return { label, startDate: `${y - 1}-01-01`, endDate: `${y - 1}-12-31` };
    }
    default: {
      if (specificMonth) {
        const [sy, sm] = specificMonth.split("-").map(Number);
        const start = new Date(sy, sm - 1, 1);
        const end = new Date(sy, sm, 0);
        return { label, startDate: toDateStr(start), endDate: toDateStr(end) };
      }
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { label: "Mês Atual", startDate: toDateStr(start), endDate: toDateStr(end) };
    }
  }
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const GROUPS = [
  {
    label: "Períodos Rápidos",
    items: ["Hoje", "Ontem", "Esta Semana", "Semana Passada", "Mês Atual", "Mês Passado"],
  },
  {
    label: "Por Quantidade de Dias",
    items: ["Últimos 7 Dias", "Últimos 15 Dias", "Últimos 30 Dias", "Últimos 60 Dias", "Últimos 90 Dias", "Últimos 6 Meses"],
  },
  {
    label: "Períodos Longos",
    items: ["Trimestre Atual", "Trimestre Passado", "Ano Atual", "Ano Passado"],
  },
  {
    label: "Específicos",
    items: ["Mês Específico"],
  },
];

interface Props {
  value: PeriodValue;
  onChange: (period: PeriodValue) => void;
}

export function defaultPeriod(): PeriodValue {
  return computePeriod("Mês Atual");
}

export function PeriodSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const today = getBrasiliaToday();
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  // Track selected year+month to highlight the correct cell
  const [selectedPickerYear, setSelectedPickerYear] = useState<number | null>(null);
  const [selectedPickerMonth, setSelectedPickerMonth] = useState<number | null>(null);

  const handleSelect = (label: string) => {
    if (label === "Mês Específico") {
      setShowMonthPicker(true);
      return;
    }
    const period = computePeriod(label);
    onChange(period);
    setOpen(false);
    setShowMonthPicker(false);
  };

  const handleMonthPick = (monthIdx: number) => {
    setSelectedPickerMonth(monthIdx);
    setSelectedPickerYear(pickerYear);
    const specificMonth = `${pickerYear}-${String(monthIdx + 1).padStart(2, "0")}`;
    const mName = MONTH_NAMES[monthIdx];
    const label = `${mName}/${pickerYear}`;
    const period = computePeriod(label, specificMonth);
    onChange(period);
    setOpen(false);
    setShowMonthPicker(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setShowMonthPicker(false); }}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs bg-[#243447] text-slate-300 px-3 py-1.5 rounded-md hover:bg-[#2d4057] transition-colors border border-[#3a4a5a]">
          {value.label}
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-52 p-0 bg-[#0d1b2a] border border-[#2a3a4a] rounded-xl shadow-2xl overflow-hidden"
      >
        {!showMonthPicker ? (
          <div className="max-h-80 overflow-y-auto">
            {GROUPS.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                  <div className="w-3 h-3 rounded-sm bg-[#6366f1] flex-shrink-0" />
                  <span className="text-xs font-semibold text-[#6366f1] uppercase tracking-wide">{group.label}</span>
                </div>
                {group.items.map((item) => {
                  const isSelected = value.label === item || (item === "Mês Específico" && !GROUPS.flatMap(g => g.items).includes(value.label));
                  return (
                    <button
                      key={item}
                      onClick={() => handleSelect(item)}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between ${
                        isSelected
                          ? "bg-[#1e3a5f] text-[#60a5fa]"
                          : "text-slate-300 hover:bg-[#1a2a3a]"
                      }`}
                    >
                      {item}
                      {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setPickerYear((y) => y - 1)}
                className="text-slate-400 hover:text-white text-sm px-1"
              >
                ‹
              </button>
              <span className="text-white font-semibold text-sm">{pickerYear}</span>
              <button
                onClick={() => setPickerYear((y) => y + 1)}
                className="text-slate-400 hover:text-white text-sm px-1"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_NAMES.map((name, idx) => (
                <button
                  key={name}
                  onClick={() => handleMonthPick(idx)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedPickerMonth === idx && selectedPickerYear === pickerYear
                      ? "bg-[#6366f1] text-white"
                      : "bg-[#1a2a3a] text-slate-300 hover:bg-[#243447]"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowMonthPicker(false)}
              className="w-full mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors text-center"
            >
              ← Voltar
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
