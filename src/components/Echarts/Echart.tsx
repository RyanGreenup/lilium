import * as echarts from 'echarts/core'
import type { EChartsOption, SetOptionOpts } from 'echarts'
import type { ECharts } from 'echarts/core'
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  GaugeChart,
  FunnelChart,
  HeatmapChart,
  SunburstChart,
  TreemapChart,
  GraphChart,
} from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
  VisualMapComponent,
  PolarComponent,
  RadarComponent,
  GraphicComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { Accessor, Component, JSX } from 'solid-js'
import { createEffect, onCleanup, onMount } from 'solid-js'
import { unwrap } from 'solid-js/store'
import { render } from 'solid-js/web'

// Register components once — must happen before any echarts.init() call.
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  GaugeChart,
  FunnelChart,
  HeatmapChart,
  SunburstChart,
  TreemapChart,
  GraphChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  DatasetComponent,
  ToolboxComponent,
  VisualMapComponent,
  PolarComponent,
  RadarComponent,
  GraphicComponent,
  CanvasRenderer,
])

// ── Default palette ──────────────────────────────────────────────────────────
// Consumers can import individual colors or spread CHART_PALETTE into option.color
// so ECharts auto-cycles them across series.
export const CHART_COLORS = {
  blue: '#3b82f6',
  violet: '#8b5cf6',
  red: '#ef4444',
  green: '#10b981',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  gray: '#9ca3af',
  grayLight: '#ebedf0',
} as const

/** Ready-made array for `option.color` — ECharts cycles through these for series. */
export const CHART_PALETTE = [
  CHART_COLORS.blue,
  CHART_COLORS.violet,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.cyan,
  CHART_COLORS.red,
] as const

// ── Event types ─────────────────────────────────────────────────────────────
// Lightweight wrappers so consumers don't need to import ECharts event types.

/** Payload for a click on a series element (bar, dot, line segment, etc.). */
export interface EchartSeriesClickEvent {
  seriesName: string
  dataIndex: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/** Payload for an axis-pointer move (tooltip hover). */
export interface EchartAxisPointerEvent {
  /** Index of the hovered data point on the primary axis. */
  dataIndex: number
  /** Raw axis value (category string or numeric value). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  axisValue: any
}

export interface EchartCustomTooltipPayloadItem {
  category: string
  value: number
  color: string
  payload: Record<string, unknown>
}

export interface EchartCustomTooltipProps {
  active: boolean
  label: string
  payload: EchartCustomTooltipPayloadItem[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSeriesTooltipRenderer<T extends Record<string, any>>(
  Tooltip: Component<EchartCustomTooltipProps>,
  data: T[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (params: any) => JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (params: any) => {
    const items = Array.isArray(params) ? params : [params]
    const label = String(items[0]?.axisValueLabel ?? items[0]?.name ?? '')
    const payload = items.map((item) => ({
      category: String(item.seriesName ?? ''),
      value: Number(item.value ?? 0),
      color: String(item.color ?? ''),
      payload: data[Number(item.dataIndex ?? -1)] ?? {}
    }))
    return <Tooltip active={true} label={label} payload={payload} />
  }
}

export interface EchartProps {
  /** Accessor returning the ECharts option. Must be a function to preserve reactivity. */
  option: Accessor<EChartsOption>
  /** Theme name or object. Init-only — changes after mount require remount. */
  theme?: string | object
  class?: string
  style?: JSX.CSSProperties
  width?: number
  height?: number
  /** Passed to setOption — controls merge behaviour, animation, etc. */
  setOptionOpts?: SetOptionOpts
  /** Replay entrance animation after initial resize settles (default: true). */
  animateOnMount?: boolean
  /** Called once after the chart instance is created. Use for advanced/custom event registration. */
  onInit?: (instance: ECharts) => void

  // ── Declarative event handlers ──────────────────────────────────────────
  /** Fired when a series element (dot, bar, etc.) is clicked. */
  onSeriesClick?: (event: EchartSeriesClickEvent) => void
  /** Fired when the axis pointer (tooltip crosshair) moves to a new data point. */
  onAxisPointerUpdate?: (event: EchartAxisPointerEvent) => void
  /** Fired when the mouse leaves the chart area entirely. */
  onGlobalOut?: () => void

  // ── Tooltip rendering ──────────────────────────────────────────────────
  /**
   * SolidJS render function for custom tooltips. Echart handles mounting the
   * component into a detached DOM node and disposing previous renders on each
   * tooltip update. When provided, the tooltip is auto-configured with
   * transparent background and no border/padding — overriding any
   * tooltip.formatter in the option.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipRenderer?: (params: any) => JSX.Element
}

export default function Echart(props: EchartProps) {
  let containerRef!: HTMLDivElement
  let instance: ECharts | null = null
  let disposed = false
  let ro: ResizeObserver | null = null
  let disposeTooltip: (() => void) | null = null

  const rawOption = () => unwrap(props.option()) as EChartsOption

  /** Resolve daisyUI v5 color tokens from the current theme via CSS custom properties. */
  const resolveThemeColors = () => {
    const style = getComputedStyle(document.documentElement)
    return {
      bg: style.getPropertyValue('--color-base-100').trim(),
      border: style.getPropertyValue('--color-base-300').trim(),
      text: style.getPropertyValue('--color-base-content').trim()
    }
  }

