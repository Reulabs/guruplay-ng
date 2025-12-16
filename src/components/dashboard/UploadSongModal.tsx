import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Image, Music, X } from "lucide-react";

interface UploadSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (song: { name: string; artist: string; coverUrl: string }) => void;
}

const UploadSongModal = ({ isOpen, onClose, onUpload }: UploadSongModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    artist: "",
    album: "",
    genre: "",
    description: "",
  });
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    // TODO: Connect to your backend API for actual upload
    // Simulating upload for now
    setTimeout(() => {
      onUpload({
        name: formData.name,
        artist: formData.artist || "You",
        coverUrl: coverPreview || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300",
      });
      
      // Reset form
      setFormData({ name: "", artist: "", album: "", genre: "", description: "" });
      setCoverPreview(null);
      setAudioFile(null);
      setIsUploading(false);
      onClose();
    }, 1500);
  };

  const resetForm = () => {
    setFormData({ name: "", artist: "", album: "", genre: "", description: "" });
    setCoverPreview(null);
    setAudioFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload New Song</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover Photo Upload */}
          <div className="space-y-2">
            <Label>Cover Photo</Label>
            <div
              onClick={() => coverInputRef.current?.click()}
              className="relative aspect-square w-40 mx-auto rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors overflow-hidden bg-muted/30"
            >
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCoverPreview(null); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-background/80 rounded-full flex items-center justify-center hover:bg-background"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Image className="w-8 h-8 mb-2" />
                  <span className="text-xs">Click to upload</span>
                </div>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />
          </div>

          {/* Audio File Upload */}
          <div className="space-y-2">
            <Label>Audio File</Label>
            <div
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/30"
            >
              {audioFile ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{audioFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAudioFile(null); }}
                    className="w-6 h-6 bg-background/80 rounded-full flex items-center justify-center hover:bg-background"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Click to upload audio file (MP3, WAV)</span>
                </div>
              )}
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="hidden"
            />
          </div>

          {/* Song Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Song Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter song name"
                className="bg-muted/30 border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="artist">Artist Name</Label>
              <Input
                id="artist"
                name="artist"
                value={formData.artist}
                onChange={handleChange}
                placeholder="Your name"
                className="bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="album">Album</Label>
              <Input
                id="album"
                name="album"
                value={formData.album}
                onChange={handleChange}
                placeholder="Album name (optional)"
                className="bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                placeholder="e.g., Pop, Rock, Hip-Hop"
                className="bg-muted/30 border-border"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Tell listeners about your song..."
                className="bg-muted/30 border-border resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { resetForm(); onClose(); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!formData.name || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload Song"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadSongModal;
