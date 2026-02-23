import HardDrive from 'lucide-solid/icons/hard-drive'
import LayoutDashboard from 'lucide-solid/icons/layout-dashboard'

import type { Component, JSX } from 'solid-js'
import { Show } from 'solid-js'

import { useAppSettings } from '~/context/AppSettingsContext'

/* ------------------------------------------------------------------ */
/*  File-local helpers                                                 */
/* ------------------------------------------------------------------ */

const SettingsSection: Component<{
  icon: Component<{ size?: number }>
  title: string
  children: JSX.Element
}> = (props) => (
  <section>
    <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">
      <props.icon size={14} />
      {props.title}
    </div>
    <div class="card bg-base-200">
      <div class="card-body p-0">{props.children}</div>
    </div>
  </section>
)

const SettingsRow: Component<{
  label: string
  description?: string
  children: JSX.Element
}> = (props) => (
  <div class="flex items-center justify-between gap-4 px-4 py-3 not-first:border-t not-first:border-base-300">
    <div class="flex flex-col gap-0.5">
      <span class="text-sm font-medium">{props.label}</span>
      <Show when={props.description}>
        <span class="text-xs text-base-content/50">{props.description}</span>
      </Show>
    </div>
    <div class="shrink-0">{props.children}</div>
  </div>
)

/* ------------------------------------------------------------------ */
/*  Settings page                                                      */
/* ------------------------------------------------------------------ */

const Settings: Component = () => {
  const { sidebar, rightPanel, statusBar, topBar } = useAppSettings()

  return (
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <h1 class="text-lg font-bold">Settings</h1>

      <div role="alert" class="alert alert-info alert-soft">
        <HardDrive size={16} />
        <div >
          <p class="text-sm">Settings are saved to <code class="text-xs">localStorage</code> in your browser.</p>
          <p class="text-xs  mt-1">They will not sync across devices. Database-backed persistence is planned for the future. <code>#TODO</code></p>
        </div>
      </div>

      <SettingsSection icon={LayoutDashboard} title="Layout">
        <SettingsRow label="Sidebar" description="Show the left sidebar">
          <input
            type="checkbox"
            class="toggle toggle-primary toggle-sm"
            checked={sidebar.enabled()}
            onChange={() => {
              if (sidebar.enabled()) sidebar.setOpen(false)
              sidebar.setEnabled((v) => !v)
            }}
          />
        </SettingsRow>

        <SettingsRow label="Right panel" description="Show the right-side panel">
          <input
            type="checkbox"
            class="toggle toggle-primary toggle-sm"
            checked={rightPanel.enabled()}
            onChange={() => {
              if (rightPanel.enabled()) rightPanel.setOpen(false)
              rightPanel.setEnabled((v) => !v)
            }}
          />
        </SettingsRow>

        <SettingsRow label="Top bar" description="Show the top navigation bar">
          <input
            type="checkbox"
            class="toggle toggle-primary toggle-sm"
            checked={topBar.enabled()}
            onChange={() => topBar.setEnabled((v) => !v)}
          />
        </SettingsRow>

        <SettingsRow label="Status bar" description="Show the bottom status bar">
          <input
            type="checkbox"
            class="toggle toggle-primary toggle-sm"
            checked={statusBar.enabled()}
            onChange={() => statusBar.setEnabled((v) => !v)}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}

export default Settings
