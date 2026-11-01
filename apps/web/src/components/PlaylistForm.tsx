import { FormEvent, useState } from "react";
import { Button } from "@guruplay/ui/button";
import { Input } from "@guruplay/ui/input";
import { Textarea } from "@guruplay/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@guruplay/ui/dialog";
import {
  Playlist,
  personalRequest,
  playlistSchema,
  usePersonalMutation,
} from "@/hooks/use-personal";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";
export default function PlaylistForm({
  open,
  onClose,
  playlist,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  playlist?: Playlist;
  onCreated?: (id: string) => void;
}) {
  const [name, setName] = useState(playlist?.name || "");
  const [description, setDescription] = useState(playlist?.description || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const mutation = usePersonalMutation();
  const cache = useQueryClient();
  const { user } = useAuth();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (playlist)
        await mutation.mutateAsync({
          path: `playlists/${playlist.id}`,
          method: "PATCH",
          body: { name, description },
        });
      else {
        const result = await personalRequest(
          "playlists",
          z.object({ item: playlistSchema }),
          "POST",
          { name, description },
        );
        await cache.invalidateQueries({ queryKey: ["personal", user?.id] });
        onCreated?.(result.item.id);
      }
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save playlist.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !saving) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {playlist ? "Edit playlist" : "Create playlist"}
          </DialogTitle>
          <DialogDescription>
            Only you can see and edit this playlist.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            Name
            <Input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block">
            Description
            <Textarea
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
          <Button disabled={saving || !name.trim()} type="submit">
            {saving ? "Saving…" : "Save playlist"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
