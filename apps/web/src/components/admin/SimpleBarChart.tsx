'use client'

interface DataPoint {
  label: string
  value: number
}

interface SimpleBarChartProps {
  data: DataPoint[]
  color?: string
  height?: number
  formatValue?: (value: number) => string
}

export function SimpleBarChart({
  data,
  color = 'bg-primary',
  height = 160,
  formatValue = (v) => String(v),
}: SimpleBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div style={{ height }} className="flex items-end gap-2">
      {data.map((point, i) => {
        const pct = (point.value / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full relative" style={{ height: '100%' }}>
              <div
                className={`absolute bottom-0 left-0 right-0 rounded-t-md ${color}`}
                style={{ height: `${pct}%` }}
                title={`${point.label}: ${formatValue(point.value)}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {point.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
