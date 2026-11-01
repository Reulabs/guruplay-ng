import UserManagement from "@/components/UserManagement";
import SupportManagement from "@/components/SupportManagement";
import { Input } from "@guruplay/ui/input";
import { supabase } from "@/lib/supabase";
import { Logo } from "@guruplay/shared/logo";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Check,
  Disc3,
  Loader2,
  Music2,
  Plus,
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
import Typography from "@guruplay/ui/typography";
import { Button } from "@guruplay/ui/button";
import { Badge } from "@guruplay/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@guruplay/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@guruplay/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@guruplay/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@guruplay/ui/dialog";
import EmptyTableRow from "@guruplay/shared/fallbacks/EmptyTableRow";

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
    updateSongStatus,
    deleteSong,
  } = useAdmin();
  const { toast } = useToast();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
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
        title:
          status === ArtistApprovalStatus.Approved
            ? "Artist approved"
            : "Artist rejected",
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

  const handleSongAction = async (
    songId: string,
    status: "approved" | "rejected",
    rejectionReason?: string,
  ) => {
    setBusyId(songId);
    try {
      await updateSongStatus(songId, status, rejectionReason);
      setRejectId(null);
      setReason("");
      toast({
        title: status === "approved" ? "Song approved" : "Song rejected",
        description:
          status === "approved"
            ? "Approval saved. The song becomes public when audio processing is ready."
            : "The song remains hidden from public listings.",
      });
    } catch (actionError) {
      toast({
        title: "Action failed",
        description:
          actionError instanceof Error
            ? actionError.message
            : "Could not update song status.",
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

  if (isAuthLoading || (loading && !isAdmin)) {
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
          <Logo className="mb-4" markClassName="h-12 w-12" />
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
          <Logo className="mb-4" markClassName="h-12 w-12" />
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
            <Logo />
            <div>
              <Typography variant="body" weight="bold">
                Guruplay
              </Typography>
              <Typography variant="caption" className="text-white/45">
                Admin console
              </Typography>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild className="rounded-full">
              <Link to="/dashboard">
                <Plus className="mr-1 h-4 w-4" />
                Upload song
              </Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-white/10 bg-white/[0.04]"
              disabled={loading}
              onClick={refresh}
            >
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Typography
              variant="eyebrow"
              weight="bold"
              className="text-white/45"
            >
              Operations
            </Typography>
            <Typography as="h1" variant="h1" weight="bold" className="mt-2">
              Admin dashboard
            </Typography>
            <Typography variant="body" tone="muted" className="mt-2">
              Manage users, artist approvals, catalog content, and platform
              activity.
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
                  <Typography
                    as="p"
                    variant="h2"
                    weight="bold"
                    className="mt-2"
                  >
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
          <TabsList className="bg-white/[0.06] flex flex-wrap h-auto gap-1">
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="songs">Songs</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
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
                            <Typography
                              variant="caption"
                              className="text-white/45"
                            >
                              {artist.location || "No location"}
                            </Typography>
                          </div>
                        </TableCell>
                        <TableCell>{artist.genre}</TableCell>
                        <TableCell>
                          {renderStatus(artist.approval_status)}
                        </TableCell>
                        <TableCell>{formatDate(artist.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="rounded-full"
                              disabled={
                                busyId === artist.id ||
                                artist.approval_status ===
                                  ArtistApprovalStatus.Approved
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
                                artist.approval_status ===
                                  ArtistApprovalStatus.Rejected
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
                      <EmptyTableRow
                        colSpan={5}
                        message="No artist applications yet."
                      />
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
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
                      <TableHead>Status</TableHead>
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
                              <Typography
                                variant="caption"
                                className="text-white/45"
                              >
                                {song.artist || "Unknown artist"}
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{song.genre || "Unassigned"}</TableCell>
                        <TableCell>
                          {renderStatus(song.approval_status)}
                        </TableCell>
                        <TableCell>
                          {song.total_plays.toLocaleString()}
                        </TableCell>
                        <TableCell>{formatDate(song.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                setPreviewTitle(song.title);
                                setPreviewUrl("");
                                setPreviewError("");
                                try {
                                  const { data } =
                                    await supabase.auth.getSession();
                                  const response = await fetch(
                                    `/api/v1/admin/songs/${song.id}/preview`,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${data.session?.access_token}`,
                                      },
                                    },
                                  );
                                  const result = await response.json();
                                  if (!response.ok)
                                    throw new Error(result.error);
                                  setPreviewUrl(result.url);
                                } catch (error) {
                                  setPreviewError(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to preview.",
                                  );
                                }
                              }}
                            >
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-full"
                              disabled={
                                busyId === song.id ||
                                song.approval_status === "approved"
                              }
                              onClick={() =>
                                handleSongAction(song.id, "approved")
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
                                busyId === song.id ||
                                song.approval_status === "rejected"
                              }
                              onClick={() => setRejectId(song.id)}
                            >
                              <X className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
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
                      <EmptyTableRow colSpan={6} message="No songs found." />
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <SupportManagement />
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
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Administrator</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {renderStatus(item.action)}
                        </TableCell>
                        <TableCell>
                          {item.target_id || "Platform"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-white/55">
                          {item.actor_id || "System"}
                        </TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {activity.length === 0 && (
                      <EmptyTableRow
                        colSpan={4}
                        message="No recent activity."
                      />
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog
        open={!!rejectId}
        onOpenChange={(open) => {
          if (!open) setRejectId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject song</DialogTitle>
            <DialogDescription>
              Give the artist a reason for this decision.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (rejectId) void handleSongAction(rejectId, "rejected", reason);
            }}
          >
            <label>
              Rejection reason
              <Input
                required
                minLength={5}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <Button disabled={!!busyId || reason.trim().length < 5}>
              Reject song
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!previewTitle}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTitle("");
            setPreviewUrl("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review audio</DialogTitle>
            <DialogDescription>{previewTitle}</DialogDescription>
          </DialogHeader>
          {previewError ? (
            <p role="alert">{previewError}</p>
          ) : previewUrl ? (
            <audio controls src={previewUrl} className="w-full" />
          ) : (
            <p>Loading audio…</p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={() => setDeleteTarget(null)}
      >
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
