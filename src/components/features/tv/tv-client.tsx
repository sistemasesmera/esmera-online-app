"use client";

import { Moon, Sun, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";
import type { TvStats } from "@/lib/data/dashboard.repository";

const REFRESH_SECONDS = 60;

function fmt(n: number) {
  return n.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function LiveClock({ dark }: { dark: boolean }) {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!time) return null;
  return (
    <span className={`tabular-nums font-bold text-lg ${dark ? "text-white" : "text-gray-900"}`}>
      {time.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

function LiveDate({ dark }: { dark: boolean }) {
  const [date, setDate] = useState<Date | null>(null);
  useEffect(() => {
    setDate(new Date());
    const t = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  if (!date) return null;
  const raw = date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return (
    <span className={`capitalize text-sm font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>
      {raw}
    </span>
  );
}

export function TvDashboardClient({ stats }: { stats: TvStats }) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_SECONDS);

  useEffect(() => {
    const saved = localStorage.getItem("tv-theme");
    if (saved === "light") setIsDark(false);
  }, []);

  function toggleTheme(v: boolean) {
    setIsDark(v);
    localStorage.setItem("tv-theme", v ? "dark" : "light");
  }

  useEffect(() => {
    const t = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) { router.refresh(); return REFRESH_SECONDS; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [router]);

  const { comerciales } = stats;

  const totals = {
    todayCount:  comerciales.reduce((s, r) => s + r.todayCount, 0),
    todayAmount: comerciales.reduce((s, r) => s + r.todayAmount, 0),
    monthCount:  comerciales.reduce((s, r) => s + r.monthCount, 0),
    monthAmount: comerciales.reduce((s, r) => s + r.monthAmount, 0),
  };

  const monthName = (() => {
    const raw = new Date().toLocaleDateString("es-ES", { month: "long" });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  const d = isDark;
  const bg        = d ? "bg-gray-950"                  : "bg-gray-50";
  const headerBg  = d ? "bg-gray-900 border-gray-800"  : "bg-white border-gray-200";
  const brand     = d ? "text-white"                   : "text-gray-900";
  const theadBg   = d ? "bg-gray-950"                  : "bg-gray-50";
  const theadTh   = d ? "text-gray-500 border-gray-800": "text-gray-400 border-gray-200";
  const rowBorder = d ? "border-gray-800/50"           : "border-gray-100";
  const rowHover  = d ? "hover:bg-white/5"             : "hover:bg-gray-100";
  const nameCls   = d ? "text-white"                   : "text-gray-900";
  const zeroCls   = d ? "text-gray-700"                : "text-gray-300";
  const footBg    = d ? "bg-gray-900 border-gray-700"  : "bg-gray-100 border-gray-300";
  const footLbl   = d ? "text-gray-400"                : "text-gray-500";
  const todayNum  = d ? "text-emerald-400"             : "text-emerald-600";
  const todayAmt  = d ? "text-emerald-300"             : "text-emerald-600";
  const monthNum  = d ? "text-white"                   : "text-gray-900";
  const monthAmt  = d ? "text-gray-200"                : "text-gray-700";

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none ${bg}`}>

      {/* ── Header ── */}
      <header className={`flex items-center justify-between px-8 py-3 border-b shrink-0 ${headerBg}`}>
        <span className={`text-sm font-black uppercase tracking-widest ${brand}`}>
          Panel de Rendimiento
        </span>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Sun className={`h-4 w-4 ${!d ? "text-amber-500" : "text-gray-600"}`} />
            <Switch checked={isDark} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-indigo-600" />
            <Moon className={`h-4 w-4 ${d ? "text-indigo-400" : "text-gray-400"}`} />
          </div>
          <LiveDate dark={isDark} />
          <LiveClock dark={isDark} />
          <span className={`text-xs ${d ? "text-gray-600" : "text-gray-400"}`}>Datos en {refreshCountdown}s</span>
        </div>
      </header>

      {/* ── Ventas ── */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="pt-10 pb-6 flex items-center justify-center gap-3 shrink-0">
          <TrendingUp className="h-7 w-7 text-emerald-400" />
          <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-400">Ventas</h2>
        </div>

        <div className="flex-1 overflow-auto px-16">
          <table className="w-full max-w-5xl mx-auto">
            <thead className={`sticky top-0 z-10 ${theadBg}`}>
              <tr>
                <th className={`text-left py-4 pr-8 text-xs font-bold uppercase tracking-widest border-b ${theadTh}`}>Comercial</th>
                <th className={`text-right py-4 px-6 text-xs font-bold uppercase tracking-widest border-b ${theadTh}`}>Contratos hoy</th>
                <th className={`text-right py-4 px-6 text-xs font-bold uppercase tracking-widest border-b ${theadTh}`}>Importe hoy</th>
                <th className={`text-right py-4 px-6 text-xs font-bold uppercase tracking-widest border-b ${theadTh}`}>Contratos {monthName}</th>
                <th className={`text-right py-4 pl-6 text-xs font-bold uppercase tracking-widest border-b ${theadTh}`}>Importe {monthName}</th>
              </tr>
            </thead>
            <tbody>
              {comerciales.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`py-20 text-center text-xl ${zeroCls}`}>
                    Sin comerciales registrados
                  </td>
                </tr>
              ) : (
                comerciales.map((c) => (
                  <tr key={c.userId} className={`border-b ${rowBorder} ${rowHover} transition-colors`}>
                    <td className={`py-5 pr-8 text-xl font-semibold ${nameCls}`}>{c.userName}</td>
                    <td className="py-5 px-6 text-right tabular-nums">
                      <span className={`text-3xl font-bold ${c.todayCount > 0 ? todayNum : zeroCls}`}>
                        {c.todayCount}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right tabular-nums">
                      <span className={`text-3xl font-bold ${c.todayAmount > 0 ? todayAmt : zeroCls}`}>
                        {c.todayAmount > 0 ? fmt(c.todayAmount) : "—"}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right tabular-nums">
                      <span className={`text-3xl font-bold ${c.monthCount > 0 ? monthNum : zeroCls}`}>
                        {c.monthCount}
                      </span>
                    </td>
                    <td className="py-5 pl-6 text-right tabular-nums">
                      <span className={`text-3xl font-bold ${c.monthAmount > 0 ? monthAmt : zeroCls}`}>
                        {c.monthAmount > 0 ? fmt(c.monthAmount) : "—"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 ${footBg}`}>
                <td className={`py-4 pr-8 text-xs font-black uppercase tracking-widest ${footLbl}`}>Total</td>
                <td className="py-4 px-6 text-right tabular-nums">
                  <span className={`text-2xl font-black ${todayNum}`}>{totals.todayCount}</span>
                </td>
                <td className="py-4 px-6 text-right tabular-nums">
                  <span className={`text-2xl font-black ${todayAmt}`}>
                    {totals.todayAmount > 0 ? fmt(totals.todayAmount) : "—"}
                  </span>
                </td>
                <td className="py-4 px-6 text-right tabular-nums">
                  <span className={`text-2xl font-black ${monthNum}`}>{totals.monthCount}</span>
                </td>
                <td className="py-4 pl-6 text-right tabular-nums">
                  <span className={`text-2xl font-black ${monthAmt}`}>
                    {totals.monthAmount > 0 ? fmt(totals.monthAmount) : "—"}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}
