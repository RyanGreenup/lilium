import { Show } from 'solid-js'
import { useLocation } from '@solidjs/router'
import { useStatusBarItems } from '~/context/StatusBarContext'

export function StatusBarContent() {
  const location = useLocation()
  const items = useStatusBarItems()

  return (
    <div class="flex items-center h-status-bar px-3 text-xs text-base-content/60 bg-base-200">
      <Show
        when={items()}
        fallback={<span>{location.pathname}</span>}
      >
        {(data) => (
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-4">
              {data().left.map((s) => <span>{s}</span>)}
            </div>
            <div class="flex items-center gap-3">
              <Show when={data().right.unsaved}>
                <span class="text-warning flex items-center gap-1">
                  <span class="w-1.5 h-1.5 bg-warning rounded-full"></span>
                  <span class="hidden sm:inline">Unsaved</span>
                </span>
              </Show>
              <Show when={data().right.syntaxLabel}>
                <span class="text-base-content/40">{data().right.syntaxLabel}</span>
              </Show>
            </div>
          </div>
        )}
      </Show>
    </div>
  )
}
