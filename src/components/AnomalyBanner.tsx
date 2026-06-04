'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UnknownTipologia, DayClassification } from '@/types/domain'

interface AnomalyBannerProps {
  unknownTipologie: UnknownTipologia[]
  importError: string | null
  onResolve: (overrides: Record<string, DayClassification>) => void
  onDismissError: () => void
}

const OPTIONS: { value: DayClassification; label: string }[] = [
  { value: 'lavorativa', label: 'Lavorativa (presenza)' },
  { value: 'agile', label: 'Agile (smart working)' },
  { value: 'esclusa', label: 'Esclusa (non contare)' },
]

export function AnomalyBanner({
  unknownTipologie,
  importError,
  onResolve,
  onDismissError,
}: AnomalyBannerProps) {
  const [open, setOpen] = useState(false)
  const [selections, setSelections] = useState<Record<string, DayClassification>>({})

  const hasAnomalies = unknownTipologie.length > 0 || importError

  if (!hasAnomalies) return null

  function handleResolve() {
    const allResolved = unknownTipologie.every(t => selections[t.value])
    if (!allResolved) return
    onResolve(selections)
    setOpen(false)
    setSelections({})
  }

  return (
    <>
      <div className="flex items-center gap-3 bg-amber-950/40 border border-amber-800/60 rounded-xl px-5 py-3">
        <span className="text-amber-400">⚠</span>
        <span className="text-amber-300 text-sm flex-1">
          {importError
            ? importError
            : `${unknownTipologie.length} tipologi${unknownTipologie.length === 1 ? 'a' : 'e'} non riconosciut${unknownTipologie.length === 1 ? 'a' : 'e'} — import in sospeso`}
        </span>
        {importError ? (
          <button
            onClick={onDismissError}
            className="text-xs text-amber-400 hover:text-amber-200 underline"
          >
            Chiudi
          </button>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="text-xs text-amber-400 hover:text-amber-200 underline"
          >
            Risolvi →
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Tipologie non riconosciute</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2 max-h-[60vh] overflow-y-auto">
            {unknownTipologie.map(t => (
              <div key={t.value} className="space-y-2">
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-mono text-sky-400 font-semibold">{t.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.occurrences} occorrenz{t.occurrences === 1 ? 'a' : 'e'} —{' '}
                    {t.dates.slice(0, 5).join(', ')}
                    {t.dates.length > 5 ? ` +${t.dates.length - 5} altre` : ''}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelections(s => ({ ...s, [t.value]: opt.value }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selections[t.value] === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleResolve}
              disabled={!unknownTipologie.every(t => selections[t.value])}
              className="px-4 py-2 bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm rounded-lg font-medium transition-colors"
            >
              Conferma e importa
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
