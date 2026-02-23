import * as echarts from 'echarts/core'
import type { EChartsOption } from 'echarts'
import type { Component, JSX } from 'solid-js'
import { createMemo, mergeProps, splitProps } from 'solid-js'
import Echart, { CHART_PALETTE, buildSeriesTooltipRenderer } from './Echart'
import type { EchartCustomTooltipProps } from './Echart'

// ── Types ────────────────────────────────────────────────────────────────────

export type AreaChartEventProps = {
  eventType: 'dot' | 'category'
  categoryClicked: string
  [key: string]: unknown
} | null

export interface TooltipCallbackProps {
  active: boolean
  label: string
  payload: { category: string; value: number; color: string }[]
}

export type CustomTooltipProps = EchartCustomTooltipProps

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AreaChartProps<T extends Record<string, any> = Record<string, any>> {
  /** Array of data objects. Each object is one x-axis tick. */
  data: T[]
  /** Key in each data object to use for the x-axis. */
  index: string
  /** Keys in each data object to plot as area series. Also populates legend. */
  categories?: string[]
  /** Hex colors for each category. Cycles if fewer than categories. */
  colors?: string[]
  /** Format y-axis and tooltip values. */
  valueFormatter?: (value: number) => string
  class?: string
  /** How areas relate: overlapping, stacked, or normalized to 100%. */
  type?: 'default' | 'stacked' | 'percent'
  /** Area fill style. */
  fill?: 'gradient' | 'solid' | 'none'
  /** Line curve type. */
  curveType?: 'linear' | 'smooth' | 'step' | 'step-start' | 'step-end'
  /** Whether y-axis labels can show decimals. When false, forces integer ticks. */
  allowDecimals?: boolean
  /** Minimum gap between x-axis labels in pixels. */
  tickGap?: number
  /** Legend placement. */
  legendPosition?: 'left' | 'center' | 'right'
  showXAxis?: boolean
  showYAxis?: boolean
  showGridLines?: boolean
  showTooltip?: boolean
  showLegend?: boolean
  /** Show only first and last x-axis labels. */
  startEndOnly?: boolean
  connectNulls?: boolean
  /** Auto-shrink y-axis minimum to fit data range. */
  autoMinValue?: boolean
  minValue?: number
  maxValue?: number
  yAxisWidth?: number
  xAxisLabel?: string
  yAxisLabel?: string
  /** Custom tooltip formatter. Receives the full ECharts tooltip params. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string | HTMLElement | HTMLElement[]
  /** Render a custom SolidJS component as the tooltip. Overrides tooltipFormatter. */
  customTooltip?: Component<CustomTooltipProps>
  /** Called when the tooltip activates/deactivates. Use to reflect hovered values externally. */
  tooltipCallback?: (props: TooltipCallbackProps) => void
  /** Called when a data point is clicked. Pass null on deselect. */
  onValueChange?: (value: AreaChartEventProps) => void
  /** Additional CSS styles on the container. */
  style?: JSX.CSSProperties
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildAreaStyle(fill: 'gradient' | 'solid' | 'none', color: string) {
  if (fill === 'none') return undefined
  if (fill === 'solid') return { opacity: 0.3 }
  return {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: hexToRgba(color, 0.25) },
      { offset: 1, color: hexToRgba(color, 0) }
    ])
  }
}

function getCurveConfig(curveType: AreaChartProps['curveType']): boolean {
  return curveType === 'smooth' || curveType === undefined
}

