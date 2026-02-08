import { supabase } from '@/lib/supabase';

export interface JobAttachment {
  id: string;
  job_id: string;
  stage: 'intake' | 'completed' | 'issue';
  url: string;
  file_path: string;
  uploaded_by_name: string | null;
  created_at: string | null;
}

const BUCKET = 'racquet-photos';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Upload a single photo to Supabase Storage and insert a job_attachments row.
 * Validates file type (jpg/png/webp) and size (<= 5MB).
 */
export async function uploadJobPhoto(
  jobId: string,
  stage: 'intake' | 'completed' | 'issue',
  file: File,
  uploadedByName?: string | null
): Promise<JobAttachment> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are allowed.');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File must be 5MB or less (${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB).`);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const uuid = crypto.randomUUID();
  const storagePath = `jobs/${jobId}/${stage}/${uuid}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  const { data, error } = await (supabase
    .from('job_attachments' as any)
    .insert({
      job_id: jobId,
      stage,
      url: publicUrl,
      file_path: storagePath,
      uploaded_by_name: uploadedByName || null,
    } as any)
    .select()
    .single() as any);

  if (error) throw error;
  return data as JobAttachment;
}

export interface UploadError {
  fileName: string;
  message: string;
}

/**
 * Upload multiple photos for a job. Continues on failure and returns successes + failures.
 */
export async function uploadMultipleJobPhotos(
  jobId: string,
  stage: 'intake' | 'completed' | 'issue',
  files: File[],
  uploadedByName?: string | null
): Promise<{ attachments: JobAttachment[]; errors: UploadError[] }> {
  const attachments: JobAttachment[] = [];
  const errors: UploadError[] = [];

  for (const file of files) {
    try {
      const att = await uploadJobPhoto(jobId, stage, file, uploadedByName);
      attachments.push(att);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ fileName: file.name, message });
    }
  }

  return { attachments, errors };
}

/** @deprecated Use uploadMultipleJobPhotos */
export const uploadJobPhotos = uploadMultipleJobPhotos;

/**
 * Fetch all attachments for a given job.
 */
export async function fetchJobAttachments(jobId: string): Promise<JobAttachment[]> {
  const { data, error } = await (supabase
    .from('job_attachments' as any)
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true }) as any);

  if (error) throw error;
  return (data || []) as JobAttachment[];
}

export interface DeleteAttachmentResult {
  storageFailed?: boolean;
}

/**
 * Delete an attachment: remove storage object (best-effort) and always remove DB row.
 * If storage delete fails, still removes DB row; returns storageFailed: true so UI can warn.
 */
export async function deleteJobAttachment(
  attachment: JobAttachment
): Promise<DeleteAttachmentResult> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([attachment.file_path]);

  const { error: dbError } = await (supabase
    .from('job_attachments' as any)
    .delete()
    .eq('id', attachment.id) as any);

  if (dbError) throw dbError;
  return storageError ? { storageFailed: true } : {};
}
