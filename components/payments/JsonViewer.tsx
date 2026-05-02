'use client'

interface JsonViewerProps {
  data: Record<string, unknown> | null | undefined
  label?: string
}

export function JsonViewer({ data, label }: JsonViewerProps) {
  if (!data) {
    return (
      <div className="text-sm text-slate-500 italic">Nėra duomenų</div>
    )
  }

  return (
    <div>
      {label && (
        <div className="text-sm font-medium text-slate-700 mb-2">{label}</div>
      )}
      <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs overflow-auto max-h-96">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
