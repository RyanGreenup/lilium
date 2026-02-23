import { createMemo, mergeProps, Show, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'

export interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'default' | 'neutral' | 'success' | 'warning' | 'error'
  label?: string
  class?: string
  style?: JSX.CSSProperties
}

const variantClasses: Record<NonNullable<ProgressBarProps['variant']>, string> = {
  default: 'progress-primary',
  neutral: 'progress-neutral',
  success: 'progress-success',
  warning: 'progress-warning',
  error: 'progress-error'
}

export default function ProgressBar(props: ProgressBarProps) {
  const merged = mergeProps(
    {
      max: 100,
      variant: 'default' as const
    },
    props
  )

  const [local, rest] = splitProps(merged, ['value', 'max', 'variant', 'label', 'class'])

  const safeMax = createMemo(() => {
    const numericMax = Number(local.max)
    if (!Number.isFinite(numericMax) || numericMax <= 0) return 100
    return numericMax
  })

  const safeValue = createMemo(() => {
    const numericValue = Number(local.value)
    if (!Number.isFinite(numericValue)) return 0
    return Math.max(0, Math.min(safeMax(), numericValue))
  })

  return (
    <div class={local.class} style={rest.style}>
      <div class="flex items-center gap-3">
        <progress
          class={`progress w-full ${variantClasses[local.variant]}`}
          value={safeValue()}
          max={safeMax()}
        />
        <Show when={local.label}>
          <span class="shrink-0 text-sm font-semibold text-base-content">{local.label}</span>
        </Show>
      </div>
    </div>
  )
}