  /** Return the option with theme-aware tooltip defaults and SolidJS renderer when provided. */
  const finalOption = (): EChartsOption => {
    const opt = rawOption()
    const theme = resolveThemeColors()
    const base = Array.isArray(opt.tooltip) ? {} : (opt.tooltip ?? {})
    const renderer = props.tooltipRenderer

    if (!renderer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = base as any
      return {
        ...opt,
        tooltip: {
          ...base,
          backgroundColor: b.backgroundColor ?? theme.bg,
          borderColor: b.borderColor ?? theme.border,
          textStyle: { color: theme.text, ...b.textStyle }
        }
      }
    }

    return {
      ...opt,
      tooltip: {
        ...base,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          if (disposeTooltip) disposeTooltip()
          const container = document.createElement('div')
          disposeTooltip = render(() => renderer(params), container)
          return container
        },
        padding: 0,
        borderWidth: 0,
        backgroundColor: 'transparent',
      },
    }
  }

  const applyExplicitSize = (inst: ECharts) => {
    if (typeof props.width !== 'number' && typeof props.height !== 'number') return
    inst.resize({ width: props.width, height: props.height })
  }

  const initChart = () => {
    instance = echarts.init(containerRef, props.theme ?? null, {
      renderer: 'canvas',
    })
    // When animateOnMount is enabled, defer setOption to the next frame so
    // the ResizeObserver's initial resize settles on an empty chart first.
    // The option is applied once — from empty — giving a clean entrance
    // animation with no flicker.
    if (props.animateOnMount === false) {
      instance.setOption(finalOption(), props.setOptionOpts)
    }
    applyExplicitSize(instance)
    props.onInit?.(instance)

    // Declarative event handlers — registered once at init.
    if (props.onSeriesClick) {
      instance.on('click', 'series', (params) => {
        props.onSeriesClick?.({
          ...params,
          seriesName: params.seriesName as string,
          dataIndex: params.dataIndex as number,
          data: params.data,
        })
      })
    }
    if (props.onAxisPointerUpdate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instance.on('updateAxisPointer', (event: any) => {
        const axesInfo = event.axesInfo?.[0]
        if (!axesInfo) return
        props.onAxisPointerUpdate?.({
          dataIndex: axesInfo.value as number,
          axisValue: axesInfo.value,
        })
      })
    }
    if (props.onGlobalOut) {
      instance.on('globalout', () => {
        props.onGlobalOut?.()
      })
    }
  }

  onMount(() => {
    // ECharts calls getComputedStyle during init, which requires the container
    // to be connected to the document. SolidJS assigns refs before DOM
    // insertion, so defer to the next frame to guarantee the element is live.
    requestAnimationFrame(() => {
      if (disposed) return
      initChart()

      // ResizeObserver covers both window resize and container resize (e.g.
      // sidebar toggle) — no separate window listener needed.
      // Stored in component-scoped variable because onCleanup cannot register
      // inside an async callback (rAF) — the SolidJS owner is gone by then.
      ro = new ResizeObserver(() => {
        if (instance && !disposed) instance.resize()
      })
      ro.observe(containerRef)

      // Apply the option after one more frame so the ResizeObserver's
      // initial resize fires against an empty instance (nothing to disrupt).
      // ECharts then sees empty → data and plays the entrance animation.
      if (props.animateOnMount !== false) {
        const inst = instance
        if (!inst) return
        requestAnimationFrame(() => {
          if (disposed || inst.isDisposed()) return
          inst.setOption(finalOption(), props.setOptionOpts)
        })
      }
    })
  })

  // Reactively update when option/size props change. The !instance guard
  // prevents duplicate work during init (instance is null until rAF fires).
  createEffect(() => {
    // Track reactive inputs — props.option() calls the accessor, registering
    // a dependency on whatever signal/memo produces the option.
    const opt = finalOption()
    props.width
    props.height

    if (!instance || disposed) return

    instance.setOption(opt, {
      notMerge: true,
      ...props.setOptionOpts,
    })
    applyExplicitSize(instance)
  })

  onCleanup(() => {
    disposed = true
    if (disposeTooltip) disposeTooltip()
    ro?.disconnect()
    ro = null
    if (instance && !instance.isDisposed()) {
      instance.dispose()
    }
    instance = null
  })

  return (
    <div
      class={`relative w-full ${props.class || ''}`}
      style={props.style}
      ref={containerRef}
    />
  )
}
