import type { EChartsOption } from 'echarts'
import type { EChartsType } from 'echarts/core'
import { createMemo, createSignal, mergeProps, splitProps } from 'solid-js'
import type { Component, JSX } from 'solid-js'
import Echart, { CHART_COLORS, CHART_PALETTE, buildSeriesTooltipRenderer } from './Echart'
import type { EchartCustomTooltipProps } from './Echart'

export type TooltipProps = EchartCustomTooltipProps

export type ComboChartEventProps =
  | {
      eventType: 'bar' | 'line' | 'category'
      categoryClicked: string
      [key: string]: unknown
    }
  | null
  | undefined

type TooltipCallbackProps = TooltipProps

interface ComboSeriesConfig {
  categories: string[]
  colors?: string[]
  showYAxis?: boolean
  yAxisLabel?: string
  yAxisWidth?: number
  valueFormatter?: (value: number) => string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ComboChartProps<T extends Record<string, any> = Record<string, any>> {
  data: T[]
  index: string
  barSeries: ComboSeriesConfig
  lineSeries: ComboSeriesConfig
  enableBiaxial?: boolean
  showXAxis?: boolean
  showGridLines?: boolean
  showTooltip?: boolean
  showLegend?: boolean
  allowDecimals?: boolean
  autoMinValue?: boolean
  minValue?: number
  maxValue?: number
  tickGap?: number
  startEndOnly?: boolean
  legendPosition?: 'left' | 'center' | 'right'
  onValueChange?: (value: ComboChartEventProps) => void
  tooltipCallback?: (props: TooltipCallbackProps) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter?: (params: any) => string | HTMLElement | HTMLElement[]
  customTooltip?: Component<TooltipProps>
  class?: string
  style?: JSX.CSSProperties
}

function resolveColor(color: string | undefined, index: number): string {
  if (!color) return CHART_PALETTE[index % CHART_PALETTE.length]
  if (color.startsWith('#')) return color
  return (
    CHART_COLORS[color as keyof typeof CHART_COLORS] ?? CHART_PALETTE[index % CHART_PALETTE.length]
  )
}

export default function ComboChart(props: ComboChartProps) {
  const merged = mergeProps(
    {
      enableBiaxial: false,
      showXAxis: true,
      showGridLines: true,
      showTooltip: true,
      showLegend: true,
      allowDecimals: true,
      autoMinValue: false,
      tickGap: 5,
      startEndOnly: false,
      legendPosition: 'right' as const
    },
    props
  )

  const [local, rest] = splitProps(merged, [
    'data',
    'index',
    'barSeries',
    'lineSeries',
    'enableBiaxial',
    'showXAxis',
    'showGridLines',
    'showTooltip',
    'showLegend',
    'allowDecimals',
    'autoMinValue',
    'minValue',
    'maxValue',
    'tickGap',
    'startEndOnly',
    'legendPosition',
    'onValueChange',
    'tooltipCallback',
    'tooltipFormatter',
    'customTooltip'
  ])

  const [activeLegend, setActiveLegend] = createSignal<string | undefined>(undefined)
  const [activePoint, setActivePoint] = createSignal<
    { seriesName: string; dataIndex: number } | undefined
  >(undefined)

  const allCategories = () => [...local.barSeries.categories, ...local.lineSeries.categories]

  const barColors = () =>
    local.barSeries.categories.map((_, i) => resolveColor(local.barSeries.colors?.[i], i))
  const lineColors = () =>
    local.lineSeries.categories.map((_, i) =>
      resolveColor(local.lineSeries.colors?.[i], i + local.barSeries.categories.length)
    )

  const colorByCategory = () => {
    const map = new Map<string, string>()
    local.barSeries.categories.forEach((category, i) => map.set(category, barColors()[i]))
    local.lineSeries.categories.forEach((category, i) => map.set(category, lineColors()[i]))
    return map
  }

  const seriesTypeByCategory = () => {
    const map = new Map<string, 'bar' | 'line'>()
    local.barSeries.categories.forEach((category) => map.set(category, 'bar'))
    local.lineSeries.categories.forEach((category) => map.set(category, 'line'))
    return map
  }

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

  const categoryData = () => local.data.map((item) => String(item[local.index] ?? ''))

  const tooltipRenderer = local.customTooltip
    ? buildSeriesTooltipRenderer(local.customTooltip, local.data)
    : undefined

  const option = createMemo((): EChartsOption => {
    const pointSelection = activePoint()
    const legendSelection = activeLegend()
    const colorMap = colorByCategory()

    const bars = local.barSeries.categories.map((category) => ({
      name: category,
      type: 'bar' as const,
      yAxisIndex: 0,
      data: local.data.map((item, dataIndex) => {
        const value = Number(item[category] ?? 0)
        const opacity = pointSelection
          ? pointSelection.seriesName === category && pointSelection.dataIndex === dataIndex
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
            color: colorMap.get(category),
            opacity
          }
        }
      }),
      emphasis: { focus: 'series' as const }
    }))

    const lines = local.lineSeries.categories.map((category) => ({
      name: category,
      type: 'line' as const,
      yAxisIndex: local.enableBiaxial ? 1 : 0,
      smooth: true,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 7,
      data: local.data.map((item) => Number(item[category] ?? 0)),
      itemStyle: {
        color: colorMap.get(category),
        opacity: legendSelection && legendSelection !== category ? 0.35 : 1
      },
      lineStyle: {
        color: colorMap.get(category),
        width: 2
      },
      emphasis: { focus: 'series' as const }
    }))

    const yAxis = local.enableBiaxial
      ? [
          {
            type: 'value' as const,
            min: valueAxisMin(),
            max: local.maxValue,
            minInterval: local.allowDecimals ? undefined : 1,
            axisLabel: {
              show: local.barSeries.showYAxis ?? true,
              formatter: (value: number) =>
                local.barSeries.valueFormatter
                  ? local.barSeries.valueFormatter(value)
                  : String(value)
            },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: {
              show: local.showGridLines,
              lineStyle: { color: '#f3f4f6' }
            },
            name: local.barSeries.showYAxis === false ? undefined : local.barSeries.yAxisLabel,
            nameLocation: 'middle' as const,
            nameGap: (local.barSeries.yAxisWidth ?? 56) - 12
          },
          {
            type: 'value' as const,
            min: valueAxisMin(),
            max: local.maxValue,
            minInterval: local.allowDecimals ? undefined : 1,
            position: 'right' as const,
            axisLabel: {
              show: local.lineSeries.showYAxis ?? true,
              formatter: (value: number) =>
                local.lineSeries.valueFormatter
                  ? local.lineSeries.valueFormatter(value)
                  : String(value)
            },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            name: local.lineSeries.showYAxis === false ? undefined : local.lineSeries.yAxisLabel,
            nameLocation: 'middle' as const,
            nameGap: (local.lineSeries.yAxisWidth ?? 56) - 12
          }
        ]
      : {
          type: 'value' as const,
          min: valueAxisMin(),
          max: local.maxValue,
          minInterval: local.allowDecimals ? undefined : 1,
          axisLabel: {
            show: local.barSeries.showYAxis ?? true,
            formatter: (value: number) =>
              local.barSeries.valueFormatter
                ? local.barSeries.valueFormatter(value)
                : local.lineSeries.valueFormatter
                  ? local.lineSeries.valueFormatter(value)
                  : String(value)
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            show: local.showGridLines,
            lineStyle: { color: '#f3f4f6' }
          },
          name: local.barSeries.yAxisLabel ?? local.lineSeries.yAxisLabel,
          nameLocation: 'middle' as const,
          nameGap: (local.barSeries.yAxisWidth ?? 56) - 12
        }

    return {
      color: [...barColors(), ...lineColors()],
      tooltip: {
        show: local.showTooltip,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...(local.customTooltip
          ? {}
          : local.tooltipFormatter
            ? { formatter: local.tooltipFormatter }
            : {})
      },
      legend: {
        show: local.showLegend,
        data: allCategories(),
        bottom: 0,
        ...legendAlign()
      },
      grid: {
        left: local.barSeries.showYAxis === false ? 16 : (local.barSeries.yAxisWidth ?? 56),
        right:
          local.enableBiaxial && local.lineSeries.showYAxis !== false
            ? (local.lineSeries.yAxisWidth ?? 56)
            : 16,
        top: 16,
        bottom: local.showLegend ? 42 : 16
      },
      xAxis: {
        show: local.showXAxis,
        type: 'category',
        data: categoryData(),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
        axisLabel: local.startEndOnly
          ? {
              formatter: (value: string, index: number) =>
                index === 0 || index === categoryData().length - 1 ? value : '',
              margin: local.tickGap
            }
          : { margin: local.tickGap }
      },
      yAxis,
      series: [...bars, ...lines]
    }
  })

  const clearSelection = () => {
    setActiveLegend(undefined)
    setActivePoint(undefined)
    local.onValueChange?.(null)
  }

  const handleSeriesClick = local.onValueChange
    ? (event: { seriesName: string; dataIndex: number }) => {
        const active = activePoint()
        if (active?.seriesName === event.seriesName && active.dataIndex === event.dataIndex) {
          clearSelection()
          return
        }

        const point = local.data[event.dataIndex]
        const seriesType = seriesTypeByCategory().get(event.seriesName) ?? 'bar'
        setActiveLegend(event.seriesName)
        setActivePoint({ seriesName: event.seriesName, dataIndex: event.dataIndex })

        local.onValueChange?.({
          eventType: seriesType,
          categoryClicked: event.seriesName,
          ...point
        })
      }
    : undefined

  const handleAxisPointer = local.tooltipCallback
    ? (event: { dataIndex: number }) => {
        const index = event.dataIndex
        if (index == null || index < 0 || index >= local.data.length) return
        const point = local.data[index]
        local.tooltipCallback?.({
          active: true,
          label: String(point[local.index] ?? ''),
          payload: allCategories().map((category) => ({
            category,
            value: Number(point[category] ?? 0),
            color: colorByCategory().get(category) ?? '',
            payload: point
          }))
        })
      }
    : undefined

  const handleGlobalOut = local.tooltipCallback
    ? () => local.tooltipCallback?.({ active: false, label: '', payload: [] })
    : undefined

  const handleInit = (instance: EChartsType) => {
    instance.on('legendselectchanged', (rawEvent) => {
      if (!local.onValueChange) return
      const event = rawEvent as { name: string }
      const selectedCategory = event.name
      const activeCategory = activeLegend()

      if (selectedCategory === activeCategory && !activePoint()) {
        clearSelection()
      } else {
        setActiveLegend(selectedCategory)
        setActivePoint(undefined)
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
      if (activeLegend() || activePoint()) clearSelection()
    })
  }

  return (
    <Echart
      option={option}
      class={rest.class}
      style={rest.style}
      tooltipRenderer={tooltipRenderer}
      onSeriesClick={handleSeriesClick}
      onAxisPointerUpdate={handleAxisPointer}
      onGlobalOut={handleGlobalOut}
      onInit={handleInit}
    />
  )
}
