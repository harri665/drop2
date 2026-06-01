import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Note, Share } from '../types';
import { relTime, fmtSize, fileIcon } from '../utils';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { Lightbox } from './Lightbox';
import { MarkdownEditor } from './MarkdownEditor';
import { ShareModal } from './ShareModal';

interface NoteCardProps {
  note: Note;
  onUpdated: (note: Note) => void;
  onDeleted: (id: string) => void;
}

export function NoteCard({ note, onUpdated, onDeleted }: NoteCardProps) {
  const [showEditor, setShowEditor] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this note?')) return;
    setDeleting(true);
    try {
      await api.deleteNote(note._id);
      onDeleted(note._id);
    } catch (err) {
      showToast((err as Error).message, 'error');
      setDeleting(false);
    }
  };

  const handleCopyMarkdown = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(note.content);
      showToast('Copied to clipboard!');
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleCopyImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/files/view/${note._id}`);
      if (!res.ok) throw new Error('Failed to fetch image');
      const blob = await res.blob();
      const mimeType = blob.type || 'image/png';
      await navigator.clipboard.write([
        new ClipboardItem({ [mimeType]: blob }),
      ]);
      showToast('Image copied!');
    } catch (err) {
      showToast((err as Error).message || 'Failed to copy image', 'error');
    }
  };

  const btnBase =
    'px-2.5 py-1 rounded-lg text-xs transition-colors border border-transparent';
  const btnGray = `${btnBase} text-gray-500 hover:text-gray-300 hover:bg-gray-800 hover:border-gray-700`;
  const btnRed = `${btnBase} text-red-600 hover:text-red-400 hover:bg-red-900/20 hover:border-red-800`;

  if (note.type === 'text') {
    return (
      <>
        <div
          className="bg-gray-900 border border-gray-800 rounded-2xl p-4 break-inside-avoid mb-4 cursor-pointer hover:border-gray-700 transition-colors group"
          onDoubleClick={() => setShowEditor(true)}
          title="Double-click to edit"
        >
          {note.title && (
            <h3 className="text-gray-100 font-semibold text-sm mb-2 truncate">{note.title}</h3>
          )}
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 line-clamp-[12] pointer-events-none select-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content || '*Empty note*'}</ReactMarkdown>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
            <span className="text-xs text-gray-600">{relTime(note.updatedAt)}</span>
            <div className="flex gap-1">
              <button onClick={handleCopyMarkdown} className={btnGray} title="Copy markdown">
                MD
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowShare(true); }}
                className={btnGray}
                title="Share"
              >
                Share
              </button>
              <button
                onClick={() => setShowEditor(true)}
                className={btnGray}
                title="Edit"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={btnRed}
                title="Delete"
              >
                {deleting ? '…' : 'Del'}
              </button>
            </div>
          </div>
        </div>

        {showEditor && (
          <MarkdownEditor
            note={note}
            onClose={() => setShowEditor(false)}
            onSaved={updated => { onUpdated(updated); setShowEditor(false); }}
          />
        )}
        {showShare && (
          <ShareModal
            note={note}
            onClose={() => setShowShare(false)}
            onCreated={(_: Share) => setShowShare(false)}
          />
        )}
      </>
    );
  }

  if (note.type === 'image') {
    const imgSrc = `/api/files/view/${note._id}`;
    return (
      <>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden break-inside-avoid mb-4 hover:border-gray-700 transition-colors">
          <div
            className="cursor-pointer overflow-hidden"
            onClick={() => setShowLightbox(true)}
          >
            <img
              src={imgSrc}
              alt={note.originalName ?? note.title ?? 'Image'}
              className="w-full object-cover hover:opacity-90 transition-opacity"
              loading="lazy"
            />
          </div>
          <div className="p-3">
            {note.title && (
              <p className="text-gray-300 text-xs font-medium truncate mb-2">{note.title}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{relTime(note.updatedAt)}</span>
              <div className="flex gap-1">
                <button onClick={handleCopyImage} className={btnGray} title="Copy image">
                  Copy
                </button>
                <a
                  href={`/api/files/download/${note._id}`}
                  onClick={e => e.stopPropagation()}
                  className={`${btnGray} no-underline`}
                  title="Download"
                >
                  ↓
                </a>
                <button
                  onClick={e => { e.stopPropagation(); setShowShare(true); }}
                  className={btnGray}
                  title="Share"
                >
                  Share
                </button>
                <button onClick={handleDelete} disabled={deleting} className={btnRed} title="Delete">
                  {deleting ? '…' : 'Del'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {showLightbox && (
          <Lightbox
            src={imgSrc}
            alt={note.originalName ?? note.title}
            onClose={() => setShowLightbox(false)}
          />
        )}
        {showShare && (
          <ShareModal
            note={note}
            onClose={() => setShowShare(false)}
            onCreated={(_: Share) => setShowShare(false)}
          />
        )}
      </>
    );
  }

  // file type
  const icon = fileIcon(note.mimeType, note.originalName ?? note.filename);
  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 break-inside-avoid mb-4 hover:border-gray-700 transition-colors">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-gray-200 text-sm font-medium truncate">
              {note.originalName ?? note.filename ?? note.title ?? 'Unnamed file'}
            </p>
            {note.fileSize !== undefined && (
              <p className="text-xs text-gray-600 mt-0.5">{fmtSize(note.fileSize)}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
          <span className="text-xs text-gray-600">{relTime(note.updatedAt)}</span>
          <div className="flex gap-1">
            <a
              href={`/api/files/download/${note._id}`}
              className={`${btnGray} no-underline`}
              title="Download"
            >
              Download
            </a>
            <button
              onClick={e => { e.stopPropagation(); setShowShare(true); }}
              className={btnGray}
              title="Share"
            >
              Share
            </button>
            <button onClick={handleDelete} disabled={deleting} className={btnRed} title="Delete">
              {deleting ? '…' : 'Del'}
            </button>
          </div>
        </div>
      </div>

      {showShare && (
        <ShareModal
          note={note}
          onClose={() => setShowShare(false)}
          onCreated={(_: Share) => setShowShare(false)}
        />
      )}
    </>
  );
}
