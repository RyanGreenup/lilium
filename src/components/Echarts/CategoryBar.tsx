import { CHART_PALETTE } from './Echart'
import { createMemo, For, mergeProps, Show, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'

export interface CategoryBarMarker {
  value: number
  tooltip?: string
  showAnimation?: boolean
}

export interface CategoryBarProps {
  values: number[]
  marker?: CategoryBarMarker
  colors?: string[]
  class?: string
  style?: JSX.CSSProperties
}

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

const isCssColor = (value: string) => value.startsWith('#') || value.startsWith('rgb')

export default function CategoryBar(props: CategoryBarProps) {
  const merged = mergeProps(
    {
      values: [] as number[],
      colors: CHART_PALETTE as unknown as string[]
    },
    props
  )

  const [local, rest] = splitProps(merged, ['values', 'marker', 'colors', 'class'])

  const safeValues = createMemo(() => local.values.map((value) => Math.max(0, Number(value) || 0)))
  const totalValue = createMemo(() => safeValues().reduce((sum, value) => sum + value, 0))

  const markerPercent = createMemo(() => {
    const marker = local.marker
    const total = totalValue()
    if (!marker || total <= 0) return null
    const pct = (marker.value / total) * 100
    return Math.max(0, Math.min(100, pct))
  })

  const resolveSegmentPercent = (value: number) => {
    const total = totalValue()
    if (total <= 0) return 0
    return (value / total) * 100
  }

  const resolveColor = (index: number) => {
    const colors = local.colors
    const value = colors[index % colors.length]
    if (!value) return CHART_PALETTE[index % CHART_PALETTE.length]
    const normalized = value.toLowerCase()
    if (isCssColor(normalized)) return value
    return NAMED_COLORS[normalized] ?? value
  }

  return (
    <div class={local.class} style={rest.style}>
      <div class="relative">
        <div class="flex h-2 w-full overflow-hidden rounded-full bg-base-300/70">
          <For each={safeValues()}>
            {(value, index) => (
              <div
                class="h-full transition-all duration-300"
                style={{
                  width: `${resolveSegmentPercent(value)}%`,
                  'background-color': resolveColor(index())
                }}
              />
            )}
          </For>
        </div>

        <Show when={markerPercent() !== null && local.marker}>
          <div
            class="pointer-events-none absolute inset-y-0"
            style={{ left: `calc(${markerPercent()}% - 1px)` }}
          >
            <span class="absolute -top-1 bottom-0 w-0.5 bg-base-content/70" />
            <Show when={local.marker?.showAnimation}>
              <span class="absolute top-1/2 block size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-base-content/70 animate-ping" />
            </Show>
            <span class="absolute top-1/2 block size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-base-content" />
            <Show when={local.marker?.tooltip}>
              <span class="absolute -top-8 -translate-x-1/2 whitespace-nowrap rounded-md bg-base-content px-2 py-1 text-xs font-medium text-base-100">
                {local.marker?.tooltip}
              </span>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}
