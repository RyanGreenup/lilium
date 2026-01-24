import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "~/lib/auth";
import { db } from "~/lib/db/index";

export const GET = async ({ request }: APIEvent) => {
  const url = new URL(request.url);
  const apiKey = request.headers.get("X-API-Key");
  const envKey = process.env.NOTES_API_KEY;

  let userFilter: string | null = null;

  if (apiKey && envKey && apiKey === envKey) {
    // API key auth: optionally filter by user_id
    userFilter = url.searchParams.get("user_id");
  } else {
    // Fall back to session auth
    try {
      const user = await requireUser();
      userFilter = user.id;
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const stmt = userFilter
    ? db.prepare(`
        SELECT id, title, created_at, updated_at
        FROM notes
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `)
    : db.prepare(`
        SELECT id, title, created_at, updated_at
        FROM notes
        ORDER BY updated_at DESC
      `);

  const rows = (userFilter ? stmt.all(userFilter) : stmt.all()) as {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
  }[];

  // Map updated_at -> modified_at for compatibility with ntfy_proxy.py
  const notes = rows.map((r) => ({
    id: r.id,
    title: r.title,
    created_at: r.created_at,
    modified_at: r.updated_at,
  }));

  return new Response(JSON.stringify(notes), {
    headers: { "Content-Type": "application/json" },
  });
};
