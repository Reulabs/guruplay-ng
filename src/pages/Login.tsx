import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Connect to your backend API
    // Simulating login for now
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <Music2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Log in to Melodify</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email or username</Label>
            <Input
              id="email"
              type="text"
              placeholder="Email or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#121212] border-[#727272] focus:border-foreground"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[#121212] border-[#727272] focus:border-foreground"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-full"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <div className="text-center">
          <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground underline">
            Forgot your password?
          </Link>
        </div>

        <div className="border-t border-border pt-6 text-center">
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-foreground hover:text-primary font-semibold underline">
              Sign up for Melodify
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
