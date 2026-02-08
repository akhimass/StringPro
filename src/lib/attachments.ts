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

/**
 * Upload a single photo to Supabase Storage and insert a job_attachments row.
 */
export async function uploadJobPhoto(
  jobId: string,
  stage: 'intake' | 'completed' | 'issue',
  file: File,
  uploadedByName?: string | null
): Promise<JobAttachment> {
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

/**
 * Upload multiple photos for a job.
 */
export async function uploadJobPhotos(
  jobId: string,
  stage: 'intake' | 'completed' | 'issue',
  files: File[],
  uploadedByName?: string | null
): Promise<{ attachments: JobAttachment[]; errors: Error[] }> {
  const attachments: JobAttachment[] = [];
  const errors: Error[] = [];

  for (const file of files) {
    try {
      const att = await uploadJobPhoto(jobId, stage, file, uploadedByName);
      attachments.push(att);
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }

  return { attachments, errors };
}

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

/**
 * Delete an attachment (both storage file and DB row).
 */
export async function deleteJobAttachment(attachment: JobAttachment): Promise<void> {
  await supabase.storage.from(BUCKET).remove([attachment.file_path]);
  const { error } = await (supabase
    .from('job_attachments' as any)
    .delete()
    .eq('id', attachment.id) as any);
  if (error) throw error;
}
