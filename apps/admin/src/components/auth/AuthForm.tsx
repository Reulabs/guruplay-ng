import { FormEvent, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@guruplay/ui/button";
import { Input } from "@guruplay/ui/input";
import { Label } from "@guruplay/ui/label";
import { getAppError } from "@guruplay/common/errors";

export default function AuthForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (cause) {
      setError(getAppError(cause).message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm leading-6"
        >
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="admin-email">Email address</Label>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        className="w-full rounded-full"
        disabled={isLoading}
      >
        {isLoading ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Use an existing administrator account. Contact your team if you need
        access.
      </p>
    </form>
  );
}
