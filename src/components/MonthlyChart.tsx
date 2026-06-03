import type { MonthStats } from '@/types/domain'

const MONTH_NAMES: Record<string, string> = {
  '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mag', '06': 'Giu', '07': 'Lug', '08': 'Ago',
  '09': 'Set', '10': 'Ott', '11': 'Nov', '12': 'Dic',
}

function monthLabel(month: string): string {
  return MONTH_NAMES[month.slice(5, 7)] ?? month
}

interface MonthlyChartProps {
  months: MonthStats[]
  maxAgilePercent: number
}

export function MonthlyChart({ months, maxAgilePercent }: MonthlyChartProps) {
  if (months.length === 0) {
    return (
      <div className="bg-[#1e293b] rounded-xl p-6 text-slate-500 text-sm text-center">
        Nessun dato per questo anno. Carica dei file Excel per iniziare.
      </div>
    )
  }

  return (
    <div className="bg-[#1e293b] rounded-xl p-6">
      <h2 className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-5">
        % Agile per mese
      </h2>

      <div className="relative">
        {/* Threshold line label */}
        <div
          className="absolute right-0 pointer-events-none"
          style={{ bottom: `${maxAgilePercent}%` }}
        >
          <span className="text-[9px] text-red-400/70 pr-1">soglia {maxAgilePercent}%</span>
        </div>

        {/* % labels row */}
        <div className="flex gap-2 mb-1 pr-16">
          {months.map(m => (
            <div
              key={m.month}
              className={`flex-1 text-center text-[10px] font-bold ${
                m.percent > maxAgilePercent ? 'text-red-400' : 'text-sky-400'
              }`}
            >
              {m.percent}%
            </div>
          ))}
        </div>

        {/* Bars + threshold line */}
        <div className="relative h-28 pr-16">
          <div
            className="absolute left-0 right-16 border-t-2 border-dashed border-red-400/50 pointer-events-none z-10"
            style={{ bottom: `${maxAgilePercent}%` }}
          />
          <div className="flex items-end gap-2 h-full">
            {months.map(m => {
              const isOver = m.percent > maxAgilePercent
              return (
                <div
                  key={m.month}
                  className="flex-1 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${m.percent}%`,
                    background: isOver
                      ? 'linear-gradient(to bottom, #f87171, rgba(248,113,113,0.08))'
                      : 'linear-gradient(to bottom, #0ea5e9, rgba(14,165,233,0.08))',
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Month labels */}
        <div className="flex gap-2 mt-2 pr-16">
          {months.map(m => (
            <div
              key={m.month}
              className="flex-1 text-center text-[9px] text-slate-500"
            >
              {monthLabel(m.month)}
            </div>
          ))}
        </div>
      </div>

      {/* Detail table */}
      <div className="mt-6 border-t border-slate-700/50 pt-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wider">
              <th className="text-left pb-2 font-medium">Mese</th>
              <th className="text-right pb-2 font-medium">Agile</th>
              <th className="text-right pb-2 font-medium">Ufficio</th>
              <th className="text-right pb-2 font-medium">Totali</th>
              <th className="text-right pb-2 font-medium">%</th>
              <th className="text-right pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => {
              const isOver = m.percent > maxAgilePercent
              return (
                <tr key={m.month} className="border-t border-slate-700/30">
                  <td className="py-2 text-slate-300">{monthLabel(m.month)}</td>
                  <td className="py-2 text-right tabular-nums text-slate-300">{m.agile}</td>
                  <td className="py-2 text-right tabular-nums text-slate-300">{m.lavorativa}</td>
                  <td className="py-2 text-right tabular-nums text-slate-300">{m.total}</td>
                  <td
                    className={`py-2 text-right tabular-nums font-semibold ${
                      isOver ? 'text-red-400' : 'text-sky-400'
                    }`}
                  >
                    {m.percent}%
                  </td>
                  <td className="py-2 text-right text-xs">
                    {isOver ? (
                      <span title="Soglia superata">⚠</span>
                    ) : (
                      <span className="text-emerald-500">✓</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
