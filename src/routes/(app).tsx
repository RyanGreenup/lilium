import { useLocation, useNavigate, type RouteSectionProps, type RouteDefinition } from '@solidjs/router'
import {
  type Accessor,
  type Component,
  type ParentComponent,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount
} from 'solid-js'

import { AppSettingsProvider, PANEL_LIMITS, useAppSettings } from '~/context/AppSettingsContext'
import { StatusBarProvider } from '~/context/StatusBarContext'
import { createGlobalKeybindings } from '~/hooks/createGlobalKeybindings'
import { GlobalMathRenderer } from '~/components/GlobalMathRenderer'
import { SidebarTabs } from '~/components/layout/sidebar/SidebarContent'
import { RightSidebarContent } from '~/components/layout/RightSidebarContent'
import { StatusBarContent } from '~/components/layout/StatusBar'
import { TopBarContent } from '~/components/layout/TopBar'
import { FinderOverlay } from '~/components/FinderOverlay'
import { PATHS } from '~/lib/paths'
import { createProtectedRoute, getUser } from '~/lib/auth'
import { getIndexNoteQuery } from '~/lib/db/notes/read'

// Route Guard
export const route = {
  preload() {
    getUser()
    getIndexNoteQuery()
  }
} satisfies RouteDefinition

const App = (props: RouteSectionProps) => (
  <AppSettingsProvider>
    <StatusBarProvider>
    <AppLayout>{props.children}</AppLayout>
    <GlobalMathRenderer />
    <FinderOverlay />
    </StatusBarProvider>
  </AppSettingsProvider>
)

// Must be rendered inside AppSettingsProvider — consumes context for all
// layout state (panel open/close, widths, bar visibility).
const AppLayout: ParentComponent = (props) => {
    createProtectedRoute();
  const { sidebar, rightPanel, statusBar, topBar, settingsLoaded, lastRoute, setLastRoute } =
    useAppSettings()
  const navigate = useNavigate()

  const sidebarDrag = createDragResize({
    getValue: sidebar.width,
    setValue: sidebar.setWidth,
    min: PANEL_LIMITS.sidebar.min,
    max: PANEL_LIMITS.sidebar.max,
    direction: 1,
    onToggle: sidebar.toggle
  })

  const rightPanelDrag = createDragResize({
    getValue: rightPanel.width,
    setValue: rightPanel.setWidth,
    min: PANEL_LIMITS.rightPanel.min,
    max: PANEL_LIMITS.rightPanel.max,
    direction: -1,
    onToggle: rightPanel.toggle
  })

  // Suppress transitions until after the first paint so panels that start
  // closed don't animate their initial collapsed state.
  const [ready, setReady] = createSignal(false)
  onMount(() => requestAnimationFrame(() => setReady(true)))

  const isDragging = () => !ready() || sidebarDrag.dragging() || rightPanelDrag.dragging()

  // Close mobile drawers on route change
  const location = useLocation()
  let restoredInitialRoute = false
  const [isMd, setIsMd] = createSignal(true)
  onMount(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsMd(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches)
    mq.addEventListener('change', handler)
    onCleanup(() => mq.removeEventListener('change', handler))
  })
  const isOverlayVisible = () => !isMd() && anyOpen()
  const closeDrawers = () => {
    sidebar.setOpen(false)
    rightPanel.setOpen(false)
  }

  createGlobalKeybindings({
    isDrawerOverlayVisible: isOverlayVisible,
    closeDrawers
  })

  createEffect(() => {
    if (!settingsLoaded() || restoredInitialRoute) return
    restoredInitialRoute = true

    const savedPath = lastRoute()
    if (savedPath === PATHS.home || savedPath === location.pathname) return

    navigate(savedPath, { replace: true })
  })

  createEffect(
    on(
      () => location.pathname,
      (pathname) => {
        setLastRoute(pathname)
        if (!isMd()) {
          closeDrawers()
        }
      },
      { defer: true }
    )
  )

  const anyOpen = () => sidebar.open() || rightPanel.open()

  return (
    <div class="flex flex-col h-dvh overflow-hidden">
      {/* Top bar */}
      <Show when={topBar.enabled()}>
        <div
          class="bg-base-300 w-full shrink-0 overflow-hidden transition-[height] duration-ui ease-ui"
          classList={{ 'h-top-bar': topBar.visible(), 'h-0': !topBar.visible() }}
        >
          <TopBarContent
            onToggleSidebar={sidebar.toggle}
            onToggleRightPanel={rightPanel.toggle}
            rightPanelEnabled={rightPanel.enabled}
          />
        </div>
      </Show>

      <div class="flex flex-1 min-h-0 relative overflow-hidden">
        {/* Sidebar */}
        <Show when={sidebar.enabled()}>
          <SidebarPanel
            settings={sidebar}
            side="left"
            isDragging={isDragging}
            onHandlePointerDown={sidebarDrag.onPointerDown}
          >
            <SidebarTabs />
          </SidebarPanel>
        </Show>

        {/* Overlay (mobile only) */}
        <div
          class="absolute inset-0 bg-black/50 z-10 transition-opacity duration-ui ease-ui md:hidden"
          classList={{
            'opacity-100': isOverlayVisible(),
            'opacity-0 pointer-events-none': !isOverlayVisible()
          }}
          aria-hidden={!isOverlayVisible()}
          onClick={closeDrawers}
        />

        {/* Main content */}
        <main class="bg-base-100 flex-1 min-w-0 overflow-auto relative">{props.children}</main>

        {/* Right panel */}
        <Show when={rightPanel.enabled()}>
          <SidebarPanel
            settings={rightPanel}
            side="right"
            isDragging={isDragging}
            onHandlePointerDown={rightPanelDrag.onPointerDown}
          >
            <RightSidebarContent />
          </SidebarPanel>
        </Show>
      </div>

      {/* Status bar */}
      <Show when={statusBar.enabled()}>
        <footer
          class="shrink-0 overflow-hidden transition-[height] duration-ui ease-ui"
          classList={{ 'h-status-bar': statusBar.visible(), 'h-0': !statusBar.visible() }}
        >
          <StatusBarContent />
        </footer>
      </Show>
    </div>
  )
}

