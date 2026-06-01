import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../api';
import { fmtSize, fileIcon } from '../utils';
import type { Note, Share } from '../types';

interface ShareData {
  share: Share;
  note: Note;
}

export function SharePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.getPublicShare(slug)
      .then(setData)
      .catch(e => setError((e as Error).message || 'Not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data?.note.title || 'Shared note',
        url: window.location.href,
      }).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">404</div>
          <p className="text-gray-500 text-sm">{error || 'Share not found'}</p>
          <a href="/" className="mt-4 inline-block text-blue-400 text-sm hover:underline">← Go home</a>
        </div>
      </div>
    );
  }

  const { note } = data;

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-200">
      <header className="border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-gray-400 hover:text-gray-200 text-sm transition-colors">
            drop
          </a>
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            {typeof navigator.share === 'function' && (
              <button
                onClick={handleNativeShare}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
              >
                Share
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {note.type === 'text' && (
          <div>
            {note.title && (
              <h1 className="text-2xl font-bold text-gray-100 mb-6">{note.title}</h1>
            )}
            <article className="prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
            </article>
          </div>
        )}

        {note.type === 'image' && (
          <div className="flex flex-col items-center gap-6">
            {note.title && (
              <h1 className="text-xl font-semibold text-gray-100 self-start">{note.title}</h1>
            )}
            <img
              src={`/api/files/view/${note._id}`}
              alt={note.originalName ?? note.title ?? 'Shared image'}
              className="max-w-full rounded-xl shadow-2xl"
            />
            <div className="flex gap-3">
              <a
                href={`/api/files/download/${note._id}`}
                className="px-5 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors no-underline"
              >
                Download
              </a>
              {typeof navigator.share === 'function' && (
                <button
                  onClick={handleNativeShare}
                  className="px-5 py-2 rounded-lg text-sm border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors"
                >
                  Share
                </button>
              )}
            </div>
          </div>
        )}

        {note.type === 'file' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-5 text-center">
            <div className="text-5xl">{fileIcon(note.mimeType, note.originalName ?? note.filename)}</div>
            <div>
              <p className="text-gray-100 font-semibold text-lg">
                {note.originalName ?? note.filename ?? note.title ?? 'File'}
              </p>
              {note.fileSize !== undefined && (
                <p className="text-gray-500 text-sm mt-1">{fmtSize(note.fileSize)}</p>
              )}
            </div>
            <a
              href={`/api/files/download/${note._id}`}
              className="px-6 py-2.5 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors no-underline font-medium"
            >
              Download file
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
