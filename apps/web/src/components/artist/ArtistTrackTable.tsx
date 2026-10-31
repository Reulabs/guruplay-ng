import { useState } from "react";
import { Track } from "@/types/music";
import Typography from "@guruplay/ui/typography";
import { Button } from "@guruplay/ui/button";
import TrackCard from "@/components/cards/TrackCard";
interface ArtistTrackTableProps {
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
  title?: string;
}
export default function ArtistTrackTable({
  tracks,
  title = "Top Tracks",
}: ArtistTrackTableProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tracks : tracks.slice(0, 5);
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <Typography as="h2" variant="h2" weight="bold">
          {title}
        </Typography>
        {tracks.length > 5 && (
          <Button variant="ghost" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : "View all"}
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
        {visible.map((track, index) => (
          <TrackCard key={track.id} track={track} index={index + 1} showIndex />
        ))}
      </div>
    </section>
  );
}
