'use client'

import { cn } from '@/lib/cn'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface LineChartProps {
  data: Record<string, number | string>[]
  lines: { key: string; label: string; color: string; yAxisId?: 'left' | 'right' }[]
  xAxisKey: string
  className?: string
  valueFormatter?: (value: number) => string
  rightValueFormatter?: (value: number) => string
}

export function LineChart({
  data,
  lines,
  xAxisKey,
  className,
  valueFormatter,
  rightValueFormatter,
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-xs text-muted-foreground',
          className
        )}
      >
        No data yet
      </div>
    )
  }

  const leftFormat = valueFormatter ?? ((v: number) => v.toLocaleString())
  const rightFormat = rightValueFormatter ?? leftFormat
  const hasRightAxis = lines.some((l) => l.yAxisId === 'right')

  return (
    <div className={cn('w-full h-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ReLineChart data={data} margin={{ top: 8, right: hasRightAxis ? 8 : 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => leftFormat(Number(v))}
            width={50}
          />
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => rightFormat(Number(v))}
              width={50}
            />
          )}
          <Tooltip
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            }}
            formatter={(value: any, name: any, props: any) => {
              const line = lines.find((l) => l.key === props.dataKey)
              const fmt = line?.yAxisId === 'right' ? rightFormat : leftFormat
              return [fmt(Number(value)), name]
            }}
            labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              yAxisId={line.yAxisId ?? 'left'}
            />
          ))}
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}
