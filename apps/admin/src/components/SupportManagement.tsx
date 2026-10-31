import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@guruplay/ui/button";
import { Textarea } from "@guruplay/ui/textarea";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  response: string;
  status: "open" | "resolved";
  created_at: string;
}
async function request<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`/api/v1/support/admin${path}`, {
    method: body ? "PATCH" : "GET",
    headers: {
      Authorization: `Bearer ${data.session?.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Support request failed.");
  return result;
}
function TicketCard({
  ticket,
  onSaved,
}: {
  ticket: Ticket;
  onSaved: () => Promise<unknown>;
}) {
  const [response, setResponse] = useState(ticket.response);
  const [status, setStatus] = useState(ticket.status);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <article className="p-5 rounded-2xl border border-white/10 space-y-3">
      <h3 className="font-bold">{ticket.subject}</h3>
      <p className="text-xs text-muted-foreground break-all">
        {ticket.user_id} · {new Date(ticket.created_at).toLocaleString()}
      </p>
      <p className="whitespace-pre-wrap break-words">{ticket.message}</p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await request(`/${ticket.id}`, { response, status });
            await onSaved();
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Could not save reply.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          Response
          <Textarea
            required
            maxLength={4000}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
        </label>
        <label className="block">
          Status
          <select
            className="ml-3 rounded bg-background border border-white/10 p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as Ticket["status"])}
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        {error && (
          <p role="alert" className="text-red-300">
            {error}
          </p>
        )}
        <Button disabled={busy || !response.trim()}>
          {busy ? "Saving…" : "Save response"}
        </Button>
      </form>
    </article>
  );
}
export default function SupportManagement() {
  const query = useQuery({
    queryKey: ["admin-support"],
    queryFn: () => request<{ items: Ticket[] }>(""),
  });
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Support requests</h2>
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.items.length ? (
        query.data.items.map((ticket) => (
          <TicketCard
            key={`${ticket.id}-${ticket.response}-${ticket.status}`}
            ticket={ticket}
            onSaved={query.refetch}
          />
        ))
      ) : (
        <EmptyState
          title="No support requests"
          description="Listener support requests will appear here."
        />
      )}
    </div>
  );
}
