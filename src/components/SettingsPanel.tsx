'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SettingsPanelProps {
  maxAgilePercent: number
  onSave: (value: number) => void
}

export function SettingsPanel({ maxAgilePercent, onSave }: SettingsPanelProps) {
  const [value, setValue] = useState(String(maxAgilePercent))
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  function handleSave() {
    const n = Number(value)
    if (isNaN(n) || n < 0 || n > 100) {
      setError('Inserisci un valore tra 0 e 100.')
      return
    }
    setError('')
    onSave(n)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) {
        setValue(String(maxAgilePercent))
        setError('')
      }
    }}>
      <DialogTrigger
        className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors flex items-center justify-center"
        aria-label="Impostazioni"
      >
        ⚙
      </DialogTrigger>
      <DialogContent className="max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle>Impostazioni</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="maxAgile" className="text-sm">
              Soglia massima lavoro agile (%)
            </Label>
            <Input
              id="maxAgile"
              type="number"
              min={0}
              max={100}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              className="w-32"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              size="sm"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
            >
              Salva
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
