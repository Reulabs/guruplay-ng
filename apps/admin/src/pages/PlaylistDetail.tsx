import { ListMusic } from "lucide-react";
import EmptyState from "@guruplay/shared/fallbacks/EmptyState";

const PlaylistDetail = () => (
  <div className="p-6 pb-40">
    <EmptyState
      icon={ListMusic}
      title="Playlist not found"
      description="This playlist is unavailable or has been removed."
    />
  </div>
);

export default PlaylistDetail;
