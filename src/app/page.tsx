'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { StatCard } from '@/components/StatCard'
import { YearNavigator } from '@/components/YearNavigator'
import { AlertBanner } from '@/components/AlertBanner'
import { MonthlyChart } from '@/components/MonthlyChart'
import { ImportZone } from '@/components/ImportZone'
import { SettingsPanel } from '@/components/SettingsPanel'
import { AnomalyBanner } from '@/components/AnomalyBanner'
import { parseExcelBuffers } from '@/lib/excel-parser'
import { computeYearStats, computeProjection } from '@/lib/calculator'
import type { Records, Prefs, UnknownTipologia, DayClassification } from '@/types/domain'

export default function DashboardPage() {
  const [records, setRecords] = useState<Records | null>(null)
  const [prefs, setPrefs] = useState<Prefs>({ maxAgilePercent: 50 })
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const [pendingRows, setPendingRows] = useState<ReturnType<typeof parseExcelBuffers>['rows'] | null>(null)
  const [pendingFilenames, setPendingFilenames] = useState<string[]>([])
  const [unknownTipologie, setUnknownTipologie] = useState<UnknownTipologia[]>([])

  useEffect(() => {
    async function load() {
      const [recRes, prefRes] = await Promise.all([
        fetch('/api/data'),
        fetch('/api/prefs'),
      ])
      const rec: Records | null = await recRes.json()
      const pref: Prefs = await prefRes.json()
      setRecords(rec)
      setPrefs(pref)
      if (rec) {
        const years = availableYearsFrom(rec)
        const currentYear = new Date().getFullYear()
        setSelectedYear(years.includes(currentYear) ? currentYear : years[years.length - 1] ?? currentYear)
      }
    }
    load()
  }, [])

  const availableYears = useMemo(() => availableYearsFrom(records), [records])

  const yearStats = useMemo(
    () => computeYearStats(records?.days ?? [], selectedYear),
    [records, selectedYear]
  )

  const currentYear = new Date().getFullYear()
  const isCurrentYear = selectedYear === currentYear

  const projection = useMemo(
    () => computeProjection(yearStats, prefs.maxAgilePercent),
    [yearStats, prefs.maxAgilePercent]
  )

  async function handleSavePrefs(maxAgilePercent: number) {
    const res = await fetch('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxAgilePercent }),
    })
    if (res.ok) setPrefs({ maxAgilePercent })
  }

  const handleFiles = useCallback(async (files: File[]) => {
    setLoading(true)
    setImportError(null)
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
  }, [])

  async function handleResolveAnomalies(overrides: Record<string, DayClassification>) {
    if (!pendingRows) return
    setLoading(true)
    setUnknownTipologie([])
    await submitImport(pendingRows, overrides, pendingFilenames)
    setPendingRows(null)
    setPendingFilenames([])
  }

  async function submitImport(
    rows: ReturnType<typeof parseExcelBuffers>['rows'],
    overrides: Record<string, DayClassification>,
    filenames: string[]
  ) {
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
    const recRes = await fetch('/api/data')
    const rec: Records | null = await recRes.json()
    setRecords(rec)
    if (rec) {
      const years = availableYearsFrom(rec)
      const currentYear = new Date().getFullYear()
      setSelectedYear(years.includes(currentYear) ? currentYear : years[years.length - 1] ?? currentYear)
    }
    setLoading(false)
  }

  const employee = records?.employee

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
              <h1 className="text-xl font-bold text-slate-400">Links Presence Calculator</h1>
            )}
          </div>
          <div className="flex items-center gap-3">
            <SettingsPanel
              maxAgilePercent={prefs.maxAgilePercent}
              onSave={handleSavePrefs}
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
    </main>
  )
}

function availableYearsFrom(records: Records | null): number[] {
  if (!records || records.days.length === 0) return []
  const years = new Set(records.days.map(d => Number(d.date.slice(0, 4))))
  return Array.from(years).sort()
}
