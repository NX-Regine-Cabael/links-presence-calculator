'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { StatCard } from '@/components/StatCard'
import { YearNavigator } from '@/components/YearNavigator'
import { AlertBanner } from '@/components/AlertBanner'
import { MonthlyChart } from '@/components/MonthlyChart'
import { ImportZone } from '@/components/ImportZone'
import { SettingsPanel } from '@/components/SettingsPanel'
import { AnomalyBanner } from '@/components/AnomalyBanner'
import { ExcludedDatesModal } from '@/components/ExcludedDatesModal'
import { ExportBackupButton } from '@/components/ExportBackupButton'
import { RestoreConfirmDialog } from '@/components/RestoreConfirmDialog'
import { parseExcelBuffers } from '@/lib/excel-parser'
import { computeYearStats, computeProjection } from '@/lib/calculator'
import { validateBackup, summarizeBackup, type BackupFile, type BackupSummary } from '@/lib/backup'
import type { Records, Prefs, UnknownTipologia, DayClassification } from '@/types/domain'

export default function DashboardPage() {
  const [records, setRecords] = useState<Records | null>(null)
  const [prefs, setPrefs] = useState<Prefs>({ maxAgilePercent: 50 })
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const [excludedDates, setExcludedDates] = useState<string[]>([])
  const [pendingRows, setPendingRows] = useState<ReturnType<typeof parseExcelBuffers>['rows'] | null>(null)
  const [pendingFilenames, setPendingFilenames] = useState<string[]>([])
  const [unknownTipologie, setUnknownTipologie] = useState<UnknownTipologia[]>([])

  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null)
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null)
  const [applyingRestore, setApplyingRestore] = useState(false)

  const applyLoadedState = useCallback((rec: Records | null, pref: Prefs, excl: string[]) => {
    setRecords(rec)
    setPrefs(pref)
    setExcludedDates(excl)
    if (rec) {
      const years = availableYearsFrom(rec)
      const currentYear = new Date().getFullYear()
      setSelectedYear(prev =>
        years.includes(prev) ? prev :
        years.includes(currentYear) ? currentYear :
        years[years.length - 1] ?? prev
      )
    }
  }, [])

  useEffect(() => {
    fetchAllState().then(([rec, pref, excl]) => applyLoadedState(rec, pref, excl))
  }, [applyLoadedState])

  const availableYears = useMemo(() => availableYearsFrom(records), [records])

  const yearStats = useMemo(
    () => computeYearStats(records?.days ?? [], selectedYear),
    [records, selectedYear]
  )

  const currentYear = new Date().getFullYear()
  const isCurrentYear = selectedYear === currentYear

  const projection = useMemo(
    () => computeProjection(yearStats, prefs.maxAgilePercent, new Date(), excludedDates),
    [yearStats, prefs.maxAgilePercent, excludedDates]
  )

  async function handleSavePrefs(maxAgilePercent: number) {
    const res = await fetch('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxAgilePercent }),
    })
    if (res.ok) setPrefs({ maxAgilePercent })
  }

  async function handleReset() {
    await fetch('/api/data', { method: 'DELETE' })
    setRecords(null)
    setSelectedYear(new Date().getFullYear())
    setUnknownTipologie([])
    setPendingRows(null)
    setPendingFilenames([])
    setImportError(null)
  }

  const submitImport = useCallback(async (
    rows: ReturnType<typeof parseExcelBuffers>['rows'],
    overrides: Record<string, DayClassification>,
    filenames: string[]
  ) => {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, overrides, filenames }),
    })
    const data = await res.json()
    if (!res.ok) {
      setImportError(data.error ?? 'Errore durante l\'import.')
      setLoading(false)
      return
    }
    const [rec, pref, excl] = await fetchAllState()
    applyLoadedState(rec, pref, excl)
    setLoading(false)
  }, [applyLoadedState])

  const handleFiles = useCallback(async (files: File[]) => {
    setImportError(null)

    // A dropped/selected .json is treated as a backup to restore, not an Excel import.
    const jsonFile = files.find(f => f.name.toLowerCase().endsWith('.json'))
    if (jsonFile) {
      let parsed: unknown
      try {
        parsed = JSON.parse(await jsonFile.text())
      } catch {
        setImportError('Il file JSON non è leggibile.')
        return
      }
      const result = validateBackup(parsed)
      if (!result.ok) {
        setImportError(result.error)
        return
      }
      setPendingBackup(result.backup)
      setBackupSummary(summarizeBackup(result.backup))
      return
    }

    setLoading(true)
    try {
      const buffers = await Promise.all(files.map(f => f.arrayBuffer()))
      const { rows, unknownTipologie } = parseExcelBuffers(buffers)

      if (unknownTipologie.length > 0) {
        setPendingRows(rows)
        setPendingFilenames(files.map(f => f.name))
        setUnknownTipologie(unknownTipologie)
        setLoading(false)
        return
      }

      await submitImport(rows, {}, files.map(f => f.name))
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Errore durante l\'import.')
      setLoading(false)
    }
  }, [submitImport])

  async function handleResolveAnomalies(overrides: Record<string, DayClassification>) {
    if (!pendingRows) return
    setLoading(true)
    setUnknownTipologie([])
    await submitImport(pendingRows, overrides, pendingFilenames)
    setPendingRows(null)
    setPendingFilenames([])
  }

  async function confirmRestore() {
    if (!pendingBackup) return
    setApplyingRestore(true)
    setImportError(null)
    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingBackup),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setImportError(data.error ?? 'Errore durante il ripristino.')
      setApplyingRestore(false)
      return
    }
    const [rec, pref, excl] = await fetchAllState()
    applyLoadedState(rec, pref, excl)
    // Clear any leftover Excel-import anomaly state from a previous flow.
    setUnknownTipologie([])
    setPendingRows(null)
    setPendingFilenames([])
    setApplyingRestore(false)
    setPendingBackup(null)
    setBackupSummary(null)
  }

  function cancelRestore() {
    if (applyingRestore) return
    setPendingBackup(null)
    setBackupSummary(null)
  }

  const employee = records?.employee
  const hasData = records !== null || excludedDates.length > 0

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {employee ? (
              <>
                <h1 className="text-xl font-bold text-slate-100">{employee.name}</h1>
                <p className="text-sm text-slate-500 mt-0.5">ID {employee.userId}</p>
              </>
            ) : (
              <h1 className="text-xl font-bold text-slate-400">Smartwork Calculator</h1>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ExportBackupButton disabled={!hasData} />
            <ExcludedDatesModal onSaved={setExcludedDates} />
            <SettingsPanel
              maxAgilePercent={prefs.maxAgilePercent}
              onSave={handleSavePrefs}
              onReset={handleReset}
            />
          </div>
        </div>

        {/* Year navigator */}
        {availableYears.length > 0 && (
          <div className="flex items-center">
            <YearNavigator
              year={selectedYear}
              availableYears={availableYears}
              onChange={setSelectedYear}
            />
          </div>
        )}

        {/* Alert banner */}
        <AlertBanner
          percent={yearStats.percent}
          maxAgilePercent={prefs.maxAgilePercent}
          isCurrentYear={isCurrentYear}
          projection={projection}
        />

        {/* Anomaly banner */}
        <AnomalyBanner
          unknownTipologie={unknownTipologie}
          importError={importError}
          onResolve={handleResolveAnomalies}
          onDismissError={() => setImportError(null)}
        />

        {/* Stat cards */}
        {yearStats.total > 0 && (
          <div className="flex gap-4 flex-wrap">
            <StatCard
              label="% Agile"
              value={`${yearStats.percent}%`}
              isOver={yearStats.percent > prefs.maxAgilePercent}
              badge={yearStats.percent > prefs.maxAgilePercent ? `max ${prefs.maxAgilePercent}%` : undefined}
            />
            <StatCard label="Giorni Agile" value={yearStats.agile} />
            <StatCard label="Giorni Ufficio" value={yearStats.lavorativa} />
            <StatCard label="Giorni Totali" value={yearStats.total} />
          </div>
        )}

        {/* Monthly chart */}
        <MonthlyChart months={yearStats.months} maxAgilePercent={prefs.maxAgilePercent} />

        {/* Import zone */}
        <ImportZone onFiles={handleFiles} loading={loading} />

      </div>

      <RestoreConfirmDialog
        summary={backupSummary}
        applying={applyingRestore}
        onConfirm={confirmRestore}
        onCancel={cancelRestore}
      />
    </main>
  )
}

function availableYearsFrom(records: Records | null): number[] {
  if (!records || records.days.length === 0) return []
  const years = new Set(records.days.map(d => Number(d.date.slice(0, 4))))
  return Array.from(years).sort()
}

async function fetchAllState(): Promise<[Records | null, Prefs, string[]]> {
  const [recRes, prefRes, exclRes] = await Promise.all([
    fetch('/api/data'),
    fetch('/api/prefs'),
    fetch('/api/excluded-dates'),
  ])
  return [await recRes.json(), await prefRes.json(), await exclRes.json()]
}
