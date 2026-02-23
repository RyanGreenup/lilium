import { createMemo, createSignal, For, mergeProps, Show, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'

export interface BarListDataPoint extends Record<string, unknown> {
  name: string
  value: number
  href?: string
}

export type BarListEventProps<T extends BarListDataPoint = BarListDataPoint> = T | null

export interface BarListProps<T extends BarListDataPoint = BarListDataPoint> {
  data: T[]
  sortOrder?: 'ascending' | 'descending' | 'none'
  valueFormatter?: (value: number) => string
  onValueChange?: (value: BarListEventProps<T>) => void
  class?: string
  style?: JSX.CSSProperties
}

export default function BarList(props: BarListProps) {
  const merged = mergeProps(
    {
      sortOrder: 'descending' as const,
      valueFormatter: (value: number) => Intl.NumberFormat('en-US').format(value)
    },
    props
  )

  const [local, rest] = splitProps(merged, [
    'data',
    'sortOrder',
    'valueFormatter',
    'onValueChange'
  ])

  const [selectedName, setSelectedName] = createSignal<string | null>(null)

  const sortedData = createMemo(() => {
    const rows = [...local.data]
    if (local.sortOrder === 'none') return rows
    const sortFactor = local.sortOrder === 'ascending' ? 1 : -1
    return rows.sort((a, b) => (a.value - b.value) * sortFactor)
  })

  const maxValue = createMemo(() =>
    sortedData().reduce((max, row) => Math.max(max, row.value), Number.NEGATIVE_INFINITY)
  )

  const resolveBarPercent = (value: number) => {
    const max = maxValue()
    if (!Number.isFinite(max) || max <= 0) return 0
    return Math.max(0, Math.min(100, (value / max) * 100))
  }

  const handleSelect = (item: BarListDataPoint) => {
    if (!local.onValueChange) return
    if (selectedName() === item.name) {
      setSelectedName(null)
      local.onValueChange(null)
      return
    }
    setSelectedName(item.name)
    local.onValueChange(item)
  }

  return (
    <div class={rest.class} style={rest.style}>
      <ul class="space-y-3">
        <For each={sortedData()}>
          {(item) => (
            <li>
              <Show
                when={item.href}
                fallback={
                  <button
                    type="button"
                    class="w-full rounded-md p-1 text-left transition-colors hover:bg-base-200/60"
                    onClick={() => handleSelect(item)}
                  >
                    <div class="mb-1 flex items-center justify-between gap-3">
                      <span class="truncate text-sm text-base-content/80">{item.name}</span>
                      <span class="shrink-0 font-mono text-sm font-medium text-base-content">
                        {local.valueFormatter(item.value)}
                      </span>
                    </div>
                    <div class="h-2 rounded-full bg-base-200">
                      <div
                        class="h-2 rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${resolveBarPercent(item.value)}%` }}
                      />
                    </div>
                  </button>
                }
              >
                <a
                  href={String(item.href)}
                  target="_blank"
                  rel="noreferrer"
                  class="block w-full rounded-md p-1 text-left transition-colors hover:bg-base-200/60"
                  onClick={() => handleSelect(item)}
                >
                  <div class="mb-1 flex items-center justify-between gap-3">
                    <span class="truncate text-sm text-base-content/80">{item.name}</span>
                    <span class="shrink-0 font-mono text-sm font-medium text-base-content">
                      {local.valueFormatter(item.value)}
                    </span>
                  </div>
                  <div class="h-2 rounded-full bg-base-200">
                    <div
                      class="h-2 rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${resolveBarPercent(item.value)}%` }}
                    />
                  </div>
                </a>
              </Show>
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}
