'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  disabled?: boolean
}

// Fetches the full backup from the server and triggers a client-side download
// as a JSON file. Reading from the API guarantees the file matches the
// persisted state, not just whatever the page currently holds in memory.
export function ExportBackupButton({ disabled = false }: Props) {
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) return
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `smartwork-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={disabled || busy}>
      <Download className="size-4 mr-2" />
      {busy ? 'Esporto…' : 'Esporta'}
    </Button>
  )
}
