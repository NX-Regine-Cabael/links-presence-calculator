import type { Projection } from '@/types/domain'

interface AlertBannerProps {
  percent: number
  maxAgilePercent: number
  isCurrentYear: boolean
  projection: Projection | null
}

export function AlertBanner({ percent, maxAgilePercent, isCurrentYear, projection }: AlertBannerProps) {
  const isOver = percent > maxAgilePercent

  if (!isOver) return null

  if (!isCurrentYear) {
    return (
      <div className="flex items-center gap-3 bg-red-950/60 border border-red-800 rounded-xl px-5 py-3">
        <span className="text-red-400 text-lg">⚠</span>
        <span className="text-red-300 font-medium">
          Anno chiuso:{' '}
          <span className="font-bold text-red-400">{percent}%</span> agile — soglia{' '}
          <span className="font-semibold">{maxAgilePercent}%</span> superata.
        </span>
      </div>
    )
  }

  return (
    <div className="bg-red-950/60 border border-red-800 rounded-xl px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="text-red-400 text-xl mt-0.5">⚠</span>
        <div>
          <p className="text-red-300 font-semibold text-sm">
            Soglia superata —{' '}
            <span className="text-red-400 font-bold">{percent}%</span> agile (max{' '}
            {maxAgilePercent}%)
          </p>
          {projection && (
            <p className="text-red-300/80 text-sm mt-1">
              Per rientrare entro il 31/12 devi fare{' '}
              <span className="text-red-300 font-bold text-base">
                {projection.officeWeeksNeeded} giorni/sett
              </span>{' '}
              in ufficio ({projection.remainingWorkDays} giorni lavorativi rimanenti,{' '}
              {projection.weeksRemaining} settimane).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
