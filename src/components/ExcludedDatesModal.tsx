'use client'

import { useRef, useState, useEffect } from 'react'
import { CalendarDays, Plus, Trash2, Upload } from 'lucide-react'
import { read, utils } from 'xlsx'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { getItalianHolidays, isWorkingDay } from '@/lib/holidays'
import {
  type DateRow,
  newRow,
  rowIsComplete,
  datesToRows,
  expandToWorkingDays,
} from '@/lib/excluded-dates'

// Reads column A from an xlsx file, parses dd/mm/yyyy strings or native date cells,
// returns YYYY-MM-DD strings for future working days only.
async function readFutureDatesFromExcel(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer()
  const wb = read(buf, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws['!ref']) return []

  const range = utils.decode_range(ws['!ref'])
  const today = new Date().toISOString().slice(0, 10)
  const result: string[] = []

  for (let r = range.s.r; r <= range.e.r; r++) {
    const cell = ws[utils.encode_cell({ r, c: 0 })]
    if (!cell) continue

    let iso: string | null = null

    if (cell.t === 'd' && cell.v instanceof Date) {
      const d = cell.v as Date
      iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    } else if (typeof cell.v === 'string') {
      const m = (cell.v as string).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (m) iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }

    if (iso && iso > today && isWorkingDay(iso, getItalianHolidays(Number(iso.slice(0, 4))))) {
      result.push(iso)
    }
  }

  return result
}

interface Props {
  onSaved: (dates: string[]) => void
}

export function ExcludedDatesModal({ onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<DateRow[]>([newRow()])
  const [saving, setSaving] = useState(false)
  const loadedRef = useRef(false)
  const xlsxInputRef = useRef<HTMLInputElement>(null)

  const minDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  })()

  useEffect(() => {
    if (!open) return
    if (loadedRef.current) return
    loadedRef.current = true

    fetch('/api/excluded-dates')
      .then(r => r.json())
      .then((dates: string[]) => setRows(datesToRows(dates)))
      .catch(() => {})
  }, [open])

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) loadedRef.current = false
  }

  function addRow() {
    setRows(prev => [...prev, newRow()])
  }

  function removeRow(id: number) {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id)
      return next.length === 0 ? [newRow()] : next
    })
  }

  function updateRow(id: number, patch: Partial<DateRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  async function handleXlsxImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const newDates = await readFutureDatesFromExcel(file)
    if (newDates.length === 0) return

    setRows(prev => {
      const existing = new Set(expandToWorkingDays(prev))
      newDates.forEach(d => existing.add(d))
      return datesToRows(Array.from(existing).sort())
    })
  }

  async function handleConfirm() {
    setSaving(true)
    const dates = expandToWorkingDays(rows)
    try {
      await fetch('/api/excluded-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dates),
      })
      onSaved(dates)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const hasIncompleteRow = rows.some(r => !rowIsComplete(r))

  const dateInputClass =
    'flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarDays className="size-4 mr-2" color="currentColor" />
        Escludi date
      </Button>

      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Date escluse dal contatore</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          I weekend e le festività vengono già esclusi automaticamente. Aggiungi qui solo giorni lavorativi futuri da escludere (es. ferie, permessi non importati).
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1">
          {rows.map(row => (
            <div key={row.id} className="flex items-center gap-2">
              <div className="flex rounded-md overflow-hidden border border-border text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => updateRow(row.id, { mode: 'single', end: '' })}
                  className={`px-2 py-1 transition-colors ${row.mode === 'single' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >
                  Giorno
                </button>
                <button
                  type="button"
                  onClick={() => updateRow(row.id, { mode: 'range' })}
                  className={`px-2 py-1 transition-colors ${row.mode === 'range' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                >
                  Range
                </button>
              </div>

              <input
                type="date"
                value={row.start}
                min={minDate}
                onChange={e => updateRow(row.id, { start: e.target.value })}
                className={dateInputClass}
              />

              {row.mode === 'range' && (
                <>
                  <span className="text-muted-foreground text-xs shrink-0">→</span>
                  <input
                    type="date"
                    value={row.end}
                    min={row.start || minDate}
                    onChange={e => updateRow(row.id, { end: e.target.value })}
                    className={dateInputClass}
                  />
                </>
              )}

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeRow(row.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-1">
          <input
            ref={xlsxInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleXlsxImport}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => xlsxInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="size-4 mr-2" />
            Importa Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={hasIncompleteRow}
            className="flex-1"
          >
            <Plus className="size-4 mr-2" />
            Aggiungi riga
          </Button>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Conferma'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
