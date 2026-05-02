import { adminFetchJson, type AdminJsonResult } from '@/lib/admin-api';

export type FormSubmissionRow = {
  id: string;
  fields: Record<string, unknown>;
  submitted_at: string;
  read_flag?: boolean;
};

export function fetchProjectFormSubmissions(
  projectId: string,
  limit = 80
): Promise<AdminJsonResult<{ submissions?: FormSubmissionRow[] }>> {
  const q = new URLSearchParams({ limit: String(limit) }).toString();
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/form-submissions?${q}`);
}

export function patchFormSubmissionReadFlag(
  projectId: string,
  submissionId: string,
  readFlag: boolean
): Promise<AdminJsonResult<{ success?: boolean }>> {
  return adminFetchJson(`/api/admin/projects/${encodeURIComponent(projectId)}/form-submissions/${encodeURIComponent(submissionId)}/read`, {
    method: 'PATCH',
    json: { read_flag: readFlag },
  });
}
