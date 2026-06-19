import { cn } from '@/lib/cn'

interface MockupChartProps {
  data: number[]
  className?: string
  color?: string
  fillColor?: string
  showArea?: boolean
  showLine?: boolean
  showBars?: boolean
  labels?: string[]
}

export function MockupChart({
  data,
  className,
  color = '#8b5cf6',
  fillColor = 'rgba(139, 92, 246, 0.15)',
  showArea = true,
  showLine = true,
  showBars = false,
  labels,
}: MockupChartProps) {
  const width = 100
  const height = 40
  const padding = 2
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full h-full', className)}
    >
      {showArea && (
        <path d={areaPath} fill={fillColor} />
      )}
      {showLine && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {showLine && points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="0.8"
          fill={color}
        />
      ))}
      {showBars &&
        data.map((value, i) => {
          const barWidth = (width - padding * 2) / data.length - 0.5
          const barHeight = ((value - min) / range) * (height - padding * 2)
          const x = padding + i * ((width - padding * 2) / data.length)
          const y = height - padding - barHeight
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="0.5"
              fill={color}
            />
          )
        })}
    </svg>
  )
}
