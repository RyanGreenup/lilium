import { createAsync } from '@solidjs/router'
import { Show } from 'solid-js'
import { getLatestJournalPageQuery } from '~/lib/db/notes/journal'
import NoteEditor from '~/routes/(app)/note/[id]'

export function RightSidebarContent() {
  const latestJournal = createAsync(() => getLatestJournalPageQuery())

  return (
    <div class="overflow-y-auto h-full">
      <Show when={latestJournal()}>
        {(journal) => <NoteEditor noteId={journal().id} />}
      </Show>
    </div>
  )
}
