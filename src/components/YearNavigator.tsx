interface YearNavigatorProps {
  year: number
  availableYears: number[]
  onChange: (year: number) => void
}

export function YearNavigator({ year, availableYears, onChange }: YearNavigatorProps) {
  const idx = availableYears.indexOf(year)
  const hasPrev = idx > 0
  const hasNext = idx < availableYears.length - 1

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => hasPrev && onChange(availableYears[idx - 1])}
        disabled={!hasPrev}
        className="w-8 h-8 rounded-lg bg-[#1e293b] text-slate-400 hover:text-slate-100 hover:bg-[#334155] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-lg"
        aria-label="Anno precedente"
      >
        ‹
      </button>
      <span className="text-xl font-bold text-slate-100 tabular-nums w-16 text-center">
        {year}
      </span>
      <button
        onClick={() => hasNext && onChange(availableYears[idx + 1])}
        disabled={!hasNext}
        className="w-8 h-8 rounded-lg bg-[#1e293b] text-slate-400 hover:text-slate-100 hover:bg-[#334155] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-lg"
        aria-label="Anno successivo"
      >
        ›
      </button>
    </div>
  )
}