const ResizeHandle: Component<{ onPointerDown: (e: PointerEvent) => void }> = (props) => (
  <div
    class="group hidden w-3 shrink-0 cursor-col-resize items-center justify-center md:flex"
    onPointerDown={props.onPointerDown}
  >
    <div class="h-10 w-1 rounded-sm bg-base-content/30 transition-all duration-200 ease-out group-hover:h-12 group-hover:w-1.5 group-hover:bg-base-content/50 group-active:h-12 group-active:w-1.5 group-active:bg-base-content/50" />
  </div>
)

/**
 * Common panel for left and right sidebars.
 *
 * Uses negative margin (not width collapse) on desktop so the panel
 * width stays constant during open/close.
 */
const SidebarPanel: ParentComponent<{
  settings: { open: Accessor<boolean>; width: Accessor<number> }
  side: 'left' | 'right'
  isDragging: () => boolean
  onHandlePointerDown: (e: PointerEvent) => void
}> = (props) => (
  <aside
    class="bg-base-200 shrink-0 overflow-hidden transition-[margin,translate] duration-ui ease-ui absolute inset-y-0 z-20 md:static md:z-auto md:!w-(--panel-w) flex"
    classList={{
      'left-0': props.side === 'left',
      'right-0': props.side === 'right',
      'translate-x-0': props.settings.open(),
      '-translate-x-full md:translate-x-0': !props.settings.open() && props.side === 'left',
      'translate-x-full md:translate-x-0': !props.settings.open() && props.side === 'right',
      'md:-ml-(--panel-w)': !props.settings.open() && props.side === 'left',
      'md:-mr-(--panel-w)': !props.settings.open() && props.side === 'right'
    }}
    style={{
      '--panel-w': `${props.settings.width()}px`,
      width: 'clamp(16rem, 75vw, 24rem)',
      'transition-duration': props.isDragging() ? '0s' : undefined
    }}
    inert={!props.settings.open()}
  >
    <Show when={props.side === 'right'}>
      <ResizeHandle onPointerDown={props.onHandlePointerDown} />
    </Show>

    <div class="flex-1 min-w-0 overflow-hidden">{props.children}</div>

    <Show when={props.side === 'left'}>
      <ResizeHandle onPointerDown={props.onHandlePointerDown} />
    </Show>
  </aside>
)

interface CreateDragResizeOptions {
  getValue: () => number
  setValue: (v: number) => void
  min: number
  max: number
  direction: 1 | -1
  onToggle: () => void
}

function createDragResize(options: CreateDragResizeOptions) {
  const CLICK_THRESHOLD = 3
  const [dragging, setDragging] = createSignal(false)
  let teardown: (() => void) | null = null

  const resetBodyStyles = () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()

    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    const startX = e.clientX
    const startWidth = options.getValue()
    let moved = false

    const cleanup = () => {
      teardown = null
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      if (moved) {
        setDragging(false)
        resetBodyStyles()
      }
    }

    const onPointerMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) * options.direction
      if (!moved && Math.abs(delta) > CLICK_THRESHOLD) {
        moved = true
        setDragging(true)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
      }
      if (moved) {
        options.setValue(Math.min(options.max, Math.max(options.min, startWidth + delta)))
      }
    }

    const onPointerUp = () => {
      const wasDrag = moved
      cleanup()
      if (!wasDrag) options.onToggle()
    }

    teardown = cleanup

    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
  }

  onCleanup(() => teardown?.())

  return { onPointerDown, dragging }
}

export default App
