import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import Typography from "@/components/ui/typography";

const PromoBanner = () => {
  const { isAuthenticated, openAuthDialog } = useAuth();

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* <div className="relative z-50 flex min-h-14 items-center justify-between gap-4 border-b border-white/10 bg-[#123f86] px-4 py-3 md:px-6">
      <Typography variant="body-sm" className="text-white/75">
        <span className="font-bold text-white">Sign up for Guruplay today.</span>{' '}
        Listen to curated playlists, spotlight uploads, and independent artists for free.
      </Typography>
      <Button
        onClick={() => openAuthDialog('signup')}
        className="h-10 shrink-0 rounded-full bg-white px-5 text-sm font-bold text-black hover:bg-white/90"
      >
        Create a free account
      </Button>
    </div> */}
    </>
  );
};

export default PromoBanner;
