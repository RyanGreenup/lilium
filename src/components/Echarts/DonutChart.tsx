import type { EChartsOption } from 'echarts'
import type { EChartsType } from 'echarts/core'
import { createMemo, createSignal, mergeProps, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'
import Echart, { CHART_COLORS, CHART_PALETTE } from './Echart'
import type { EchartCustomTooltipProps } from './Echart'

const NAMED_COLORS: Record<string, string> = {
  slate: '#64748b',
  gray: '#6b7280',
  zinc: '#71717a',
  neutral: '#737373',
  stone: '#78716c',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e'
}

const isCssColor = (value: string) =>
  value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')

const resolveColor = (value: string | undefined, index: number): string => {
  if (!value) return CHART_PALETTE[index % CHART_PALETTE.length]
  if (isCssColor(value)) return value
  const normalized = value.toLowerCase()
  return (
    NAMED_COLORS[normalized] ??
    CHART_COLORS[normalized as keyof typeof CHART_COLORS] ??
    CHART_PALETTE[index % CHART_PALETTE.length]
  )
}

export type TooltipProps = EchartCustomTooltipProps

export type DonutChartEventProps =
  | {
      eventType: 'sector'
      categoryClicked: string
      [key: string]: unknown
    }
  | null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface DonutChartProps<T extends Record<string, any> = Record<string, any>> {
  data: T[]
  category: string
  value: string
  variant?: 'donut' | 'pie'
  showLabel?: boolean
  colors?: string[]
  valueFormatter?: (value: number) => string
  onValueChange?: (value: DonutChartEventProps) => void
  tooltipCallback?: (props: TooltipProps) => void
  class?: string
  style?: JSX.CSSProperties
}

export default function DonutChart(props: DonutChartProps) {
  const merged = mergeProps(
    {
      variant: 'donut' as const,
      showLabel: false,
      colors: CHART_PALETTE as unknown as string[],
      valueFormatter: (value: number) => Intl.NumberFormat('en-US').format(value)
    },
    props
  )

  const [local, rest] = splitProps(merged, [
    'data',
    'category',
    'value',
    'variant',
    'showLabel',
    'colors',
    'valueFormatter',
    'onValueChange',
    'tooltipCallback'
  ])

  const [activeIndex, setActiveIndex] = createSignal<number | null>(null)

  const colorScale = createMemo(() =>
    local.data.map((_, index) => resolveColor(local.colors[index % local.colors.length], index))
  )

  const option = createMemo((): EChartsOption => {
    const active = activeIndex()
    const seriesData = local.data.map((item, dataIndex) => {
      const value = Number(item[local.value] ?? 0)
      return {
        name: String(item[local.category] ?? ''),
        value,
        itemStyle: {
          color: colorScale()[dataIndex],
          opacity: active === null || active === dataIndex ? 1 : 0.35
        }
      }
    })

    return {
      color: colorScale(),
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const category = String(params.name ?? '')
          const value = Number(params.value ?? 0)
          const formatted = local.valueFormatter(value)
          return `${category}<br/>${formatted}`
        }
      },
      legend: { show: false },
      series: [
        {
          type: 'pie',
          radius: local.variant === 'pie' ? ['0%', '78%'] : ['45%', '78%'],
          center: ['50%', '50%'],
          label: {
            show: local.showLabel,
            formatter: '{b}: {d}%',
            color: '#6b7280'
          },
          labelLine: { show: local.showLabel },
          data: seriesData,
          emphasis: {
            scale: true,
            scaleSize: 6
          }
        }
      ]
    }
  })

  const handleSeriesClick = local.onValueChange
    ? (event: { name?: string; dataIndex: number }) => {
        const idx = event.dataIndex
        if (activeIndex() === idx) {
          setActiveIndex(null)
          local.onValueChange?.(null)
          return
        }

        setActiveIndex(idx)
        const dataPoint = local.data[idx]
        local.onValueChange?.({
          eventType: 'sector',
          categoryClicked: String(event.name ?? dataPoint?.[local.category] ?? ''),
          ...dataPoint
        })
      }
    : undefined

  const handleInit = (instance: EChartsType) => {
    if (!local.tooltipCallback) return

    instance.on('mouseover', 'series', (params) => {
      const idx = Number(params.dataIndex ?? -1)
      if (idx < 0 || idx >= local.data.length) return
      const row = local.data[idx]
      local.tooltipCallback?.({
        active: true,
        label: String(params.name ?? row[local.category] ?? ''),
        payload: [
          {
            category: String(params.name ?? row[local.category] ?? ''),
            value: Number(params.value ?? row[local.value] ?? 0),
            color: String(params.color ?? ''),
            payload: row
          }
        ]
      })
    })

    instance.on('mouseout', 'series', () => {
      local.tooltipCallback?.({ active: false, label: '', payload: [] })
    })
  }

  const handleGlobalOut = local.tooltipCallback
    ? () => local.tooltipCallback?.({ active: false, label: '', payload: [] })
    : undefined

  return (
    <Echart
      option={option}
      class={rest.class}
      style={rest.style}
      onInit={handleInit}
      onSeriesClick={handleSeriesClick}
      onGlobalOut={handleGlobalOut}
    />
  )
}
