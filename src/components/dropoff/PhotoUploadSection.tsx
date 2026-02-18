import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, ImagePlus } from 'lucide-react';

interface PhotoUploadSectionProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  label?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PhotoUploadSection({
  files,
  onChange,
  maxFiles = 3,
  maxSizeMB = 5,
  label = 'Photos (optional)',
}: PhotoUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Create and revoke object URLs for previews; revoke on files change or unmount
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    setError(null);

    const newFiles: File[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Only JPG, PNG, and WebP images are allowed.');
        continue;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Each file must be under ${maxSizeMB}MB.`);
        continue;
      }
      newFiles.push(file);
    }

    const combined = [...files, ...newFiles].slice(0, maxFiles);
    onChange(combined);

    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="card-elevated p-6 space-y-4">
      <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Camera className="w-4 h-4" />
        {label}
      </h2>

      <p className="text-xs text-muted-foreground">
        Upload up to {maxFiles} photos of your racquet (JPG, PNG, or WebP, max {maxSizeMB}MB each).
      </p>

      {/* Thumbnail previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative group w-20 h-20 rounded-md overflow-hidden border border-border bg-muted"
            >
              <img
                src={previewUrls[index] ?? ''}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove photo ${index + 1}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < maxFiles && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="w-4 h-4" />
            Add Photo{files.length > 0 ? ` (${files.length}/${maxFiles})` : ''}
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
