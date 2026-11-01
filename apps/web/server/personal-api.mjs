import { z } from "zod";
const fail = (status, message) => Object.assign(new Error(message), { status });
const uuid = z.string().uuid();
const text = (max) => z.string().trim().min(1).max(max);
export const settingsPatch = z
  .object({
    display_name: text(80).optional(),
    volume: z.number().min(0).max(1).optional(),
    autoplay: z.boolean().optional(),
    private_session: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Choose a setting to update.");
const playlistFields = z
  .object({
    name: text(80),
    description: z.string().trim().max(500).default(""),
  })
  .strict();
export const defaults = { volume: 0.7, autoplay: true, private_session: false };
export function checked(result) {
  if (result.error) {
    const code = result.error.code;
    throw fail(
      code === "P0002"
        ? 404
        : ["40001", "PT409"].includes(code)
          ? 409
          : ["22023", "23514", "23503"].includes(code)
            ? 400
            : code === "42501"
              ? 403
              : 503,
      code === "P0002"
        ? "Playlist or song not found."
        : ["40001", "PT409"].includes(code)
          ? "Playlist changed. Reload and try again."
          : ["22023", "23514", "23503"].includes(code)
            ? "Invalid playlist or song data."
            : code === "42501"
              ? "This action is not allowed."
              : "Your data could not be saved or loaded. Try again.",
    );
  }
  return result.data;
}
export async function preferences(service, userId) {
  return {
    ...defaults,
    ...(checked(
      await service
        .from("user_settings")
        .select("volume,autoplay,private_session")
        .eq("user_id", userId)
        .maybeSingle(),
    ) || {}),
  };
}
async function catalog(service, ids) {
  if (!ids.length) return [];
  const rows = [];
  for (let start = 0; start < ids.length; start += 100)
    rows.push(
      ...checked(
        await service
          .from("public_catalog")
          .select("*")
          .in("id", ids.slice(start, start + 100)),
      ),
    );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}
export async function personalApi({ service, actor, path, method, body }) {
  try {
    return await handle({ service, actor, path, method, body });
  } catch (error) {
    if (error instanceof z.ZodError)
      throw fail(400, error.issues.map((issue) => issue.message).join(" "));
    throw error;
  }
}
async function handle({ service, actor, path, method, body }) {
  const db = actor.db;
  const owner = actor.user.id;
  if (path.join("/") === "me/settings") {
    if (method === "PATCH") {
      const { display_name, ...prefs } = settingsPatch.parse(body);
      // A profile update never accepts role, approval, email or account status.
      if (display_name !== undefined) {
        checked(
          await db.from("users").update({ display_name }).eq("id", owner),
        );
      }
      if (Object.keys(prefs).length) {
        const existing = checked(
          await db
            .from("user_settings")
            .select("user_id")
            .eq("user_id", owner)
            .maybeSingle(),
        );
        if (existing)
          checked(
            await db.from("user_settings").update(prefs).eq("user_id", owner),
          );
        else {
          const result = await db
            .from("user_settings")
            .insert({ user_id: owner, ...prefs });
          if (result.error?.code === "23505")
            checked(
              await db.from("user_settings").update(prefs).eq("user_id", owner),
            );
          else checked(result);
        }
      }
    } else if (method !== "GET") throw fail(405, "Method not allowed.");
    const profile = checked(
      await db.from("users").select("display_name").eq("id", owner).single(),
    );
    return {
      display_name: profile.display_name,
      preferences: await preferences(service, owner),
    };
  }
  if (path[0] === "library") {
    if (path.length === 1 && method === "GET") {
      const saved = checked(
        await db
          .from("saved_songs")
          .select("song_id")
          .order("created_at", { ascending: false })
          .limit(2000),
      );
      const events = checked(
        await service
          .from("playback_events")
          .select("song_id,received_at")
          .eq("user_id", owner)
          .in("event_type", ["preview_start", "full_play_start"])
          .order("received_at", { ascending: false })
          .limit(1000),
      );
      const played = new Map();
      for (const event of events)
        if (!played.has(event.song_id) && played.size < 100)
          played.set(event.song_id, event.received_at);
      return {
        saved: await catalog(
          service,
          saved.map((row) => row.song_id),
        ),
        history: (await catalog(service, [...played.keys()])).map((song) => ({
          ...song,
          played_at: played.get(song.id),
        })),
      };
    }
    if (path[1] === "history" && path.length === 2 && method === "DELETE") {
      checked(
        await service.from("playback_events").delete().eq("user_id", owner),
      );
      checked(
        await service
          .from("recommendation_snapshots")
          .delete()
          .eq("user_id", owner),
      );
      return { cleared: true };
    }
    if (
      path[1] === "songs" &&
      path.length === 3 &&
      ["PUT", "DELETE"].includes(method)
    ) {
      const songId = uuid.parse(path[2]);
      if (method === "PUT") {
        if (!(await catalog(service, [songId])).length)
          throw fail(404, "This song is unavailable.");
        const existing = checked(
          await db
            .from("saved_songs")
            .select("song_id")
            .eq("song_id", songId)
            .maybeSingle(),
        );
        if (!existing) {
          const result = await db
            .from("saved_songs")
            .insert({ user_id: owner, song_id: songId });
          if (result.error?.code !== "23505") checked(result);
        }
      } else
        checked(await db.from("saved_songs").delete().eq("song_id", songId));
      return { saved: method === "PUT" };
    }
  }
  if (path[0] === "playlists") {
    if (path.length === 1) {
      if (method === "GET")
        return {
          items: checked(
            await db
              .from("playlists")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(500),
          ),
        };
      if (method === "POST")
        return {
          item: checked(
            await db
              .from("playlists")
              .insert({ ...playlistFields.parse(body), user_id: owner })
              .select("*")
              .single(),
          ),
        };
    } else {
      const id = uuid.parse(path[1]);
      const item = checked(
        await db.from("playlists").select("*").eq("id", id).maybeSingle(),
      );
      if (!item) throw fail(404, "Playlist not found.");
      if (path.length === 2) {
        if (method === "GET") {
          const rows = checked(
            await db
              .from("playlist_songs")
              .select("song_id,position")
              .eq("playlist_id", id)
              .order("position"),
          );
          const songIds = rows.map((row) => row.song_id);
          return { item, songIds, tracks: await catalog(service, songIds) };
        }
        if (method === "PATCH")
          return {
            item: checked(
              await db
                .from("playlists")
                .update(playlistFields.partial().parse(body))
                .eq("id", id)
                .select("*")
                .single(),
            ),
          };
        if (method === "DELETE") {
          checked(await db.from("playlists").delete().eq("id", id));
          return { deleted: true };
        }
      }
      if (
        path[2] === "songs" &&
        path.length === 4 &&
        ["PUT", "DELETE"].includes(method)
      ) {
        checked(
          await db.rpc("mutate_playlist", {
            target: id,
            action: method === "PUT" ? "add" : "remove",
            song: uuid.parse(path[3]),
          }),
        );
        return { updated: true };
      }
      if (path[2] === "order" && path.length === 3 && method === "PUT") {
        const order = z
          .object({
            song_ids: z.array(uuid).max(500),
            revision: z.number().int().nonnegative(),
          })
          .strict()
          .parse(body);
        checked(
          await db.rpc("mutate_playlist", {
            target: id,
            action: "order",
            ordered_ids: order.song_ids,
            expected_revision: order.revision,
          }),
        );
        return { updated: true };
      }
    }
  }
  if (path[0] === "support") {
    if (path[1] === "admin") {
      const profile = checked(
        await service
          .from("users")
          .select("user_type")
          .eq("id", owner)
          .single(),
      );
      if (profile.user_type !== "admin")
        throw fail(403, "Administrator access is required.");
      if (path.length === 2 && method === "GET")
        return {
          items: checked(
            await service
              .from("support_tickets")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(100),
          ),
        };
      if (path.length === 3 && method === "PATCH") {
        const patch = z
          .object({
            response: text(4000),
            status: z.enum(["open", "resolved"]),
          })
          .strict()
          .parse(body);
        const item = checked(
          await service
            .from("support_tickets")
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq("id", uuid.parse(path[2]))
            .select("*")
            .maybeSingle(),
        );
        if (!item) throw fail(404, "Support request not found.");
        return { item };
      }
    }
    if (path.length === 1 && method === "GET")
      return {
        items: checked(
          await db
            .from("support_tickets")
            .select("*")
            .eq("user_id", owner)
            .order("created_at", { ascending: false })
            .limit(100),
        ),
      };
    if (path.length === 1 && method === "POST") {
      const ticket = z
        .object({
          subject: text(120),
          message: text(4000).refine(
            (v) => v.length >= 10,
            "Describe the issue in at least 10 characters.",
          ),
        })
        .strict()
        .parse(body);
      return {
        item: checked(
          await service
            .from("support_tickets")
            .insert({ ...ticket, user_id: owner })
            .select("*")
            .single(),
        ),
      };
    }
  }
  throw fail(404, "Route not found.");
}
