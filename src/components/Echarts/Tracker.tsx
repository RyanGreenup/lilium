import { For, mergeProps, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'

export interface TrackerDataPoint {
  color?: string
  tooltip?: string
}

export interface TrackerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  data: TrackerDataPoint[]
  hoverEffect?: boolean
  defaultColor?: string
  class?: string
}

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(' ')

export default function Tracker(props: TrackerProps) {
  const merged = mergeProps(
    {
      hoverEffect: false,
      defaultColor: 'bg-emerald-600'
    },
    props
  )

  const [local, rest] = splitProps(merged, ['data', 'hoverEffect', 'defaultColor', 'class'])

  return (
    <div class={joinClasses('flex items-center gap-1', local.class)} {...rest}>
      <For each={local.data}>
        {(item) => (
          <span
            class={joinClasses(
              'h-5 min-w-1.5 flex-1 rounded-[3px]',
              'transition-transform duration-150 ease-out',
              local.hoverEffect && 'hover:-translate-y-0.5 hover:scale-110',
              item.color ?? local.defaultColor
            )}
            title={item.tooltip}
          />
        )}
      </For>
    </div>
  )
}
