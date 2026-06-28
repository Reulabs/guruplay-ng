import { useNavigate } from "react-router-dom";
import { MapPinOff } from "lucide-react";
import EmptyState from "@/components/fallbacks/EmptyState";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-xl">
        <EmptyState
          icon={MapPinOff}
          title="Page not found"
          description="The page you requested does not exist or has moved."
          actionLabel="Return home"
          onAction={() => navigate("/")}
        />
      </div>
    </div>
  );
};

export default NotFound;
