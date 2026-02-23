import { isServer } from 'solid-js/web'
import { onCleanup, onMount } from 'solid-js'

interface KeybindingOptions {
  isDrawerOverlayVisible: () => boolean
  closeDrawers: () => void
}

export function createGlobalKeybindings(options: KeybindingOptions) {
  if (isServer) return

  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && options.isDrawerOverlayVisible()) {
      e.preventDefault()
      options.closeDrawers()
    }
  }

  onMount(() => document.addEventListener('keydown', handler))
  onCleanup(() => document.removeEventListener('keydown', handler))
}
