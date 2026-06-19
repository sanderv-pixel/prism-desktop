'use client'

import { cn } from '@/lib/cn'
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  className?: string
  color?: string
  valueFormatter?: (value: number) => string
}

export function BarChart({
  data,
  className,
  color = '#22d3ee',
  valueFormatter,
}: BarChartProps) {
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

  const format = valueFormatter ?? ((v: number) => v.toLocaleString())

  return (
    <div className={cn('w-full h-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => format(Number(v))}
            width={50}
          />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            }}
            formatter={(value: any) => [format(Number(value)), '']}
            labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}
          />
          <Bar
            dataKey="value"
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}
