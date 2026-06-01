import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Note } from '../types';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../hooks/useSocket';
import { NoteCard } from '../components/NoteCard';
import { SharesManager } from '../components/SharesManager';

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickNote, setQuickNote] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showShares, setShowShares] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const onNoteCreated = useCallback((note: Note) => {
    setNotes(prev => {
      if (prev.some(n => String(n._id) === String(note._id))) return prev;
      return sortNotes([note, ...prev]);
    });
  }, []);
  const onNoteUpdated = useCallback((note: Note) => {
    setNotes(prev => sortNotes(prev.map(n => String(n._id) === String(note._id) ? note : n)));
  }, []);
  const onNoteDeleted = useCallback(({ id }: { id: string }) => {
    setNotes(prev => prev.filter(n => String(n._id) !== String(id)));
  }, []);

  const { online } = useSocket({ onNoteCreated, onNoteUpdated, onNoteDeleted });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    api.verify()
      .then(() => api.getNotes())
      .then(data => setNotes(sortNotes(data)))
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  const [submitting, setSubmitting] = useState(false);

  const handleQuickNoteSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = quickNote.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    try {
      await api.createNote({ content: text, title: '', type: 'text' });
      setQuickNote('');
      showToast('Note created');
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickNoteKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleQuickNoteSubmit();
    }
  };

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      await api.uploadFile(file);
      showToast(`Uploaded: ${file.name}`);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  }, [showToast]);

  // Global paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept paste inside text inputs or textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.clipboardData?.files.length) {
        const file = e.clipboardData.files[0];
        await uploadFile(file);
        return;
      }

      const text = e.clipboardData?.getData('text/plain');
      if (text?.trim()) {
        try {
          await api.createNote({ content: text, title: '', type: 'text' });
          showToast('Note created from paste');
        } catch (err) {
          showToast((err as Error).message, 'error');
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [uploadFile, showToast]);

  // Drag-and-drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setDragging(true);
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await uploadFile(file);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0f1117] text-gray-200"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-blue-900/40 border-2 border-blue-500 border-dashed flex items-center justify-center pointer-events-none">
          <div className="text-blue-300 text-2xl font-semibold">Drop files to upload</div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0f1117]/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-gray-100 font-bold text-lg mr-auto">drop</h1>

          {/* Sync LED */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                online ? 'bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]' : 'bg-gray-600'
              }`}
            />
            {online ? 'Live' : 'Offline'}
          </div>

          {uploading && (
            <span className="text-xs text-blue-400 animate-pulse">Uploading…</span>
          )}

          <button
            onClick={() => setShowShares(true)}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors border border-gray-800"
          >
            Links
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors border border-gray-800"
          >
            Upload
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:text-red-400 hover:bg-red-900/20 transition-colors border border-gray-800"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={async e => {
          const files = Array.from(e.target.files ?? []);
          for (const f of files) await uploadFile(f);
          e.target.value = '';
        }}
      />

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Quick note */}
        <form onSubmit={handleQuickNoteSubmit} className="mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 focus-within:border-gray-600 transition-colors">
            <textarea
              value={quickNote}
              onChange={e => setQuickNote(e.target.value)}
              onKeyDown={handleQuickNoteKey}
              placeholder="Quick note… (Ctrl+Enter to save)"
              rows={3}
              className="w-full bg-transparent text-gray-200 text-sm placeholder-gray-600 outline-none resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!quickNote.trim() || submitting}
                className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding…' : 'Add Note'}
              </button>
            </div>
          </div>
        </form>

        {/* Notes grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-600">
            Loading…
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-600 gap-3">
            <div className="text-5xl">✦</div>
            <p className="text-sm">No notes yet. Paste text, drag files, or type above.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {notes.map(note => (
              <NoteCard
                key={note._id}
                note={note}
                onUpdated={onNoteUpdated}
                onDeleted={id => onNoteDeleted({ id })}
              />
            ))}
          </div>
        )}
      </main>

      {showShares && <SharesManager onClose={() => setShowShares(false)} />}
    </div>
  );
}
