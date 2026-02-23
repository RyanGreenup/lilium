import * as echarts from 'echarts/core'
import type { EChartsOption } from 'echarts'
import type { Component, JSX } from 'solid-js'
import { createMemo, mergeProps, splitProps } from 'solid-js'
import Echart, { CHART_PALETTE, buildSeriesTooltipRenderer } from './Echart'
import type { EchartCustomTooltipProps } from './Echart'

type SparkChartType = 'area' | 'line' | 'bar'

export type SparkChartEventProps = {
  eventType: 'dot' | 'bar'
  categoryClicked: string
  [key: string]: unknown
} | null

export type SparkChartCustomTooltipProps = EchartCustomTooltipProps

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SparkChartProps<T extends Record<string, any> = Record<string, any>> {
  data: T[]
  index: string
  categories?: string[]
  colors?: string[]
  valueFormatter?: (value: number) => string
  class?: string
  style?: JSX.CSSProperties
  showTooltip?: boolean
  connectNulls?: boolean
  curveType?: 'linear' | 'smooth' | 'step' | 'step-start' | 'step-end'
  fill?: 'gradient' | 'solid' | 'none'
  autoMinValue?: boolean
  minValue?: number
  maxValue?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string | HTMLElement | HTMLElement[]
  customTooltip?: Component<SparkChartCustomTooltipProps>
  onValueChange?: (value: SparkChartEventProps) => void
}

interface SparkChartBaseProps extends SparkChartProps {
  chartType: SparkChartType
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return `rgba(59, 130, 246, ${alpha})`
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function buildAreaStyle(fill: NonNullable<SparkChartProps['fill']>, color: string) {
  if (fill === 'none') return undefined
  if (fill === 'solid') return { opacity: 0.3 }
  return {
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: hexToRgba(color, 0.3) },
      { offset: 1, color: hexToRgba(color, 0) }
    ])
  }
}

function getStepConfig(
  curveType: NonNullable<SparkChartProps['curveType']>
): false | 'start' | 'middle' | 'end' {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveCategories(data: Record<string, any>[], index: string, categories: string[]) {
  if (categories.length > 0) return categories
  const first = data[0]
  if (!first) return []
  return Object.keys(first).filter((key) => key !== index && typeof first[key] === 'number')
}

function toNumber(value: unknown): number | null {
  if (value == null) return null
  const next = Number(value)
  return Number.isFinite(next) ? next : null
}

function SparkChartBase(props: SparkChartBaseProps) {
  const merged = mergeProps(
    {
      categories: [] as string[],
      colors: CHART_PALETTE as unknown as string[],
      valueFormatter: (value: number) => value.toString(),
      showTooltip: true,
      connectNulls: true,
      curveType: 'smooth' as const,
      fill: 'gradient' as const,
      autoMinValue: true
    },
    props
  )

  const [local, rest] = splitProps(merged, [
    'data',
    'index',
    'categories',
    'colors',
    'valueFormatter',
    'showTooltip',
    'connectNulls',
    'curveType',
    'fill',
    'autoMinValue',
    'minValue',
    'maxValue',
    'tooltipFormatter',
    'customTooltip',
    'onValueChange',
    'chartType'
  ])

  const resolvedCategories = createMemo(() =>
    resolveCategories(local.data as Record<string, unknown>[], local.index, local.categories)
  )

  const tooltipRenderer = local.customTooltip
    ? buildSeriesTooltipRenderer(local.customTooltip, local.data)
    : undefined

  const option = createMemo((): EChartsOption => {
    const categories = resolvedCategories()
    const xData = local.data.map((row) => String(row[local.index] ?? ''))
    const smooth = local.curveType === 'smooth'
    const step = getStepConfig(local.curveType)

    const series = categories.map((category, categoryIndex) => {
      const color = local.colors[categoryIndex % local.colors.length]
      const points = local.data.map((row) => toNumber(row[category]))
      if (local.chartType === 'bar') {
        return {
          name: category,
          type: 'bar' as const,
          data: points,
          barMaxWidth: 9,
          itemStyle: { color }
        }
      }
      return {
        name: category,
        type: 'line' as const,
        data: points,
        smooth,
        step,
        connectNulls: local.connectNulls,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: local.chartType === 'area' ? buildAreaStyle(local.fill, color) : undefined
      }
    })

    const valueAxisMin =
      local.minValue !== undefined ? local.minValue : local.autoMinValue ? 'dataMin' : undefined

    return {
      animationDuration: 180,
      color: local.colors,
      tooltip: {
        show: local.showTooltip,
        trigger: 'axis',
        axisPointer: { type: local.chartType === 'bar' ? 'shadow' : 'line' },
        ...(local.customTooltip
          ? {}
          : local.tooltipFormatter
            ? { formatter: local.tooltipFormatter }
            : { valueFormatter: (value: unknown) => local.valueFormatter(Number(value)) })
      },
      grid: {
        left: 2,
        right: 2,
        top: 2,
        bottom: 2,
        containLabel: false
      },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: local.chartType === 'bar',
        show: false
      },
      yAxis: {
        type: 'value',
        show: false,
        scale: true,
        min: valueAxisMin,
        max: local.maxValue,
        splitLine: { show: false }
      },
      series
    }
  })

  const handleSeriesClick = local.onValueChange
    ? (event: { seriesName: string; dataIndex: number }) => {
        const dataPoint = local.data[event.dataIndex]
        local.onValueChange?.({
          eventType: local.chartType === 'bar' ? 'bar' : 'dot',
          categoryClicked: event.seriesName,
          ...dataPoint
        })
      }
    : undefined

  return (
    <Echart
      option={option}
      tooltipRenderer={tooltipRenderer}
      class={rest.class}
      style={rest.style}
      onSeriesClick={handleSeriesClick}
    />
  )
}

export function SparkAreaChart(props: SparkChartProps) {
  return <SparkChartBase {...props} chartType="area" />
}

export function SparkLineChart(props: SparkChartProps) {
  return <SparkChartBase {...props} chartType="line" />
}

export function SparkBarChart(props: SparkChartProps) {
  return <SparkChartBase {...props} chartType="bar" />
}
