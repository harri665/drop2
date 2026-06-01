import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Note } from '../types';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

type ViewMode = 'edit' | 'split' | 'preview';

interface MarkdownEditorProps {
  note: Note;
  onClose: () => void;
  onSaved: (note: Note) => void;
}

interface ToolbarAction {
  label: string;
  title: string;
  wrap?: [string, string];
  prefix?: string;
  block?: boolean;
  placeholder?: string;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'H1', title: 'Heading 1', prefix: '# ', block: true },
  { label: 'H2', title: 'Heading 2', prefix: '## ', block: true },
  { label: 'H3', title: 'Heading 3', prefix: '### ', block: true },
  { label: 'B', title: 'Bold (Ctrl+B)', wrap: ['**', '**'], placeholder: 'bold text' },
  { label: 'I', title: 'Italic (Ctrl+I)', wrap: ['_', '_'], placeholder: 'italic text' },
  { label: '`', title: 'Inline Code', wrap: ['`', '`'], placeholder: 'code' },
  { label: '```', title: 'Code Block', wrap: ['```\n', '\n```'], placeholder: 'code block', block: false },
  { label: '🔗', title: 'Link (Ctrl+K)', wrap: ['[', '](url)'], placeholder: 'link text' },
  { label: '•', title: 'Bullet List', prefix: '- ', block: true },
  { label: '1.', title: 'Numbered List', prefix: '1. ', block: true },
  { label: '❝', title: 'Blockquote', prefix: '> ', block: true },
  { label: '—', title: 'Horizontal Rule', prefix: '\n---\n', block: true },
];

function insertFormatting(
  textarea: HTMLTextAreaElement,
  action: ToolbarAction,
  setValue: (v: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);

  let newValue: string;
  let cursorStart: number;
  let cursorEnd: number;

  if (action.prefix && action.block) {
    // Find start of current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const before = value.slice(0, lineStart);
    const after = value.slice(lineStart);
    newValue = before + action.prefix + after;
    cursorStart = lineStart + action.prefix.length + (start - lineStart);
    cursorEnd = cursorStart + (end - start);
  } else if (action.prefix) {
    // Non-block prefix (like HR)
    newValue = value.slice(0, start) + action.prefix + value.slice(end);
    cursorStart = start + action.prefix.length;
    cursorEnd = cursorStart;
  } else if (action.wrap) {
    const [before, after] = action.wrap;
    if (selected) {
      newValue = value.slice(0, start) + before + selected + after + value.slice(end);
      cursorStart = start + before.length;
      cursorEnd = cursorStart + selected.length;
    } else {
      const placeholder = action.placeholder ?? 'text';
      newValue = value.slice(0, start) + before + placeholder + after + value.slice(end);
      cursorStart = start + before.length;
      cursorEnd = cursorStart + placeholder.length;
    }
  } else {
    return;
  }

  setValue(newValue);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorStart, cursorEnd);
  });
}

export function MarkdownEditor({ note, onClose, onSaved }: MarkdownEditorProps) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');
  const [mode, setMode] = useState<ViewMode>('edit');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const { showToast } = useToast();

  const doSave = useCallback(async (t: string, c: string) => {
    setSaving(true);
    try {
      const updated = await api.updateNote(note._id, { title: t, content: c });
      onSaved(updated);
      dirtyRef.current = false;
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }, [note._id, onSaved, showToast]);

  // Auto-save 1 second after typing stops
  useEffect(() => {
    if (!dirtyRef.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      doSave(title, content);
    }, 1000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [title, content, doSave]);

  const handleTitleChange = (v: string) => {
    dirtyRef.current = true;
    setTitle(v);
  };
  const handleContentChange = (v: string) => {
    dirtyRef.current = true;
    setContent(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        insertFormatting(ta, { label: 'B', title: 'Bold', wrap: ['**', '**'], placeholder: 'bold text' }, handleContentChange);
        return;
      }
      if (e.key === 'i') {
        e.preventDefault();
        insertFormatting(ta, { label: 'I', title: 'Italic', wrap: ['_', '_'], placeholder: 'italic text' }, handleContentChange);
        return;
      }
      if (e.key === 'k') {
        e.preventDefault();
        insertFormatting(ta, { label: '🔗', title: 'Link', wrap: ['[', '](url)'], placeholder: 'link text' }, handleContentChange);
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.slice(0, start) + '  ' + content.slice(end);
      handleContentChange(newContent);
      requestAnimationFrame(() => {
        ta.setSelectionRange(start + 2, start + 2);
      });
    }
  };

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    await doSave(title, content);
    onClose();
  };

  const handleClose = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl flex flex-col shadow-2xl"
        style={{ width: '90vw', height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 flex-shrink-0">
          <input
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="flex-1 bg-transparent text-gray-100 text-lg font-semibold outline-none placeholder-gray-600"
          />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {saving && <span className="animate-pulse">Saving…</span>}
          </div>
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {(['edit', 'split', 'preview'] as ViewMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${
                  mode === m
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        {mode !== 'preview' && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800 flex-shrink-0 flex-wrap">
            {TOOLBAR_ACTIONS.map(action => (
              <button
                key={action.title}
                title={action.title}
                onClick={() => {
                  if (textareaRef.current) {
                    insertFormatting(textareaRef.current, action, handleContentChange);
                  }
                }}
                className="px-2 py-1 text-xs font-mono rounded hover:bg-gray-700 text-gray-300 hover:text-gray-100 transition-colors border border-transparent hover:border-gray-600"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {mode === 'edit' && (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write markdown here…"
              className="flex-1 bg-transparent text-gray-200 p-4 resize-none outline-none font-mono text-sm leading-relaxed placeholder-gray-600"
              spellCheck={false}
            />
          )}

          {mode === 'split' && (
            <>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => handleContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write markdown here…"
                className="flex-1 bg-transparent text-gray-200 p-4 resize-none outline-none font-mono text-sm leading-relaxed placeholder-gray-600 border-r border-gray-700"
                spellCheck={false}
              />
              <div className="flex-1 overflow-y-auto p-4">
                <article className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*Nothing to preview*'}</ReactMarkdown>
                </article>
              </div>
            </>
          )}

          {mode === 'preview' && (
            <div className="flex-1 overflow-y-auto p-6">
              <article className="prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '*Nothing to preview*'}</ReactMarkdown>
              </article>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
