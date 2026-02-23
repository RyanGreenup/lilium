import type { EChartsOption } from 'echarts'
import type { EChartsType } from 'echarts/core'
import type { Component, JSX } from 'solid-js'
import { createMemo, mergeProps, splitProps } from 'solid-js'
import Echart, { CHART_PALETTE, buildSeriesTooltipRenderer } from './Echart'
import type { EchartCustomTooltipProps } from './Echart'

export type LineChartEventProps = {
  eventType: 'dot' | 'category'
  categoryClicked: string
  [key: string]: unknown
} | null

export interface TooltipProps {
  active: boolean
  label: string
  payload: { category: string; value: number; color: string; payload: Record<string, unknown> }[]
}

export type LineChartCustomTooltipProps = EchartCustomTooltipProps

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface LineChartProps<T extends Record<string, any> = Record<string, any>> {
  data: T[]
  index: string
  categories: string[]
  colors?: string[]
  valueFormatter?: (value: number) => string
  curveType?: 'linear' | 'smooth' | 'step' | 'step-start' | 'step-end'
  allowDecimals?: boolean
  tickGap?: number
  legendPosition?: 'left' | 'center' | 'right'
  showXAxis?: boolean
  showYAxis?: boolean
  showGridLines?: boolean
  showTooltip?: boolean
  showLegend?: boolean
  startEndOnly?: boolean
  connectNulls?: boolean
  autoMinValue?: boolean
  minValue?: number
  maxValue?: number
  yAxisWidth?: number
  xAxisLabel?: string
  yAxisLabel?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string | HTMLElement | HTMLElement[]
  customTooltip?: Component<LineChartCustomTooltipProps>
  tooltipCallback?: (props: TooltipProps) => void
  onValueChange?: (value: LineChartEventProps) => void
  class?: string
  style?: JSX.CSSProperties
}

function getStepConfig(curveType: LineChartProps['curveType']): false | 'start' | 'middle' | 'end' {
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

export default function LineChart(props: LineChartProps) {
  const merged = mergeProps(
    {
      categories: [] as string[],
      colors: CHART_PALETTE as unknown as string[],
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
    const xData = local.data.map((d) => String(d[local.index] ?? ''))
    const smooth = local.curveType === undefined || local.curveType === 'smooth'
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
        connectNulls: local.connectNulls,
        data: local.data.map((d) => (d[cat] as number | null) ?? null),
        itemStyle: { color },
        lineStyle: { color, width: 2 },
        emphasis: { focus: 'series' as const }
      }
    })

    let yMin: number | 'dataMin' | undefined
    if (local.autoMinValue) yMin = 'dataMin'
    if (local.minValue !== undefined) yMin = local.minValue

    const legendAlign =
      local.legendPosition === 'left'
        ? { left: 0 }
        : local.legendPosition === 'right'
          ? { right: 0 }
          : { left: 'center' as const }

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
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: local.startEndOnly ? { interval: Math.max(xData.length - 2, 0) } : undefined,
        name: local.showXAxis ? local.xAxisLabel : undefined,
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
          label: String(dataPoint[local.index] ?? ''),
          payload: local.categories.map((cat, i) => ({
            category: cat,
            value: Number(dataPoint[cat] ?? 0),
            color: local.colors[i % local.colors.length],
            payload: (dataPoint as Record<string, unknown>) ?? {}
          }))
        })
      }
    : undefined

  const handleGlobalOut = local.tooltipCallback
    ? () => local.tooltipCallback?.({ active: false, label: '', payload: [] })
    : undefined

  const handleInit = local.onValueChange
    ? (instance: EChartsType) => {
        instance.on('legendselectchanged', (rawEvent) => {
          const event = rawEvent as { name: string }
          local.onValueChange?.({
            eventType: 'category',
            categoryClicked: event.name
          })
          instance.dispatchAction({ type: 'legendAllSelect' })
        })
      }
    : undefined

  return (
    <Echart
      option={option}
      tooltipRenderer={tooltipRenderer}
      class={rest.class}
      style={rest.style}
      onInit={handleInit}
      onSeriesClick={handleSeriesClick}
      onAxisPointerUpdate={handleAxisPointer}
      onGlobalOut={handleGlobalOut}
    />
  )
}
