import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@guruplay/ui/input";
import { Textarea } from "@guruplay/ui/textarea";
import { Button } from "@guruplay/ui/button";
import ErrorState from "@guruplay/shared/fallbacks/ErrorState";
import LoadingState from "@guruplay/shared/fallbacks/LoadingState";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";
import PersonalGate from "@/components/PersonalGate";
import {
  personalRequest,
  Ticket,
  usePersonalMutation,
} from "@/hooks/use-personal";
import { useAuth } from "@/context/AuthContext";
function Contents() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["personal", user?.id, "support"],
    queryFn: () => personalRequest<{ items: Ticket[] }>("support"),
  });
  const mutation = usePersonalMutation();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSent(false);
    try {
      await mutation.mutateAsync({
        path: "support",
        method: "POST",
        body: { subject, message },
      });
      setSubject("");
      setMessage("");
      setSent(true);
    } catch {
      /* Displayed below. */
    }
  };
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Support</h1>
      <p className="text-muted-foreground mb-8">
        Tell us what happened. You can read the team's response here.
      </p>
      <form className="space-y-4 mb-10" onSubmit={submit}>
        <label className="block">
          Subject
          <Input
            required
            maxLength={120}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="block">
          Message
          <Textarea
            required
            minLength={10}
            maxLength={4000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <p className="text-sm text-muted-foreground">
          Do not include passwords or payment card details.
        </p>
        {mutation.error && (
          <p role="alert" className="text-red-300">
            {mutation.error.message}
          </p>
        )}
        {sent && (
          <p role="status" className="text-green-300">
            Support request received.
          </p>
        )}
        <Button disabled={mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send request"}
        </Button>
      </form>
      <h2 className="text-xl font-bold mb-4">Your requests</h2>
      {query.isLoading ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : query.data?.items.length ? (
        query.data.items.map((ticket) => (
          <article
            className="rounded-2xl border border-white/10 p-5 mb-4 break-words"
            key={ticket.id}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-bold">{ticket.subject}</h3>
              <span className="text-sm capitalize text-muted-foreground">
                {ticket.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(ticket.created_at).toLocaleString()}
            </p>
            <p className="mt-4 whitespace-pre-wrap">{ticket.message}</p>
            {ticket.response && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="font-bold text-sm mb-2">Guruplay support</p>
                <p className="whitespace-pre-wrap">{ticket.response}</p>
              </div>
            )}
          </article>
        ))
      ) : (
        <EmptyState
          title="No support requests yet"
          description="Your requests and replies will appear here."
        />
      )}
    </div>
  );
}
export default function Support() {
  return (
    <div className="p-5 md:p-8 pb-56">
      <PersonalGate>
        <Contents />
      </PersonalGate>
    </div>
  );
}
