import { isServer } from 'solid-js/web'
import { onCleanup, onMount } from 'solid-js'
import { type Keybinding, matchesKeybinding } from '~/context/AppSettingsContext'

interface KeybindingAction {
  binding: () => Keybinding
  action: () => void
}

interface KeybindingOptions {
  isDrawerOverlayVisible: () => boolean
  closeDrawers: () => void
  actions?: KeybindingAction[]
}

export function createGlobalKeybindings(options: KeybindingOptions) {
  if (isServer) return

  const handler = (e: KeyboardEvent) => {
    // Escape closes mobile drawers
    if (e.key === 'Escape' && options.isDrawerOverlayVisible()) {
      e.preventDefault()
      options.closeDrawers()
      return
    }

    // Skip when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

    // Custom keybindings
    for (const { binding, action } of options.actions ?? []) {
      if (matchesKeybinding(e, binding())) {
        e.preventDefault()
        action()
        return
      }
    }
  }

  onMount(() => document.addEventListener('keydown', handler))
  onCleanup(() => document.removeEventListener('keydown', handler))
}
