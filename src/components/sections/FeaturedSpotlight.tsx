import {
  ArrowUp,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { Track } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";
import { usePlayer } from "@/context/PlayerContext";
import { cn } from "@/lib/utils";

interface FeaturedSpotlightProps {
  tracks: Track[];
}

const tabs = ["For you", "Staff Picks", "Uploads"];

const FeaturedSpotlight = ({ tracks }: FeaturedSpotlightProps) => {
  const { playPlaylist } = usePlayer();
  const featuredTracks = tracks.slice(0, 6);

  return (
    <section className="space-y-7">
      <div className="relative overflow-hidden rounded-3xl bg-[#df1f2a] px-6 py-8 sm:px-10 lg:min-h-[320px] lg:px-12">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="max-w-sm">
            <div className="mb-4 flex items-center gap-3">
              <Typography
                as="h1"
                variant="display"
                weight="black"
                className="text-white"
              >
                Spotlight
              </Typography>
              <span className="grid h-10 w-10 place-items-center rounded-xl border-[3px] border-white text-white">
                <ArrowUp className="h-6 w-6" />
              </span>
            </div>
            <Typography variant="title" weight="bold" className="text-white">
              Where emerging voices find their stage
            </Typography>
          </div>
{/* 
          <div className="max-w-xl justify-self-end">
            <Typography
              variant="title"
              weight="bold"
              className="leading-7 text-white"
            >
              Spotlight highlights exceptional uploads from independent artists,
              handpicked by our editorial team. Featured songs are added to
              curated playlists and each eligible artist receives $1000 USD when
              a track is selected.
            </Typography>
            <Button
              onClick={() => playPlaylist(featuredTracks)}
              className="mt-7 h-12 rounded-full bg-white px-7 text-base font-bold text-black hover:bg-white/90"
            >
              <Play className="h-5 w-5 fill-current" />
              Listen Now
            </Button>
          </div> */}
        </div>

        <img
          src="https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?w=650&h=650&fit=crop"
          alt=""
          className="pointer-events-none absolute bottom-0 left-1/2 hidden h-[105%] -translate-x-1/2 object-cover mix-blend-multiply opacity-70 lg:block"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            className={cn(
              "rounded-full px-5 py-2.5 text-sm font-bold transition-colors",
              index === 0
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/15",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Typography as="h2" variant="h2" weight="bold">
            Uploads for purchase
          </Typography>
          <div className="hidden items-center gap-3 text-sm font-bold text-muted-foreground sm:flex">
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/15"
              aria-label="Previous uploads"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/15"
              aria-label="Next uploads"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span>View all</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {featuredTracks.map((track) => (
            <button
              key={track.id}
              onClick={() => playPlaylist([track])}
              className="group min-w-0 text-left"
            >
              <img
                src={track.coverUrl}
                alt={track.title}
                className="aspect-square w-full rounded object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="mt-3 flex min-w-0 items-center gap-2">
                <Typography variant="body" weight="bold" truncate>
                  {track.title}
                </Typography>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/15 text-white">
                  <ArrowUp className="h-4 w-4" />
                </span>
                <BadgeCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
              <Typography
                variant="body-sm"
                tone="muted"
                className="mt-1"
                truncate
              >
                {track.artist}
              </Typography>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedSpotlight;
