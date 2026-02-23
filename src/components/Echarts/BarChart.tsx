import type { EChartsOption } from 'echarts'
import type { EChartsType } from 'echarts/core'
import { createMemo, createSignal, mergeProps, splitProps } from 'solid-js'
import type { Component, JSX } from 'solid-js'
import Echart, { CHART_PALETTE, buildSeriesTooltipRenderer } from './Echart'
import type { EchartCustomTooltipProps } from './Echart'

export type BaseBarChartEventProps = {
  eventType: 'category' | 'bar'
  categoryClicked: string
  [key: string]: unknown
}

export type BarChartEventProps = BaseBarChartEventProps | null | undefined

export type BarChartCustomTooltipProps = EchartCustomTooltipProps

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BarChartProps<T extends Record<string, any> = Record<string, any>> {
  data: T[]
  index: string
  categories: string[]
  valueFormatter?: (value: number) => string
  startEndOnly?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  showGridLines?: boolean
  yAxisWidth?: number
  intervalType?: 'preserveStartEnd' | 'equidistantPreserveStart'
  showTooltip?: boolean
  showLegend?: boolean
  autoMinValue?: boolean
  minValue?: number
  maxValue?: number
  allowDecimals?: boolean
  onValueChange?: (value: BarChartEventProps) => void
  enableLegendSlider?: boolean
  tickGap?: number
  barCategoryGap?: string | number
  xAxisLabel?: string
  yAxisLabel?: string
  layout?: 'vertical' | 'horizontal'
  type?: 'default' | 'stacked'
  legendPosition?: 'left' | 'center' | 'right'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string | HTMLElement | HTMLElement[]
  customTooltip?: Component<BarChartCustomTooltipProps>
  class?: string
  style?: JSX.CSSProperties
  colors?: string[]
}

const POSITIVE_BAR_COLOR = '#10b981'
const NEGATIVE_BAR_COLOR = '#f43f5e'

