export interface Note {
  _id: string;
  content: string;
  title: string;
  type: 'text' | 'image' | 'file';
  filename?: string;
  originalName?: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Share {
  _id: string;
  slug: string;
  type: string;
  noteId: Note | string;
  createdAt: string;
}
