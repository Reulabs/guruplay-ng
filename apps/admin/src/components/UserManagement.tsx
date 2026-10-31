import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@guruplay/ui/input";
import { Button } from "@guruplay/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@guruplay/ui/dialog";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
interface Account {
  id: string;
  display_name: string;
  email: string;
  user_type: "user" | "artist" | "admin";
  account_status: "active" | "paused" | "deleted";
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`/api/admin/users${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${data.session?.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Account update failed.");
  return result;
}
export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Account | null>(null);
  const [target, setTarget] = useState<{
    account: Account;
    status: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin-users", search, page, filter],
    queryFn: () =>
      request<{ items: Account[]; total: number; pageSize: number }>(
        `?search=${encodeURIComponent(search)}&page=${page}&status=${filter}`,
      ),
  });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      await request(`/${editing.id}`, "PATCH", {
        email: editing.email,
        display_name: editing.display_name,
        user_type: editing.user_type,
      });
      await query.refetch();
      setEditing(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not update user.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">User accounts</h2>
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          aria-label="Search user accounts"
          value={search}
          placeholder="Search name or email"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Account status filter"
          className="border border-white/10 rounded bg-background p-2"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All current accounts</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="deleted">Removed</option>
        </select>
      </div>
      {error && !editing && !target && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.items.length ? (
        <div className="space-y-3">
          {query.data.items.map((account) => (
            <article
              key={account.id}
              className="border border-white/10 rounded-xl p-4 flex flex-wrap justify-between gap-4"
            >
              <div className="min-w-0">
                <h3 className="font-bold break-words">
                  {account.display_name}
                </h3>
                <p className="text-sm text-muted-foreground break-all">
                  {account.email}
                </p>
                <p className="text-xs capitalize mt-2">
                  {account.user_type} · {account.account_status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={account.account_status === "deleted"}
                  onClick={() => {
                    setError("");
                    setEditing({ ...account });
                  }}
                >
                  Edit account
                </Button>
                {account.user_type !== "admin" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setError("");
                        setTarget({
                          account,
                          status:
                            account.account_status === "active"
                              ? "paused"
                              : "active",
                        });
                      }}
                    >
                      {account.account_status === "active"
                        ? "Pause"
                        : "Restore"}
                    </Button>
                    {account.account_status !== "deleted" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setError("");
                          setTarget({ account, status: "deleted" });
                        }}
                      >
                        Remove account
                      </Button>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No matching accounts"
          description="Try another name or account status."
        />
      )}
      <div className="flex gap-3 items-center">
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous page
        </Button>
        <span className="text-sm">Page {page}</span>
        <Button
          variant="outline"
          disabled={
            !query.data || page * query.data.pageSize >= query.data.total
          }
          onClick={() => setPage(page + 1)}
        >
          Next page
        </Button>
      </div>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && !busy) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>
              Account roles do not approve an artist application.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form className="space-y-4" onSubmit={save}>
              <label className="block">
                Display name
                <Input
                  required
                  maxLength={100}
                  value={editing.display_name}
                  onChange={(e) =>
                    setEditing({ ...editing, display_name: e.target.value })
                  }
                />
              </label>
              <label className="block">
                Email
                <Input
                  type="email"
                  required
                  value={editing.email}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </label>
              <label className="block">
                Account type
                <select
                  className="ml-3 rounded border border-white/10 bg-background p-2"
                  disabled={editing.user_type === "admin"}
                  value={editing.user_type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      user_type: e.target.value as Account["user_type"],
                    })
                  }
                >
                  {editing.user_type === "admin" ? (
                    <option value="admin">Admin</option>
                  ) : (
                    <>
                      <option value="user">Listener</option>
                      <option value="artist">Artist</option>
                    </>
                  )}
                </select>
              </label>
              {error && (
                <p role="alert" className="text-red-300">
                  {error}
                </p>
              )}
              <Button disabled={busy}>
                {busy ? "Saving…" : "Save account"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open && !busy) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.status === "active"
                ? "Restore account?"
                : target?.status === "paused"
                  ? "Pause account?"
                  : "Remove account?"}
            </DialogTitle>
            <DialogDescription>
              {target?.account.email} ·{" "}
              {target?.status === "active"
                ? "This restores access to Guruplay."
                : "This blocks sign-in and existing sessions. Account data is preserved so an administrator can restore access."}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setTarget(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!target) return;
                setBusy(true);
                setError("");
                try {
                  await request(`/${target.account.id}/status`, "POST", {
                    status: target.status,
                  });
                  await query.refetch();
                  setTarget(null);
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Could not update access.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Confirm account change"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