export default function BarChart(props: BarChartProps) {
  const merged = mergeProps(
    {
      data: [] as Record<string, unknown>[],
      categories: [] as string[],
      valueFormatter: (value: number) => value.toString(),
      startEndOnly: false,
      showXAxis: true,
      showYAxis: true,
      showGridLines: true,
      yAxisWidth: 56,
      intervalType: 'equidistantPreserveStart' as const,
      showTooltip: true,
      showLegend: true,
      autoMinValue: false,
      allowDecimals: true,
      enableLegendSlider: false,
      tickGap: 5,
      layout: 'horizontal' as const,
      type: 'default' as const,
      legendPosition: 'right' as const,
      colors: CHART_PALETTE as unknown as string[]
    },
    props
  )

  const [local, rest] = splitProps(merged, [
    'data',
    'index',
    'categories',
    'valueFormatter',
    'startEndOnly',
    'showXAxis',
    'showYAxis',
    'showGridLines',
    'yAxisWidth',
    'intervalType',
    'showTooltip',
    'showLegend',
    'autoMinValue',
    'minValue',
    'maxValue',
    'allowDecimals',
    'onValueChange',
    'enableLegendSlider',
    'tickGap',
    'barCategoryGap',
    'xAxisLabel',
    'yAxisLabel',
    'layout',
    'type',
    'legendPosition',
    'tooltipFormatter',
    'customTooltip',
    'colors'
  ])

  const [activeLegend, setActiveLegend] = createSignal<string | undefined>(undefined)
  const [activeBar, setActiveBar] = createSignal<
    { seriesName: string; dataIndex: number } | undefined
  >(undefined)

  const clearSelection = () => {
    setActiveLegend(undefined)
    setActiveBar(undefined)
    local.onValueChange?.(null)
  }

  const categoryData = () => local.data.map((item) => String(item[local.index] ?? ''))

  const valueAxisMin = () => {
    if (local.minValue !== undefined) return local.minValue
    if (local.autoMinValue) return 'dataMin' as const
    return undefined
  }

  const legendAlign = () => {
    if (local.legendPosition === 'left') return { left: 0 }
    if (local.legendPosition === 'center') return { left: 'center' as const }
    return { right: 0 }
  }

  const isHorizontalLayout = () => local.layout !== 'vertical'
  const isStacked = () => local.type === 'stacked'

  const categoryAxisLabelFormatter = (value: string, index: number) => {
    if (!local.startEndOnly) return value
    return index === 0 || index === categoryData().length - 1 ? value : ''
  }

  const resolveBarColor = (value: number, categoryIndex: number) => {
    if (local.categories.length === 1) {
      return value >= 0 ? POSITIVE_BAR_COLOR : NEGATIVE_BAR_COLOR
    }
    return local.colors[categoryIndex % local.colors.length]
  }

  const tooltipRenderer = local.customTooltip
    ? buildSeriesTooltipRenderer(local.customTooltip, local.data)
    : undefined

  const option = createMemo((): EChartsOption => {
    const barSelection = activeBar()
    const legendSelection = activeLegend()
    const data = local.data

    const series = local.categories.map((category, categoryIndex) => ({
      name: category,
      type: 'bar' as const,
      stack: isStacked() ? 'stack' : undefined,
      barCategoryGap: local.barCategoryGap,
      data: data.map((item, dataIndex) => {
        const value = Number(item[category] ?? 0)
        const opacity = barSelection
          ? barSelection.seriesName === category && barSelection.dataIndex === dataIndex
            ? 1
            : 0.35
          : legendSelection
            ? legendSelection === category
              ? 1
              : 0.35
            : 1

        return {
          value,
          itemStyle: {
            color: resolveBarColor(value, categoryIndex),
            opacity
          }
        }
      }),
      emphasis: {
        focus: 'series' as const
      }
    }))

    const commonCategoryAxis = {
      type: 'category' as const,
      data: categoryData(),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: {
        show: true,
        margin: local.tickGap,
        hideOverlap: true,
        formatter: categoryAxisLabelFormatter
      },
      nameLocation: 'middle' as const,
      nameGap: 30
    }

    const commonValueAxis = {
      type: 'value' as const,
      min: valueAxisMin(),
      max: local.maxValue,
      minInterval: local.allowDecimals ? undefined : 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        show: local.showGridLines,
        lineStyle: { color: '#f3f4f6' }
      },
      axisLabel: {
        formatter: (value: number) => local.valueFormatter(value)
      },
      nameLocation: 'middle' as const,
      nameGap: local.yAxisWidth - 12
    }

    const xAxis = isHorizontalLayout()
      ? {
          ...commonCategoryAxis,
          show: local.showXAxis,
          name: local.showXAxis ? local.xAxisLabel : undefined
        }
      : {
          ...commonValueAxis,
          show: local.showXAxis,
          name: local.showXAxis ? local.xAxisLabel : undefined
        }

    const yAxis = isHorizontalLayout()
      ? {
          ...commonValueAxis,
          show: local.showYAxis,
          name: local.showYAxis ? local.yAxisLabel : undefined
        }
      : {
          ...commonCategoryAxis,
          show: local.showYAxis,
          name: local.showYAxis ? local.yAxisLabel : undefined
        }

    return {
      animationDuration: 220,
      legend: {
        show: local.showLegend,
        type: local.enableLegendSlider ? 'scroll' : 'plain',
        data: local.categories,
        bottom: 0,
        ...legendAlign()
      },
      tooltip: {
        show: local.showTooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...(local.customTooltip
          ? {}
          : local.tooltipFormatter
            ? { formatter: local.tooltipFormatter }
            : { valueFormatter: (value: unknown) => local.valueFormatter(Number(value)) })
      },
      grid: {
        left: local.showYAxis ? local.yAxisWidth : 16,
        right: 16,
        top: 16,
        bottom: (local.showLegend ? 42 : 16) + (local.xAxisLabel ? 12 : 0)
      },
      xAxis,
      yAxis,
      series
    }
  })

  const handleSeriesClick = local.onValueChange
    ? (event: { seriesName: string; dataIndex: number }) => {
        const active = activeBar()
        if (active?.seriesName === event.seriesName && active.dataIndex === event.dataIndex) {
          clearSelection()
          return
        }

        const dataPoint = local.data[event.dataIndex]
        setActiveLegend(event.seriesName)
        setActiveBar({ seriesName: event.seriesName, dataIndex: event.dataIndex })

        local.onValueChange?.({
          eventType: 'bar',
          categoryClicked: event.seriesName,
          ...dataPoint
        })
      }
    : undefined

  const handleInit = (instance: EChartsType) => {
    instance.on('legendselectchanged', (rawEvent) => {
      const event = rawEvent as { name: string }
      if (!local.onValueChange) return
      const selectedCategory = event.name
      const activeCategory = activeLegend()

      if (selectedCategory === activeCategory && !activeBar()) {
        clearSelection()
      } else {
        setActiveLegend(selectedCategory)
        setActiveBar(undefined)
        local.onValueChange?.({
          eventType: 'category',
          categoryClicked: selectedCategory
        })
      }

      instance.dispatchAction({ type: 'legendAllSelect' })
    })

    instance.getZr().on('click', (event: { target?: unknown }) => {
      if (!local.onValueChange) return
      if (event.target) return
      if (activeLegend() || activeBar()) {
        clearSelection()
      }
    })
  }

  return (
    <Echart
      option={option}
      tooltipRenderer={tooltipRenderer}
      class={rest.class}
      style={rest.style}
      onInit={handleInit}
      onSeriesClick={handleSeriesClick}
    />
  )
}
