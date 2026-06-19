import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Check,
  Disc3,
  Loader2,
  Music2,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { ArtistApprovalStatus } from "@/lib/artist";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import Typography from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusTone: Record<string, string> = {
  approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  rejected: "border-red-400/20 bg-red-400/10 text-red-200",
  not_applied: "border-white/10 bg-white/[0.04] text-white/55",
  user: "border-white/10 bg-white/[0.04] text-white/65",
  artist: "border-blue-400/20 bg-blue-400/10 text-blue-200",
  admin: "border-primary/30 bg-primary/10 text-primary",
};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value))
    : "Unknown";

const Admin = () => {
  const { isAuthenticated, isAuthLoading, openAuthDialog } = useAuth();
  const {
    isAdmin,
    loading,
    error,
    users,
    artists,
    songs,
    activity,
    refresh,
    updateArtistStatus,
    deleteSong,
  } = useAdmin();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const metrics = useMemo(() => {
    const pendingArtists = artists.filter(
      (artist) => artist.approval_status === ArtistApprovalStatus.Pending,
    ).length;
    const approvedArtists = artists.filter(
      (artist) => artist.approval_status === ArtistApprovalStatus.Approved,
    ).length;
    const totalPlays = songs.reduce(
      (total, song) => total + (song.total_plays || 0),
      0,
    );

    return [
      {
        label: "Users",
        value: users.length.toLocaleString(),
        icon: Users,
      },
      {
        label: "Pending artists",
        value: pendingArtists.toLocaleString(),
        icon: UserCheck,
      },
      {
        label: "Approved artists",
        value: approvedArtists.toLocaleString(),
        icon: Shield,
      },
      {
        label: "Total plays",
        value: totalPlays.toLocaleString(),
        icon: Activity,
      },
    ];
  }, [artists, songs, users]);

  const handleArtistAction = async (
    profileId: string,
    status: ArtistApprovalStatus.Approved | ArtistApprovalStatus.Rejected,
  ) => {
    setBusyId(profileId);
    try {
      await updateArtistStatus(profileId, status);
      toast({
        title: status === ArtistApprovalStatus.Approved ? "Artist approved" : "Artist rejected",
        description: "The artist profile has been updated.",
      });
    } catch (actionError) {
      toast({
        title: "Action failed",
        description:
          actionError instanceof Error
            ? actionError.message
            : "Could not update artist status.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSong = async () => {
    if (!deleteTarget) return;

    setBusyId(deleteTarget.id);
    try {
      await deleteSong(deleteTarget.id);
      toast({
        title: "Song removed",
        description: `${deleteTarget.title} has been removed.`,
      });
      setDeleteTarget(null);
    } catch (actionError) {
      toast({
        title: "Delete failed",
        description:
          actionError instanceof Error
            ? actionError.message
            : "Could not delete song.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const renderStatus = (status: string) => (
    <Badge
      variant="outline"
      className={statusTone[status] || statusTone.not_applied}
    >
      {status.replace("_", " ")}
    </Badge>
  );

  if (isAuthLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading admin
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-white/45" />
          <Typography as="h1" variant="h1" weight="bold">
            Admin access
          </Typography>
          <Typography variant="body" tone="muted" className="mt-2">
            Log in with an administrator account to manage Guruplay.
          </Typography>
          <Button
            onClick={() => openAuthDialog("login")}
            className="mt-6 rounded-full px-6 font-bold"
          >
            Log in
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-white/45" />
          <Typography as="h1" variant="h1" weight="bold">
            Restricted area
          </Typography>
          <Typography variant="body" tone="muted" className="mt-2">
            Your account does not have permission to access the admin console.
          </Typography>
          {error && (
            <Typography variant="body-sm" className="mt-4 text-white/45">
              Admin access is currently unavailable.
            </Typography>
          )}
          <Button asChild className="mt-6 rounded-full px-6 font-bold">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Music2 className="h-5 w-5" />
            </div>
            <div>
              <Typography variant="body" weight="bold">
                Guruplay
              </Typography>
              <Typography variant="caption" className="text-white/45">
                Admin console
              </Typography>
            </div>
          </Link>
          <Button
            variant="outline"
            className="rounded-full border-white/10 bg-white/[0.04]"
            onClick={refresh}
          >
            Refresh
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Typography variant="eyebrow" weight="bold" className="text-white/45">
              Operations
            </Typography>
            <Typography as="h1" variant="h1" weight="bold" className="mt-2">
              Admin dashboard
            </Typography>
            <Typography variant="body" tone="muted" className="mt-2">
              Manage users, artist approvals, catalog content, and platform activity.
            </Typography>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card
              key={metric.label}
              className="rounded-3xl border-white/10 bg-white/[0.04]"
            >
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <Typography variant="body-sm" className="text-white/45">
                    {metric.label}
                  </Typography>
                  <Typography as="p" variant="h2" weight="bold" className="mt-2">
                    {metric.value}
                  </Typography>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-primary">
                  <metric.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="artists" className="space-y-6">
          <TabsList className="bg-white/[0.06]">
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="songs">Songs</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="artists">
            <Card className="rounded-3xl border-white/10 bg-white/[0.04]">
              <CardHeader>
                <CardTitle>Artist applications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead>Genre</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {artists.map((artist) => (
                      <TableRow key={artist.id}>
                        <TableCell>
                          <div>
                            <Typography variant="body-sm" weight="bold">
                              {artist.artist_name}
                            </Typography>
                            <Typography variant="caption" className="text-white/45">
                              {artist.location || "No location"}
                            </Typography>
                          </div>
                        </TableCell>
                        <TableCell>{artist.genre}</TableCell>
                        <TableCell>{renderStatus(artist.approval_status)}</TableCell>
                        <TableCell>{formatDate(artist.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="rounded-full"
                              disabled={
                                busyId === artist.id ||
                                artist.approval_status === ArtistApprovalStatus.Approved
                              }
                              onClick={() =>
                                handleArtistAction(
                                  artist.id,
                                  ArtistApprovalStatus.Approved,
                                )
                              }
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-white/10"
                              disabled={
                                busyId === artist.id ||
                                artist.approval_status === ArtistApprovalStatus.Rejected
                              }
                              onClick={() =>
                                handleArtistAction(
                                  artist.id,
                                  ArtistApprovalStatus.Rejected,
                                )
                              }
                            >
                              <X className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {artists.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-white/45">
                          No artist applications yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="rounded-3xl border-white/10 bg-white/[0.04]">
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.display_name}
                        </TableCell>
                        <TableCell>{account.email}</TableCell>
                        <TableCell>{renderStatus(account.user_type)}</TableCell>
                        <TableCell>{formatDate(account.created_at)}</TableCell>
                        <TableCell>{formatDate(account.last_login)}</TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-white/45">
                          No users found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="songs">
            <Card className="rounded-3xl border-white/10 bg-white/[0.04]">
              <CardHeader>
                <CardTitle>Catalog</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Song</TableHead>
                      <TableHead>Genre</TableHead>
                      <TableHead>Plays</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {songs.map((song) => (
                      <TableRow key={song.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white/[0.06]">
                              {song.cover_url ? (
                                <img
                                  src={song.cover_url}
                                  alt={song.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Disc3 className="h-5 w-5 text-white/45" />
                              )}
                            </div>
                            <div>
                              <Typography variant="body-sm" weight="bold">
                                {song.title}
                              </Typography>
                              <Typography variant="caption" className="text-white/45">
                                {song.artist || "Unknown artist"}
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{song.genre || "Unassigned"}</TableCell>
                        <TableCell>{song.total_plays.toLocaleString()}</TableCell>
                        <TableCell>{formatDate(song.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-red-400/20 text-red-200 hover:bg-red-500/10"
                              onClick={() =>
                                setDeleteTarget({
                                  id: song.id,
                                  title: song.title,
                                })
                              }
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {songs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-white/45">
                          No songs found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="rounded-3xl border-white/10 bg-white/[0.04]">
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Song</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{renderStatus(item.activity_type)}</TableCell>
                        <TableCell>
                          {item.songs?.title || "Unknown song"}
                          {item.songs?.artist && (
                            <span className="text-white/45"> by {item.songs.artist}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-white/55">
                          {item.user_id}
                        </TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {activity.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-white/45">
                          No recent activity.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="border-white/10 bg-neutral-950 text-white">
          <DialogHeader>
            <DialogTitle>Remove song</DialogTitle>
            <DialogDescription>
              This removes the song from the public catalog.
            </DialogDescription>
          </DialogHeader>
          <Typography variant="body" className="text-white">
            {deleteTarget?.title}
          </Typography>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/10"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busyId === deleteTarget?.id}
              onClick={handleDeleteSong}
            >
              Remove song
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
