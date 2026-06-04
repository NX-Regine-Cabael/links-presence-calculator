'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { BackupSummary } from '@/lib/backup'

interface Props {
  summary: BackupSummary | null // non-null → dialog open
  applying: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Confirmation shown before a JSON backup replaces the current data. Summarizes
// what the file contains so the user knows exactly what they're restoring.
export function RestoreConfirmDialog({ summary, applying, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={summary !== null} onOpenChange={v => { if (!v) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ripristina da backup</DialogTitle>
        </DialogHeader>

        {summary && (
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <p className="text-xs">
                Tutti i dati attuali (giorni caricati, date escluse e soglia) verranno
                <strong> sostituiti</strong> con il contenuto del file. L&apos;operazione non è reversibile.
              </p>
            </div>

            <dl className="space-y-1 text-muted-foreground">
              <div className="flex justify-between gap-4">
                <dt>Dipendente</dt>
                <dd className="text-foreground text-right">
                  {summary.employeeName
                    ? `${summary.employeeName}${summary.employeeId ? ` (${summary.employeeId})` : ''}`
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Giorni classificati</dt>
                <dd className="text-foreground">{summary.dayCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Date escluse</dt>
                <dd className="text-foreground">{summary.excludedCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Soglia % agile</dt>
                <dd className="text-foreground">{summary.maxAgilePercent}%</dd>
              </div>
            </dl>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onCancel} disabled={applying}>Annulla</Button>
          <Button onClick={onConfirm} disabled={applying}>
            {applying ? 'Ripristino…' : 'Sostituisci'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
