# Implement Ranger


1. Jump to with a fzf like palette
2. Show a preview of the content
3. Dynamic column count
4. Vim-style navigation:
   - `h` up/parent, `l` enter/open, `j/k` move, `gg/G` top/bottom
   - `H/L` history back/forward
5. Cursor and scroll behavior:
   - Keep cursor visible while scrolling long columns
   - Optional wrap-around on top/bottom
6. File operations:
   - copy/cut/paste (`yy`, `dd`, `pp`)
   - rename (`cw`), create file/folder, delete with confirmation
   - bulk rename mode
7. Selection mode:
   - toggle selection (`space`), visual range selection, invert selection
   - operations apply to selected set
8. Sort and filter:
   - sort by name/mtime/size/type
   - reverse sort
   - hidden files toggle
   - incremental filter/search in current directory
9. Open behavior:
   - Enter opens directories in-column, files with default opener
   - `o` open-with menu for alternative apps/actions
10. Tabs/workspaces:
    - multiple tabs with independent cursor/path state
    - quick tab switching
11. Bookmarks and marks:
    - set/jump bookmarks (`m{key}`, `` `{key}` ``)
    - persistent bookmark storage
12. Preview behavior:
    - text/image/media preview where possible
    - binary/unsupported fallback
    - async preview with cancellation on cursor move
13. Status and metadata:
    - show permissions, owner, size, mtime, file type
    - selected count and operation queue status
14. Command mode:
    - `:` command prompt with core commands (`cd`, `open`, `shell`, `set`)
    - command history
15. Search and jump:
    - `/` incremental search within current column
    - `n/N` next/previous match
16. Archive and compression helpers:
    - extract archives
    - create archive from selection
17. Error and permission handling:
    - clear messages for permission denied / missing files
    - non-blocking notifications
18. Configurability:
    - keybinding overrides
    - opener/previewer customization
    - persisted UI state (columns, sort, hidden toggle, last path)
