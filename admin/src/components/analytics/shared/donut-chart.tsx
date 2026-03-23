'use client'

/**
 * Reusable Donut Chart Component
 * Used across analytics dashboards for displaying status breakdowns.
 * Provides custom tooltips, responsive container, and legend.
 */

import { PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { EmptyState } from '@/components/analytics/shared/empty-state'

export type DonutDataPoint = {
    name: string
    value: number
    fill: string
}

type DonutChartProps = {
    data: DonutDataPoint[]
    config: ChartConfig
    emptyMessage?: string
}

export function DonutChart({ data, config, emptyMessage = 'No data to display.' }: DonutChartProps) {
    if (!data.length || data.every(d => d.value === 0)) {
        return <EmptyState title="No data" message={emptyMessage} />
    }

    const filtered = data.filter(d => d.value > 0)

    return (
        <div className="flex h-[280px] flex-col items-center justify-center">
            <ChartContainer config={config} className="h-[200px] w-full">
                <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie data={filtered} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} strokeWidth={2} paddingAngle={2}>
                        {filtered.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
            </ChartContainer>

            <div className="flex flex-wrap items-center justify-center gap-4 text-sm mt-2">
                {filtered.map(entry => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.fill }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                        <span className="font-medium">({entry.value})</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
