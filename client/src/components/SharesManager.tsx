import { useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import type { Share, Note } from '../types';
import { relTime } from '../utils';

interface SharesManagerProps {
  onClose: () => void;
}

export function SharesManager({ onClose }: SharesManagerProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    api.getShares()
      .then(setShares)
      .catch(e => showToast((e as Error).message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleRevoke = async (share: Share) => {
    try {
      await api.deleteShare(share._id);
      setShares(prev => prev.filter(s => s._id !== share._id));
      showToast('Share revoked');
    } catch (e) {
      showToast((e as Error).message, 'error');
    }
  };

  const getNoteTitle = (share: Share): string => {
    if (typeof share.noteId === 'object' && share.noteId !== null) {
      return (share.noteId as Note).title || 'Untitled';
    }
    return 'Untitled';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-gray-100 font-semibold text-lg">Shared Links</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              Loading…
            </div>
          ) : shares.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              No shared links yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {shares.map(share => (
                <li key={share._id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-200 text-sm font-medium truncate">
                      {getNoteTitle(share)}
                    </div>
                    <a
                      href={`/s/${share.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 text-xs hover:underline font-mono"
                    >
                      /s/{share.slug}
                    </a>
                    <div className="text-gray-600 text-xs mt-0.5">
                      Created {relTime(share.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(share)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 hover:text-red-300 border border-red-800/50 transition-colors"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
