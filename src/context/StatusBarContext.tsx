import { type Accessor, type ParentComponent, createContext, createSignal, useContext } from 'solid-js'

export interface StatusBarItems {
  left: string[]
  right: { unsaved: boolean; syntaxLabel: string | undefined }
}

interface StatusBarContextValue {
  items: Accessor<StatusBarItems | null>
  setStatusItems: (items: StatusBarItems | null) => void
}

const StatusBarContext = createContext<StatusBarContextValue>()

export const StatusBarProvider: ParentComponent = (props) => {
  const [items, setStatusItems] = createSignal<StatusBarItems | null>(null)

  return (
    <StatusBarContext.Provider value={{ items, setStatusItems }}>
      {props.children}
    </StatusBarContext.Provider>
  )
}

export function useStatusBar() {
  const ctx = useContext(StatusBarContext)
  if (!ctx) throw new Error('useStatusBar must be used within StatusBarProvider')
  return ctx.setStatusItems
}

export function useStatusBarItems() {
  const ctx = useContext(StatusBarContext)
  if (!ctx) throw new Error('useStatusBarItems must be used within StatusBarProvider')
  return ctx.items
}
