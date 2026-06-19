import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Typography from "@/components/ui/typography";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <Typography as="h1" variant="display" weight="bold" align="center" className="mb-4">404</Typography>
        <Typography variant="h3" tone="muted" align="center" className="mb-4">Oops! Page not found</Typography>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
