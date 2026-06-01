import type { Note, Share } from './types';

function getToken(): string {
  return localStorage.getItem('token') ?? '';
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  isFormData?: boolean
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken()}`,
  };
  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body
      ? JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login(sequence: string): Promise<{ token: string }> {
    return request('POST', '/api/auth/login', { sequence });
  },
  verify(): Promise<{ ok: boolean }> {
    return request('GET', '/api/auth/verify');
  },

  // Notes
  getNotes(): Promise<Note[]> {
    return request('GET', '/api/notes');
  },
  createNote(data: { content: string; title: string; type: string }): Promise<Note> {
    return request('POST', '/api/notes', data);
  },
  updateNote(id: string, data: { content?: string; title?: string }): Promise<Note> {
    return request('PUT', `/api/notes/${id}`, data);
  },
  deleteNote(id: string): Promise<void> {
    return request('DELETE', `/api/notes/${id}`);
  },

  // Files
  uploadFile(file: File): Promise<Note> {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', '/api/files/upload', fd, true);
  },

  // Shares
  getShares(): Promise<Share[]> {
    return request('GET', '/api/shares');
  },
  createShare(data: { noteId: string; slug: string }): Promise<Share> {
    return request('POST', '/api/shares', data);
  },
  deleteShare(id: string): Promise<void> {
    return request('DELETE', `/api/shares/${id}`);
  },
  getPublicShare(slug: string): Promise<{ share: Share; note: Note }> {
    return request('GET', `/api/shares/public/${slug}`);
  },
};
