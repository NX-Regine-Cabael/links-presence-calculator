interface StatCardProps {
  label: string
  value: string | number
  isOver?: boolean
  badge?: string
}

export function StatCard({ label, value, isOver = false, badge }: StatCardProps) {
  return (
    <div className="bg-[#1e293b] rounded-xl p-5 flex flex-col gap-1 min-w-[130px]">
      <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</span>
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className={`text-3xl font-bold tabular-nums ${
            isOver ? 'text-red-400' : 'text-slate-100'
          }`}
        >
          {value}
        </span>
        {badge && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              isOver
                ? 'bg-red-950 text-red-400'
                : 'bg-sky-950 text-sky-400'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
