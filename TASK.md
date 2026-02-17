# Implement Ranger


0. [X] Scroll preview with keyboard
0. Flat 0
1. [X] Jump to with a fzf like palette
2. [X] Show a preview of the content
  - [X] Include backlinks
  - [X] Dynamic column count
4. Vim-style navigation:
   - [ ] `h` up/parent, `l` enter/open, `j/k` move, `gg/G` top/bottom
   - [ ] `H/L` history back/forward
5. [X] Cursor and scroll behavior:
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
   - [X] Enter opens directories in-column, files with default opener
10. Tabs/workspaces:
    - multiple tabs with independent cursor/path state
    - quick tab switching
11. Bookmarks and marks:
    - set/jump bookmarks (`m{key}`, `` `{key}` ``)
    - persistent bookmark storage
13. [X] Status and metadata:
    - Back / Forward Links
    - Abstract
15. Search and jump:
    - `/` incremental search within current column
    - `n/N` next/previous match
