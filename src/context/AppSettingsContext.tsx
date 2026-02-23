import {
  type Accessor,
  type ParentComponent,
  type Setter,
  createContext,
  createEffect,
  createSignal,
  on,
  onMount,
  useContext
} from 'solid-js'

export const PANEL_LIMITS = {
  sidebar: { min: 200, max: 500 },
  rightPanel: { min: 200, max: 600 }
} as const

interface PanelState {
  open: Accessor<boolean>
  setOpen: Setter<boolean>
  toggle: () => void
  enabled: Accessor<boolean>
  setEnabled: Setter<boolean>
  visible: () => boolean
  width: Accessor<number>
  setWidth: Setter<number>
}

interface AppSettings {
  sidebar: PanelState
  rightPanel: PanelState
  topBar: Omit<PanelState, 'width' | 'setWidth'>
  statusBar: Omit<PanelState, 'width' | 'setWidth'>
  settingsLoaded: Accessor<boolean>
  lastRoute: Accessor<string>
  setLastRoute: (path: string) => void
}

const STORAGE_KEY = 'lilium-app-settings'

interface PersistedSettings {
  sidebar: { open: boolean; enabled: boolean; width: number }
  rightPanel: { open: boolean; enabled: boolean; width: number }
  topBar: { open: boolean; enabled: boolean }
  statusBar: { open: boolean; enabled: boolean }
  lastRoute: string
}

const DEFAULTS: PersistedSettings = {
  sidebar: { open: true, enabled: true, width: 320 },
  rightPanel: { open: false, enabled: true, width: 350 },
  topBar: { open: true, enabled: true },
  statusBar: { open: true, enabled: true },
  lastRoute: '/'
}

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

const AppSettingsContext = createContext<AppSettings>()

export const AppSettingsProvider: ParentComponent = (props) => {
  const [settingsLoaded, setSettingsLoaded] = createSignal(false)
  const [lastRoute, setLastRoute] = createSignal(DEFAULTS.lastRoute)

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = createSignal(DEFAULTS.sidebar.open)
  const [sidebarEnabled, setSidebarEnabled] = createSignal(DEFAULTS.sidebar.enabled)
  const [sidebarWidth, setSidebarWidth] = createSignal(DEFAULTS.sidebar.width)

  // Right panel
  const [rightOpen, setRightOpen] = createSignal(DEFAULTS.rightPanel.open)
  const [rightEnabled, setRightEnabled] = createSignal(DEFAULTS.rightPanel.enabled)
  const [rightWidth, setRightWidth] = createSignal(DEFAULTS.rightPanel.width)

  // Top bar
  const [topOpen, setTopOpen] = createSignal(DEFAULTS.topBar.open)
  const [topEnabled, setTopEnabled] = createSignal(DEFAULTS.topBar.enabled)

  // Status bar
  const [statusOpen, setStatusOpen] = createSignal(DEFAULTS.statusBar.open)
  const [statusEnabled, setStatusEnabled] = createSignal(DEFAULTS.statusBar.enabled)

  onMount(() => {
    const s = loadSettings()
    setSidebarOpen(s.sidebar.open)
    setSidebarEnabled(s.sidebar.enabled)
    setSidebarWidth(s.sidebar.width)
    setRightOpen(s.rightPanel.open)
    setRightEnabled(s.rightPanel.enabled)
    setRightWidth(s.rightPanel.width)
    setTopOpen(s.topBar.open)
    setTopEnabled(s.topBar.enabled)
    setStatusOpen(s.statusBar.open)
    setStatusEnabled(s.statusBar.enabled)
    setLastRoute(s.lastRoute)
    setSettingsLoaded(true)
  })

  // Persist on change
  const serialize = (): PersistedSettings => ({
    sidebar: { open: sidebarOpen(), enabled: sidebarEnabled(), width: sidebarWidth() },
    rightPanel: { open: rightOpen(), enabled: rightEnabled(), width: rightWidth() },
    topBar: { open: topOpen(), enabled: topEnabled() },
    statusBar: { open: statusOpen(), enabled: statusEnabled() },
    lastRoute: lastRoute()
  })

  createEffect(
    on(
      () => JSON.stringify(serialize()),
      () => {
        if (!settingsLoaded()) return
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()))
      },
      { defer: true }
    )
  )

  const sidebar: PanelState = {
    open: sidebarOpen,
    setOpen: setSidebarOpen,
    toggle: () => setSidebarOpen((v) => !v),
    enabled: sidebarEnabled,
    setEnabled: setSidebarEnabled,
    visible: () => sidebarEnabled() && sidebarOpen(),
    width: sidebarWidth,
    setWidth: setSidebarWidth
  }

  const rightPanel: PanelState = {
    open: rightOpen,
    setOpen: setRightOpen,
    toggle: () => setRightOpen((v) => !v),
    enabled: rightEnabled,
    setEnabled: setRightEnabled,
    visible: () => rightEnabled() && rightOpen(),
    width: rightWidth,
    setWidth: setRightWidth
  }

  const topBar = {
    open: topOpen,
    setOpen: setTopOpen,
    toggle: () => setTopOpen((v) => !v),
    enabled: topEnabled,
    setEnabled: setTopEnabled,
    visible: () => topEnabled() && topOpen()
  }

  const statusBar = {
    open: statusOpen,
    setOpen: setStatusOpen,
    toggle: () => setStatusOpen((v) => !v),
    enabled: statusEnabled,
    setEnabled: setStatusEnabled,
    visible: () => statusEnabled() && statusOpen()
  }

  const settings: AppSettings = {
    sidebar,
    rightPanel,
    topBar,
    statusBar,
    settingsLoaded,
    lastRoute,
    setLastRoute
  }

  return <AppSettingsContext.Provider value={settings}>{props.children}</AppSettingsContext.Provider>
}

export function useAppSettings(): AppSettings {
  const ctx = useContext(AppSettingsContext)
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider')
  return ctx
}