function getStepConfig(curveType: AreaChartProps['curveType']): false | 'start' | 'middle' | 'end' {
  switch (curveType) {
    case 'step':
      return 'middle'
    case 'step-start':
      return 'start'
    case 'step-end':
      return 'end'
    default:
      return false
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AreaChart(props: AreaChartProps) {
  const merged = mergeProps(
    {
      categories: [] as string[],
      colors: CHART_PALETTE as unknown as string[],
      fill: 'gradient' as const,
      curveType: 'smooth' as const,
      allowDecimals: true,
      tickGap: 5,
      legendPosition: 'center' as const,
      valueFormatter: (v: number) => String(v),
      yAxisWidth: 56,
      showXAxis: true,
      showYAxis: true,
      showGridLines: true,
      showTooltip: true,
      showLegend: true,
      connectNulls: false,
      startEndOnly: false,
      autoMinValue: false
    },
    props
  )

  const [local, rest] = splitProps(merged, [
    'data',
    'index',
    'categories',
    'colors',
    'valueFormatter',
    'type',
    'fill',
    'curveType',
    'allowDecimals',
    'tickGap',
    'legendPosition',
    'showXAxis',
    'showYAxis',
    'showGridLines',
    'showTooltip',
    'showLegend',
    'startEndOnly',
    'connectNulls',
    'autoMinValue',
    'minValue',
    'maxValue',
    'yAxisWidth',
    'xAxisLabel',
    'yAxisLabel',
    'tooltipFormatter',
    'customTooltip',
    'tooltipCallback',
    'onValueChange'
  ])

  const tooltipRenderer = local.customTooltip
    ? buildSeriesTooltipRenderer(local.customTooltip, local.data)
    : undefined

  const option = createMemo((): EChartsOption => {
    const stacked = local.type === 'stacked' || local.type === 'percent'
    const xData = local.data.map((d) => d[local.index] as string)
    const smooth = getCurveConfig(local.curveType)
    const step = getStepConfig(local.curveType)

    const series = local.categories.map((cat, i) => {
      const color = local.colors[i % local.colors.length]
      return {
        name: cat,
        type: 'line' as const,
        smooth,
        step,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 8,
        data: local.data.map((d) => (d[cat] as number) ?? null),
        itemStyle: { color },
        lineStyle: { color, width: 2 },
        areaStyle: buildAreaStyle(local.fill, color),
        stack: stacked ? 'total' : undefined,
        connectNulls: local.connectNulls,
        emphasis: { focus: 'series' as const }
      }
    })

    let yMin: number | 'dataMin' | undefined = undefined
    if (local.autoMinValue) yMin = 'dataMin'
    if (local.minValue !== undefined) yMin = local.minValue

    const legendAlign =
      local.legendPosition === 'left'
        ? { left: 0 }
        : local.legendPosition === 'right'
          ? { right: 0 }
          : { left: 'center' }

    return {
      color: local.colors,
      tooltip: {
        show: local.showTooltip,
        trigger: 'axis',
        ...(local.customTooltip
          ? {}
          : local.tooltipFormatter
            ? { formatter: local.tooltipFormatter }
            : { valueFormatter: (value) => local.valueFormatter(value as number) })
      },
      legend: {
        show: local.showLegend,
        data: local.categories,
        bottom: 0,
        ...legendAlign
      },
      grid: {
        left: local.showYAxis ? local.yAxisWidth : 16,
        right: 16,
        top: 16,
        bottom: local.showLegend ? 40 : 16
      },
      xAxis: {
        show: local.showXAxis,
        type: 'category',
        boundaryGap: false,
        data: xData,
        axisLabel: local.startEndOnly ? { interval: Math.max(xData.length - 2, 0) } : { rotate: 0 },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        name: local.xAxisLabel,
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'value',
        min: yMin,
        max: local.maxValue,
        minInterval: local.allowDecimals ? undefined : 1,
        axisLabel: {
          show: local.showYAxis,
          formatter: (value: number) => local.valueFormatter(value)
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: local.showGridLines,
          lineStyle: { color: '#f3f4f6' }
        },
        name: local.showYAxis ? local.yAxisLabel : undefined,
        nameLocation: 'middle',
        nameGap: local.yAxisWidth - 12
      },
      series
    }
  })

  const handleSeriesClick = local.onValueChange
    ? (event: { seriesName: string; dataIndex: number }) => {
        const dataPoint = local.data[event.dataIndex]
        local.onValueChange?.({
          eventType: 'dot',
          categoryClicked: event.seriesName,
          ...dataPoint
        })
      }
    : undefined

  const handleAxisPointer = local.tooltipCallback
    ? (event: { dataIndex: number }) => {
        const idx = event.dataIndex
        if (idx == null || idx < 0 || idx >= local.data.length) return
        const dataPoint = local.data[idx]
        local.tooltipCallback?.({
          active: true,
          label: String(dataPoint[local.index]),
          payload: local.categories.map((cat, i) => ({
            category: cat,
            value: (dataPoint[cat] as number) ?? 0,
            color: local.colors[i % local.colors.length]
          }))
        })
      }
    : undefined

  const handleGlobalOut = local.tooltipCallback
    ? () => local.tooltipCallback?.({ active: false, label: '', payload: [] })
    : undefined

  return (
    <Echart
      option={option}
      tooltipRenderer={tooltipRenderer}
      class={rest.class}
      style={rest.style}
      onSeriesClick={handleSeriesClick}
      onAxisPointerUpdate={handleAxisPointer}
      onGlobalOut={handleGlobalOut}
    />
  )
}
