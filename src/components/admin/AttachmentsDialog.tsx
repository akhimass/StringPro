import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RacquetJob } from '@/types';
import { JobAttachment, fetchJobAttachments, uploadJobPhoto, deleteJobAttachment } from '@/lib/attachments';
import { toast } from 'sonner';
import { Camera, ImagePlus, Trash2, X, Loader2 } from 'lucide-react';

interface AttachmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racquet: RacquetJob | null;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

export function AttachmentsDialog({ open, onOpenChange, racquet }: AttachmentsDialogProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [completedStaffName, setCompletedStaffName] = useState('');
  const intakeInputRef = useRef<HTMLInputElement>(null);
  const completedInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['job-attachments', racquet?.id],
    queryFn: () => fetchJobAttachments(racquet!.id),
    enabled: open && !!racquet?.id,
  });

  const intakePhotos = attachments.filter((a) => a.stage === 'intake');
  const completedPhotos = attachments.filter((a) => a.stage === 'completed');

  const handleUpload = async (files: FileList | null, stage: 'intake' | 'completed') => {
    if (!files || !racquet) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error('Only JPG, PNG, and WebP images allowed.');
        continue;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`File too large: ${f.name} (max ${MAX_SIZE_MB}MB)`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    const staffName = stage === 'completed' ? (completedStaffName.trim() || null) : null;
    setUploading(true);
    let successCount = 0;
    for (const file of validFiles.slice(0, 3)) {
      try {
        await uploadJobPhoto(racquet.id, stage, file, staffName);
        successCount++;
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} photo(s) uploaded`);
      queryClient.invalidateQueries({ queryKey: ['job-attachments', racquet.id] });
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
    }
    setUploading(false);
  };

  const handleDelete = async (attachment: JobAttachment) => {
    try {
      const result = await deleteJobAttachment(attachment);
      queryClient.invalidateQueries({ queryKey: ['job-attachments', racquet?.id] });
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
      toast.success('Photo removed');
      if (result.storageFailed) {
        toast.warning('Photo removed from list; file may still exist in storage.');
      }
    } catch {
      toast.error('Failed to delete photo');
    }
  };

  if (!racquet) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Attachments — {racquet.ticket_number || racquet.member_name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="intake" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="intake" className="flex-1">
                Intake ({intakePhotos.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1">
                Completed ({completedPhotos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="intake" className="space-y-4 mt-4">
              <PhotoGrid
                photos={intakePhotos}
                isLoading={isLoading}
                onClickPhoto={setLightboxUrl}
                onDelete={handleDelete}
              />
              <input
                ref={intakeInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleUpload(e.target.files, 'intake');
                  if (intakeInputRef.current) intakeInputRef.current.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={uploading}
                onClick={() => intakeInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                Upload Intake Photo
              </Button>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              <PhotoGrid
                photos={completedPhotos}
                isLoading={isLoading}
                onClickPhoto={setLightboxUrl}
                onDelete={handleDelete}
              />
              <div className="space-y-2">
                <Label htmlFor="completedStaffName">Staff name (optional)</Label>
                <Input
                  id="completedStaffName"
                  value={completedStaffName}
                  onChange={(e) => setCompletedStaffName(e.target.value)}
                  placeholder="Who is uploading"
                  maxLength={100}
                  className="max-w-xs"
                />
              </div>
              <input
                ref={completedInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleUpload(e.target.files, 'completed');
                  if (completedInputRef.current) completedInputRef.current.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={uploading}
                onClick={() => completedInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                Upload Completed Photo
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxUrl && (
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="sm:max-w-3xl p-2">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxUrl}
              alt="Full size preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded-md"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function PhotoGrid({
  photos,
  isLoading,
  onClickPhoto,
  onDelete,
}: {
  photos: JobAttachment[];
  isLoading: boolean;
  onClickPhoto: (url: string) => void;
  onDelete: (att: JobAttachment) => void;
}) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>;
  }

  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No photos yet.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="relative group aspect-square rounded-md overflow-hidden border border-border bg-muted cursor-pointer"
          onClick={() => onClickPhoto(photo.url)}
        >
          <img
            src={photo.url}
            alt="Attachment"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(photo);
            }}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete photo"
          >
            <Trash2 className="w-3 h-3 text-destructive-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
