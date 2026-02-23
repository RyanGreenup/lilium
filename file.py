import os
from tqdm import tqdm
from pathlib import Path
import sqlite3

dir = Path("/tmp/restored_notes")
os.makedirs(dir, exist_ok=True)

with sqlite3.connect(".data/notes.sqlite") as con:
    out = con.execute("""select * FROM notes_history where title = '2026-02-19'""")
    for row in tqdm(out.fetchall()):
        (
            id,
            title,
            abstract,
            content,
            syntax,
            log_action,
            parent_id,
            user_id,
            created_at,
            updated_at,
            deleted_at,
            history_id,
        ) = row

        file_name = dir / f"{updated_at} -- {title}.md"
        file_name.open("w").write(content)
