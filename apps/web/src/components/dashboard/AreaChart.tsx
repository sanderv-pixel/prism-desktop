'use client'

import { cn } from '@/lib/cn'
import {
  Area,
  AreaChart as ReAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface AreaChartProps {
  data: { label?: string; value: number }[]
  className?: string
  color?: string
  showLabels?: boolean
  valuePrefix?: string
}

export function AreaChart({
  data,
  className,
  color = '#8b5cf6',
  showLabels = true,
  valuePrefix = '',
}: AreaChartProps) {
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

  const formatValue = (v: number) => `${valuePrefix}${v.toLocaleString()}`

  return (
    <div className={cn('w-full h-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <ReAreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="reAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            hide={!showLabels}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatValue(Number(v))}
            width={50}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
            }}
            formatter={(value: any) => [formatValue(Number(value)), '']}
            labelStyle={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#reAreaGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
