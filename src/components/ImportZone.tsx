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
      f.name.endsWith('.xlsx')
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
        accept=".xlsx"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <p className="text-slate-400 text-sm">
        {loading ? (
          'Elaborazione in corso…'
        ) : (
          <>
            <span className="text-sky-400 font-semibold">+ Carica file Excel</span>
            {' — '}trascina qui uno o più <code className="text-slate-300">.xlsx</code> oppure clicca
          </>
        )}
      </p>
    </div>
  )
}
