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

interface EditorSettings {
  vimMode: Accessor<boolean>
  setVimMode: Setter<boolean>
  disableVimOnTouch: Accessor<boolean>
  setDisableVimOnTouch: Setter<boolean>
}

export interface Keybinding {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
}

export function keybindingToString(kb: Keybinding): string {
  const parts: string[] = []
  if (kb.ctrl) parts.push('Ctrl')
  if (kb.alt) parts.push('Alt')
  if (kb.shift) parts.push('Shift')
  if (kb.meta) parts.push('Meta')
  parts.push(kb.key.length === 1 ? kb.key.toUpperCase() : kb.key)
  return parts.join('+')
}

export function captureKeybinding(e: KeyboardEvent): Keybinding | null {
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null
  return {
    key: e.key,
    ctrl: e.ctrlKey || undefined,
    alt: e.altKey || undefined,
    shift: e.shiftKey || undefined,
    meta: e.metaKey || undefined
  }
}

export function matchesKeybinding(e: KeyboardEvent, kb: Keybinding): boolean {
  return (
    e.key.toLowerCase() === kb.key.toLowerCase() &&
    !!e.ctrlKey === !!kb.ctrl &&
    !!e.altKey === !!kb.alt &&
    !!e.shiftKey === !!kb.shift &&
    !!e.metaKey === !!kb.meta
  )
}

interface KeybindingsState {
  toggleSidebar: Accessor<Keybinding>
  setToggleSidebar: Setter<Keybinding>
  toggleRightPanel: Accessor<Keybinding>
  setToggleRightPanel: Setter<Keybinding>
  toggleTopBar: Accessor<Keybinding>
  setToggleTopBar: Setter<Keybinding>
  toggleStatusBar: Accessor<Keybinding>
  setToggleStatusBar: Setter<Keybinding>
}

interface AppSettings {
  sidebar: PanelState
  rightPanel: PanelState
  topBar: Omit<PanelState, 'width' | 'setWidth'>
  statusBar: Omit<PanelState, 'width' | 'setWidth'>
  editor: EditorSettings
  keybindings: KeybindingsState
  settingsLoaded: Accessor<boolean>
  lastRoute: Accessor<string>
  setLastRoute: (path: string) => void
}

const STORAGE_KEY = 'lilium-app-settings'

interface PersistedKeybindings {
  toggleSidebar: Keybinding
  toggleRightPanel: Keybinding
  toggleTopBar: Keybinding
  toggleStatusBar: Keybinding
}

interface PersistedSettings {
  sidebar: { open: boolean; enabled: boolean; width: number }
  rightPanel: { open: boolean; enabled: boolean; width: number }
  topBar: { open: boolean; enabled: boolean }
  statusBar: { open: boolean; enabled: boolean }
  editor: { vimMode: boolean; disableVimOnTouch: boolean }
  keybindings: PersistedKeybindings
  lastRoute: string
}

const DEFAULT_KEYBINDINGS: PersistedKeybindings = {
  toggleSidebar: { key: 'b', ctrl: true },
  toggleRightPanel: { key: 'b', ctrl: true, shift: true },
  toggleTopBar: { key: 't', ctrl: true, alt: true },
  toggleStatusBar: { key: 's', ctrl: true, alt: true }
}

const DEFAULTS: PersistedSettings = {
  sidebar: { open: true, enabled: true, width: 320 },
  rightPanel: { open: false, enabled: true, width: 350 },
  topBar: { open: true, enabled: true },
  statusBar: { open: true, enabled: true },
  editor: { vimMode: true, disableVimOnTouch: true },
  keybindings: DEFAULT_KEYBINDINGS,
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

  // Editor
  const [vimMode, setVimMode] = createSignal(DEFAULTS.editor.vimMode)
  const [disableVimOnTouch, setDisableVimOnTouch] = createSignal(DEFAULTS.editor.disableVimOnTouch)

  // Keybindings
  const [kbToggleSidebar, setKbToggleSidebar] = createSignal(DEFAULT_KEYBINDINGS.toggleSidebar)
  const [kbToggleRightPanel, setKbToggleRightPanel] = createSignal(DEFAULT_KEYBINDINGS.toggleRightPanel)
  const [kbToggleTopBar, setKbToggleTopBar] = createSignal(DEFAULT_KEYBINDINGS.toggleTopBar)
  const [kbToggleStatusBar, setKbToggleStatusBar] = createSignal(DEFAULT_KEYBINDINGS.toggleStatusBar)

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
    setVimMode(s.editor.vimMode)
    setDisableVimOnTouch(s.editor.disableVimOnTouch)
    const kb = s.keybindings ?? DEFAULT_KEYBINDINGS
    setKbToggleSidebar(kb.toggleSidebar)
    setKbToggleRightPanel(kb.toggleRightPanel)
    setKbToggleTopBar(kb.toggleTopBar)
    setKbToggleStatusBar(kb.toggleStatusBar)
    setLastRoute(s.lastRoute)
    setSettingsLoaded(true)
  })

  // Persist on change
  const serialize = (): PersistedSettings => ({
    sidebar: { open: sidebarOpen(), enabled: sidebarEnabled(), width: sidebarWidth() },
    rightPanel: { open: rightOpen(), enabled: rightEnabled(), width: rightWidth() },
    topBar: { open: topOpen(), enabled: topEnabled() },
    statusBar: { open: statusOpen(), enabled: statusEnabled() },
    editor: { vimMode: vimMode(), disableVimOnTouch: disableVimOnTouch() },
    keybindings: {
      toggleSidebar: kbToggleSidebar(),
      toggleRightPanel: kbToggleRightPanel(),
      toggleTopBar: kbToggleTopBar(),
      toggleStatusBar: kbToggleStatusBar()
    },
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

  const editor: EditorSettings = {
    vimMode,
    setVimMode,
    disableVimOnTouch,
    setDisableVimOnTouch
  }

  const keybindings: KeybindingsState = {
    toggleSidebar: kbToggleSidebar,
    setToggleSidebar: setKbToggleSidebar,
    toggleRightPanel: kbToggleRightPanel,
    setToggleRightPanel: setKbToggleRightPanel,
    toggleTopBar: kbToggleTopBar,
    setToggleTopBar: setKbToggleTopBar,
    toggleStatusBar: kbToggleStatusBar,
    setToggleStatusBar: setKbToggleStatusBar
  }

  const settings: AppSettings = {
    sidebar,
    rightPanel,
    topBar,
    statusBar,
    editor,
    keybindings,
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
