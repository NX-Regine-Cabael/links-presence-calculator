'use client'

import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'

interface ImportZoneProps {
  onFiles: (files: File[]) => void
  loading?: boolean
}

export function ImportZone({ onFiles, loading = false }: ImportZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f =>
      /\.(xlsx|xls|json)$/i.test(f.name)
    )
    if (files.length > 0) onFiles(files)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFiles(files)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${dragging
          ? 'border-sky-500 bg-sky-950/20'
          : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'
        }
        ${loading ? 'opacity-60 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.json"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <div className="text-slate-400 text-sm flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-sky-400 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sky-400 font-semibold">Elaborazione in corso…</span>
          </>
        ) : (
          <>
            <span className="text-sky-400 font-semibold">+ Carica file</span>
            {' — '}trascina qui uno o più <code className="text-slate-300">.xlsx</code> / <code className="text-slate-300">.xls</code> o un backup <code className="text-slate-300">.json</code> oppure clicca
          </>
        )}
      </div>
    </div>
  )
}
