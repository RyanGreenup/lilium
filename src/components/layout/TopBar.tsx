import { A, createAsync } from '@solidjs/router'
import BookOpen from 'lucide-solid/icons/book-open'
import CalendarDays from 'lucide-solid/icons/calendar-days'
import FileText from 'lucide-solid/icons/file-text'
import Home from 'lucide-solid/icons/home'
import Menu from 'lucide-solid/icons/menu'
import { type Accessor, Show } from 'solid-js'
import { UserDropdown } from '~/components/UserDrowDown'
import { getIndexNoteQuery } from '~/lib/db/notes/read'
import { getLatestJournalPageQuery } from '~/lib/db/notes/journal'

export function TopBarContent(props: {
  onToggleSidebar: () => void
  onToggleRightPanel: () => void
  rightPanelEnabled: Accessor<boolean>
}) {
  const indexNote = createAsync(() => getIndexNoteQuery())
  const latestJournal = createAsync(() => getLatestJournalPageQuery())

  return (
    <nav class="navbar min-h-0 h-full px-2">
      <div class="navbar-start gap-1">
        <button
          class="btn btn-sm btn-square btn-ghost"
          onClick={props.onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <A href="/" class="btn btn-sm btn-square btn-ghost" title="Dashboard">
          <Home size={18} />
        </A>

        <Show when={indexNote()}>
          {(note) => (
            <A href={`/note/${note().id}`} class="btn btn-sm btn-square btn-ghost" title="Index Note">
              <FileText size={18} />
            </A>
          )}
        </Show>

        <Show when={latestJournal()}>
          {(journal) => (
            <A href={`/note/${journal().id}`} class="btn btn-sm btn-square btn-ghost" title="Latest Journal">
              <CalendarDays size={18} />
            </A>
          )}
        </Show>
      </div>

      <div class="navbar-center" />

      <div class="navbar-end gap-1">
        <UserDropdown />
        <Show when={props.rightPanelEnabled()}>
          <button
            class="btn btn-sm btn-square btn-ghost"
            onClick={props.onToggleRightPanel}
            aria-label="Toggle right panel"
          >
            <BookOpen size={18} />
          </button>
        </Show>
      </div>
    </nav>
  )
}
