import { LibraryBig } from "lucide-react";
import EmptyState from "@/components/fallbacks/EmptyState";
import Typography from "@/components/ui/typography";

const Library = () => (
  <div className="p-6 pb-40">
    <Typography as="h1" variant="h1" weight="bold" className="mb-6">
      Your Library
    </Typography>
    <EmptyState
      icon={LibraryBig}
      title="Your library is empty"
      description="Saved songs, albums, and playlists will appear here when library saving is available."
    />
  </div>
);

export default Library;
