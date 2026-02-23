import { createMemo, children, mergeProps, Show, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'

export interface ProgressCircleProps {
  value?: number
  variant?: 'default' | 'neutral' | 'warning' | 'success' | 'error'
  radius?: number
  strokeWidth?: number
  class?: string
  style?: JSX.CSSProperties
  children?: JSX.Element
}

const variantClassMap: Record<NonNullable<ProgressCircleProps['variant']>, string> = {
  default: 'text-primary',
  neutral: 'text-neutral',
  warning: 'text-warning',
  success: 'text-success',
  error: 'text-error'
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function ProgressCircle(props: ProgressCircleProps) {
  const merged = mergeProps(
    {
      value: 0,
      variant: 'default' as const,
      radius: 40,
      strokeWidth: 8
    },
    props
  )

  const [local] = splitProps(merged, [
    'value',
    'variant',
    'radius',
    'strokeWidth',
    'class',
    'style',
    'children'
  ])

  const resolvedChildren = children(() => local.children)

  const normalizedValue = createMemo(() => clamp(Number(local.value) || 0, 0, 100))
  const diameter = createMemo(() => Math.max(0, local.radius * 2))
  const normalizedRadius = createMemo(() => Math.max(0, local.radius - local.strokeWidth / 2))
  const circumference = createMemo(() => 2 * Math.PI * normalizedRadius())
  const strokeDashoffset = createMemo(() => circumference() - (normalizedValue() / 100) * circumference())

  const containerStyle = createMemo(() => ({
    width: `${diameter()}px`,
    height: `${diameter()}px`,
    ...(local.style ?? {})
  }))

  return (
    <div
      class={`relative inline-flex items-center justify-center ${local.class ?? ''}`}
      style={containerStyle()}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(normalizedValue())}
    >
      <svg
        class="-rotate-90 overflow-visible"
        width={diameter()}
        height={diameter()}
        viewBox={`0 0 ${diameter()} ${diameter()}`}
      >
        <circle
          cx={local.radius}
          cy={local.radius}
          r={normalizedRadius()}
          class="fill-none text-base-300/70"
          stroke="currentColor"
          stroke-width={local.strokeWidth}
        />
        <circle
          cx={local.radius}
          cy={local.radius}
          r={normalizedRadius()}
          class={`fill-none transition-[stroke-dashoffset] duration-300 ease-out ${variantClassMap[local.variant]}`}
          stroke="currentColor"
          stroke-width={local.strokeWidth}
          stroke-linecap="round"
          stroke-dasharray={`${circumference()}`}
          stroke-dashoffset={`${strokeDashoffset()}`}
        />
      </svg>
      <Show when={resolvedChildren()}>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          {resolvedChildren()}
        </div>
      </Show>
    </div>
  )
}
