import { useEffect, useState } from 'react';
import { api } from '../api';
import { randomSlug } from '../utils';
import { useToast } from '../context/ToastContext';
import type { Note, Share } from '../types';

interface ShareModalProps {
  note: Note;
  onClose: () => void;
  onCreated: (share: Share) => void;
}

export function ShareModal({ note, onClose, onCreated }: ShareModalProps) {
  const [slug, setSlug] = useState(() => randomSlug());
  const [creating, setCreating] = useState(false);
  const [createdShare, setCreatedShare] = useState<Share | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCreate = async () => {
    if (!slug.trim()) {
      showToast('Slug cannot be empty', 'error');
      return;
    }
    setCreating(true);
    try {
      const share = await api.createShare({ noteId: note._id, slug: slug.trim() });
      setCreatedShare(share);
      onCreated(share);
      showToast('Share link created!');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const shareUrl = createdShare
    ? `${window.location.origin}/s/${createdShare.slug}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(
      () => showToast('Link copied!'),
      () => showToast('Failed to copy', 'error')
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-gray-100 font-semibold text-lg mb-4">Share Note</h2>

        {!createdShare ? (
          <>
            <p className="text-gray-400 text-sm mb-4">
              Create a public share link for this note. Anyone with the link can view it.
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1.5">Slug</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm outline-none focus:border-blue-500 transition-colors font-mono"
                  placeholder="my-custom-slug"
                />
                <button
                  onClick={() => setSlug(randomSlug())}
                  title="Generate random slug"
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors text-sm"
                >
                  ↺
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                URL: {window.location.origin}/s/{slug || '…'}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">Share link created successfully!</p>
            <div className="flex gap-2 mb-4">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-blue-400 text-sm outline-none font-mono"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm transition-colors"
              >
                Copy
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
